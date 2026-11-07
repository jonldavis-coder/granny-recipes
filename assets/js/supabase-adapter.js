import { SEED } from "./seed.js";
import { uniqueSlug } from "./lib/slug.js";
import { validateComment, validateDisplayName, validateEmail, validatePassword, validateRecipe, validateReport } from "./lib/validate.js";
import { assertHuman } from "./lib/human.js";
import { LIMITS, checkRateLimit } from "./lib/ratelimit.js";

function fail(message, code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function mapRecipe(row, extras) {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    story: row.story || "",
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    servings: row.servings,
    ingredients: row.ingredients || [],
    steps: row.steps || [],
    photo: row.photo_url || "",
    photoCredit: row.photo_credit || "",
    photoIsIllustration: Boolean(row.photo_is_illustration),
    sample: Boolean(row.sample),
    authorId: row.author_id,
    authorName: row.author_name || "",
    createdAt: row.created_at,
    hidden: Boolean(row.hidden),
    order: row.sort_order || 0,
    heartCount: extras.heartCount || 0,
    ratingAvg: extras.ratingAvg || 0,
    ratingCount: extras.ratingCount || 0,
    heartedByMe: extras.heartedByMe || false,
    myRating: extras.myRating ?? null
  };
}

export async function createSupabaseAdapter(config) {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm");
  const redirect = `${location.origin}${config.BASE_PATH || "/"}login.html`;
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  const limits = loadLimits();

  function loadLimits() {
    try {
      return JSON.parse(localStorage.getItem("granny-recipes-limits") || "{}");
    } catch {
      return {};
    }
  }

  function takeLimit(bucket) {
    const rule = LIMITS[bucket];
    const stamps = limits[bucket] || [];
    const result = checkRateLimit(stamps, rule);
    if (!result.ok) fail(result.message, "rate");
    limits[bucket] = [...result.recent, Date.now()];
    localStorage.setItem("granny-recipes-limits", JSON.stringify(limits));
  }

  async function sessionUser() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    const user = data.session?.user;
    if (!user) return null;
    const { data: owner } = await client.rpc("am_i_owner");
    const metaName = user.user_metadata?.display_name;
    return {
      id: user.id,
      email: user.email,
      displayName: metaName || String(user.email || "Cook").split("@")[0],
      isOwner: owner === true
    };
  }

  async function statsBundle() {
    const [{ data: stats, error: statsError }, { data: mine, error: mineError }] = await Promise.all([
      client.rpc("recipe_stats"),
      client.rpc("my_recipe_activity")
    ]);
    if (statsError) throw statsError;
    if (mineError) throw mineError;
    const bySlug = new Map();
    for (const row of stats || []) {
      bySlug.set(row.recipe_slug, {
        heartCount: row.heart_count || 0,
        ratingAvg: Number(row.rating_avg || 0),
        ratingCount: row.rating_count || 0
      });
    }
    const hearted = new Set(mine?.hearts || []);
    const ratings = new Map((mine?.ratings || []).map((item) => [item.slug, item.stars]));
    return { bySlug, hearted, ratings };
  }

  async function flagsBySlug() {
    const { data, error } = await client.from("recipe_flags").select("slug, hidden, deleted");
    if (error) throw error;
    return new Map((data || []).map((row) => [row.slug, row]));
  }

  function applyStats(recipe, bundle) {
    const stats = bundle.bySlug.get(recipe.slug) || {};
    return {
      ...recipe,
      heartCount: stats.heartCount || 0,
      ratingAvg: stats.ratingAvg || 0,
      ratingCount: stats.ratingCount || 0,
      heartedByMe: bundle.hearted.has(recipe.slug),
      myRating: bundle.ratings.has(recipe.slug) ? bundle.ratings.get(recipe.slug) : null
    };
  }

  async function listRecipes() {
    const [session, bundle, flags, recipeResult] = await Promise.all([
      sessionUser(),
      statsBundle(),
      flagsBySlug(),
      client.from("recipes").select("*").order("created_at", { ascending: false })
    ]);
    if (recipeResult.error) throw recipeResult.error;
    const remoteSlugs = new Set((recipeResult.data || []).map((row) => row.slug));
    const recipes = [];
    for (const row of recipeResult.data || []) {
      const flag = flags.get(row.slug);
      if (flag?.deleted) continue;
      recipes.push(applyStats(mapRecipe({ ...row, hidden: row.hidden || flag?.hidden }), bundle));
    }
    for (const sample of SEED) {
      if (remoteSlugs.has(sample.slug)) continue;
      const flag = flags.get(sample.slug);
      if (flag?.deleted) continue;
      const hidden = Boolean(flag?.hidden);
      if (hidden && !session?.isOwner) continue;
      recipes.push(applyStats({ ...sample, hidden }, bundle));
    }
    return recipes;
  }

  return {
    mode: "supabase",
    async getSession() {
      return sessionUser();
    },
    onAuthChange(listener) {
      const { data } = client.auth.onAuthStateChange(async () => {
        listener(await sessionUser());
      });
      return () => data.subscription.unsubscribe();
    },
    async signUp({ email, password, displayName }, meta) {
      assertHuman(meta);
      takeLimit("auth");
      const parsedEmail = validateEmail(email);
      if (!parsedEmail.ok) fail(parsedEmail.message, "validation");
      const parsedPassword = validatePassword(password);
      if (!parsedPassword.ok) fail(parsedPassword.message, "validation");
      const parsedName = validateDisplayName(displayName, parsedEmail.value);
      if (!parsedName.ok) fail(parsedName.message, "validation");
      const { data, error } = await client.auth.signUp({
        email: parsedEmail.value,
        password: parsedPassword.value,
        options: {
          data: { display_name: parsedName.value },
          emailRedirectTo: redirect
        }
      });
      if (error) throw error;
      if (!data.session) {
        return { pendingConfirmation: true, email: parsedEmail.value };
      }
      return sessionUser();
    },
    async signIn({ email, password }, meta) {
      assertHuman(meta);
      takeLimit("auth");
      const parsedEmail = validateEmail(email);
      if (!parsedEmail.ok) fail(parsedEmail.message, "validation");
      const parsedPassword = validatePassword(password);
      if (!parsedPassword.ok) fail(parsedPassword.message, "validation");
      const { error } = await client.auth.signInWithPassword({
        email: parsedEmail.value,
        password: parsedPassword.value
      });
      if (error) throw error;
      return sessionUser();
    },
    async requestMagicLink({ email }, meta) {
      assertHuman(meta);
      takeLimit("auth");
      const parsedEmail = validateEmail(email);
      if (!parsedEmail.ok) fail(parsedEmail.message, "validation");
      const { error } = await client.auth.signInWithOtp({
        email: parsedEmail.value,
        options: { emailRedirectTo: redirect }
      });
      if (error) throw error;
      return {
        demo: false,
        message: "Check your email for a sign-in link. It expires after a short time."
      };
    },
    async completeMagicLink() {
      return sessionUser();
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
    listRecipes,
    async getRecipe(slug) {
      const recipes = await listRecipes();
      return recipes.find((recipe) => recipe.slug === slug) || null;
    },
    async createRecipe(input, meta) {
      assertHuman(meta);
      const session = await sessionUser();
      if (!session) fail("Sign in to do that.", "auth");
      takeLimit("recipe");
      const parsed = validateRecipe(input);
      if (!parsed.ok) fail(parsed.message, "validation");
      const existing = await listRecipes();
      if (existing.some((recipe) => recipe.authorId === session.id && recipe.title.toLowerCase() === parsed.value.title.toLowerCase())) {
        fail("You already posted a recipe with that title.", "validation");
      }
      const slug = uniqueSlug(parsed.value.title, existing.map((recipe) => recipe.slug));
      let photoUrl = "";
      if (input.photoBlob) {
        photoUrl = await this.uploadPhoto(input.photoBlob, slug);
      }
      const { error } = await client.from("recipes").insert({
        slug,
        title: parsed.value.title,
        story: parsed.value.story,
        category: parsed.value.category,
        prep_minutes: parsed.value.prepMinutes,
        cook_minutes: parsed.value.cookMinutes,
        servings: parsed.value.servings,
        ingredients: parsed.value.ingredients,
        steps: parsed.value.steps,
        photo_url: photoUrl,
        photo_credit: photoUrl ? "Photo shared by the cook." : "",
        photo_is_illustration: false,
        sample: false
      });
      if (error) throw error;
      return this.getRecipe(slug);
    },
    async setRecipeHidden(slug, hidden) {
      const session = await sessionUser();
      if (!session?.isOwner) fail("Only the owner can hide a recipe.", "auth");
      const { data: row } = await client.from("recipes").select("slug, sample").eq("slug", slug).maybeSingle();
      if (row && !row.sample) {
        const { error } = await client.from("recipes").update({ hidden: Boolean(hidden) }).eq("slug", slug);
        if (error) throw error;
      }
      const { error } = await client.from("recipe_flags").upsert({
        slug,
        hidden: Boolean(hidden),
        deleted: false,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    },
    async deleteRecipe(slug) {
      const session = await sessionUser();
      if (!session) fail("Sign in to do that.", "auth");
      const recipe = await this.getRecipe(slug);
      if (!recipe) fail("That recipe was not found.", "validation");
      if (!session.isOwner && recipe.authorId !== session.id) fail("You can delete only your own recipes.", "auth");
      if (recipe.sample) {
        const { error } = await client.from("recipe_flags").upsert({
          slug,
          hidden: true,
          deleted: true,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
        return;
      }
      const { error } = await client.from("recipes").delete().eq("slug", slug);
      if (error) throw error;
    },
    async listComments(slug) {
      const session = await sessionUser();
      const { data, error } = await client
        .from("comments")
        .select("id, recipe_slug, body, author_id, author_name, hidden, created_at")
        .eq("recipe_slug", slug)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        recipeSlug: row.recipe_slug,
        body: row.body,
        authorId: row.author_id,
        authorName: row.author_name,
        hidden: row.hidden,
        createdAt: row.created_at,
        mine: session?.id === row.author_id
      }));
    },
    async addComment(slug, body, meta) {
      assertHuman(meta);
      const session = await sessionUser();
      if (!session) fail("Sign in to do that.", "auth");
      const recipe = await this.getRecipe(slug);
      if (!recipe) fail("That recipe was not found.", "validation");
      takeLimit("comment");
      const parsed = validateComment(body);
      if (!parsed.ok) fail(parsed.message, "validation");
      const { data, error } = await client
        .from("comments")
        .insert({ recipe_slug: slug, body: parsed.value })
        .select("id, recipe_slug, body, author_id, author_name, hidden, created_at")
        .single();
      if (error) throw error;
      return {
        id: data.id,
        recipeSlug: data.recipe_slug,
        body: data.body,
        authorId: data.author_id,
        authorName: data.author_name,
        hidden: data.hidden,
        createdAt: data.created_at,
        mine: true
      };
    },
    async setCommentHidden(id, hidden) {
      const session = await sessionUser();
      if (!session?.isOwner) fail("Only the owner can hide a comment.", "auth");
      const { error } = await client.from("comments").update({ hidden: Boolean(hidden) }).eq("id", id);
      if (error) throw error;
    },
    async deleteComment(id) {
      const session = await sessionUser();
      if (!session) fail("Sign in to do that.", "auth");
      const { error } = await client.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    async toggleHeart(slug) {
      const session = await sessionUser();
      if (!session) fail("Sign in to do that.", "auth");
      const recipe = await this.getRecipe(slug);
      if (!recipe) fail("That recipe was not found.", "validation");
      if (recipe.heartedByMe) {
        const { error } = await client.from("hearts").delete().eq("recipe_slug", slug).eq("user_id", session.id);
        if (error) throw error;
      } else {
        const { error } = await client.from("hearts").insert({ recipe_slug: slug, user_id: session.id });
        if (error) throw error;
      }
      const next = await this.getRecipe(slug);
      return { hearted: next.heartedByMe, count: next.heartCount };
    },
    async setRating(slug, stars) {
      const session = await sessionUser();
      if (!session) fail("Sign in to do that.", "auth");
      const recipe = await this.getRecipe(slug);
      if (!recipe) fail("That recipe was not found.", "validation");
      const value = Number(stars);
      if (!Number.isInteger(value) || value < 1 || value > 5) fail("Choose a rating from 1 to 5.", "validation");
      const { error } = await client.from("ratings").upsert(
        { recipe_slug: slug, user_id: session.id, stars: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id,recipe_slug" }
      );
      if (error) throw error;
      const next = await this.getRecipe(slug);
      return { average: next.ratingAvg, count: next.ratingCount, userRating: next.myRating };
    },
    async report(input, meta) {
      assertHuman(meta);
      const session = await sessionUser();
      if (!session) fail("Sign in to do that.", "auth");
      takeLimit("report");
      const parsed = validateReport(input);
      if (!parsed.ok) fail(parsed.message, "validation");
      const targetType = input.targetType === "comment" ? "comment" : "recipe";
      const targetId = String(input.targetId || "").trim();
      if (!targetId) fail("Missing report target.", "validation");
      const { data, error } = await client
        .from("reports")
        .insert({
          target_type: targetType,
          target_id: targetId,
          recipe_slug: String(input.recipeSlug || ""),
          reason: parsed.value.reason,
          note: parsed.value.note
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id };
    },
    async listReports() {
      const session = await sessionUser();
      if (!session?.isOwner) fail("Only the owner can read reports.", "auth");
      const { data, error } = await client.from("reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        reporterId: row.reporter_id,
        reporterName: row.reporter_name,
        targetType: row.target_type,
        targetId: row.target_id,
        recipeSlug: row.recipe_slug,
        reason: row.reason,
        note: row.note,
        createdAt: row.created_at
      }));
    },
    async uploadPhoto(file, slug = "photo") {
      const session = await sessionUser();
      if (!session) fail("Sign in to do that.", "auth");
      const blob = file instanceof Blob ? file : null;
      if (!blob) fail("Choose an image.", "validation");
      const path = `${session.id}/${slug}-${Date.now()}.jpg`;
      const { error } = await client.storage.from("recipe-photos").upload(path, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: false
      });
      if (error) throw error;
      const { data } = client.storage.from("recipe-photos").getPublicUrl(path);
      return data.publicUrl;
    }
  };
}
