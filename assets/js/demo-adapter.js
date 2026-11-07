import { SEED } from "./seed.js";
import { summarizeRatings } from "./lib/ratings.js";
import { uniqueSlug } from "./lib/slug.js";
import { LIMITS, checkRateLimit } from "./lib/ratelimit.js";
import { validateComment, validateDisplayName, validateEmail, validatePassword, validateRecipe, validateReport } from "./lib/validate.js";
import { assertHuman } from "./lib/human.js";

const KEY = "granny-recipes-demo-v1";

function emptyState() {
  return {
    users: [],
    sessionUserId: null,
    magicLinks: [],
    recipes: [],
    comments: [],
    hearts: [],
    ratings: [],
    reports: [],
    flags: {},
    limits: {}
  };
}

function defaultStorage() {
  return {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? { ...emptyState(), ...JSON.parse(raw) } : emptyState();
      } catch {
        return emptyState();
      }
    },
    save(state) {
      localStorage.setItem(KEY, JSON.stringify(state));
    }
  };
}

function fail(message, code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createDemoAdapter(config = {}, options = {}) {
  const storage = options.storage || defaultStorage();
  const now = options.now || (() => Date.now());
  const listeners = new Set();

  function read() {
    const loaded = storage.load();
    if (!loaded) return emptyState();
    return { ...emptyState(), ...loaded };
  }

  function write(state) {
    storage.save(state);
    return state;
  }

  function emit() {
    const session = currentSession(read());
    for (const listener of listeners) listener(session);
  }

  function currentSession(state) {
    const user = state.users.find((item) => item.id === state.sessionUserId);
    if (!user) return null;
    const ownerEmail = String(config.OWNER_EMAIL || "").trim().toLowerCase();
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isOwner: Boolean(ownerEmail) && user.email === ownerEmail
    };
  }

  function requireUser(state) {
    const session = currentSession(state);
    if (!session) fail("Sign in to do that.", "auth");
    return session;
  }

  function takeLimit(state, bucket) {
    const rule = LIMITS[bucket];
    const stamps = state.limits[bucket] || [];
    const result = checkRateLimit(stamps, { ...rule, now: now() });
    if (!result.ok) fail(result.message, "rate");
    state.limits[bucket] = [...result.recent, now()];
  }

  function flagFor(state, slug) {
    return state.flags[slug] || { hidden: false, deleted: false };
  }

  function canSee(recipe, session) {
    const hidden = Boolean(recipe.hidden);
    if (!hidden) return true;
    if (!session) return false;
    if (session.isOwner) return true;
    return recipe.authorId && recipe.authorId === session.id;
  }

  function decorate(state, recipe, session) {
    const hearts = state.hearts.filter((item) => item.slug === recipe.slug);
    const stars = state.ratings.filter((item) => item.slug === recipe.slug).map((item) => item.stars);
    const summary = summarizeRatings(stars);
    const mine = session ? state.ratings.find((item) => item.slug === recipe.slug && item.userId === session.id) : null;
    return {
      ...recipe,
      heartCount: hearts.length,
      ratingAvg: summary.ratingAvg,
      ratingCount: summary.ratingCount,
      heartedByMe: Boolean(session && hearts.some((item) => item.userId === session.id)),
      myRating: mine ? mine.stars : null
    };
  }

  function allRecipes(state) {
    const session = currentSession(state);
    const extras = state.recipes.map((recipe) => ({ ...recipe }));
    const bySlug = new Map();
    for (const recipe of SEED) {
      const flag = flagFor(state, recipe.slug);
      bySlug.set(recipe.slug, {
        ...recipe,
        hidden: Boolean(flag.hidden),
        deleted: Boolean(flag.deleted)
      });
    }
    for (const recipe of extras) {
      const flag = flagFor(state, recipe.slug);
      bySlug.set(recipe.slug, {
        ...recipe,
        hidden: Boolean(recipe.hidden || flag.hidden),
        deleted: Boolean(flag.deleted)
      });
    }
    return [...bySlug.values()]
      .filter((recipe) => !recipe.deleted && canSee(recipe, session))
      .map((recipe) => decorate(state, recipe, session));
  }

  return {
    mode: "demo",
    async getSession() {
      return currentSession(read());
    },
    onAuthChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async signUp({ email, password, displayName }, meta) {
      assertHuman(meta, now());
      const state = read();
      takeLimit(state, "auth");
      const parsedEmail = validateEmail(email);
      if (!parsedEmail.ok) fail(parsedEmail.message, "validation");
      const parsedPassword = validatePassword(password);
      if (!parsedPassword.ok) fail(parsedPassword.message, "validation");
      const parsedName = validateDisplayName(displayName, parsedEmail.value);
      if (!parsedName.ok) fail(parsedName.message, "validation");
      if (state.users.some((user) => user.email === parsedEmail.value)) {
        fail("An account with that email already exists. Sign in instead.", "auth");
      }
      const salt = randomId();
      const user = {
        id: randomId(),
        email: parsedEmail.value,
        displayName: parsedName.value,
        salt,
        passwordHash: await sha256(`${salt}:${parsedPassword.value}`),
        createdAt: new Date(now()).toISOString()
      };
      state.users.push(user);
      state.sessionUserId = user.id;
      write(state);
      emit();
      return currentSession(state);
    },
    async signIn({ email, password }, meta) {
      assertHuman(meta, now());
      const state = read();
      takeLimit(state, "auth");
      const parsedEmail = validateEmail(email);
      if (!parsedEmail.ok) fail(parsedEmail.message, "validation");
      const parsedPassword = validatePassword(password);
      if (!parsedPassword.ok) fail(parsedPassword.message, "validation");
      const user = state.users.find((item) => item.email === parsedEmail.value);
      const hash = user ? await sha256(`${user.salt}:${parsedPassword.value}`) : "";
      if (!user || hash !== user.passwordHash) fail("That email and password do not match.", "auth");
      state.sessionUserId = user.id;
      write(state);
      emit();
      return currentSession(state);
    },
    async requestMagicLink({ email }, meta) {
      assertHuman(meta, now());
      const state = read();
      takeLimit(state, "auth");
      const parsedEmail = validateEmail(email);
      if (!parsedEmail.ok) fail(parsedEmail.message, "validation");
      const user = state.users.find((item) => item.email === parsedEmail.value);
      if (!user) fail("No account uses that email yet. Create one first.", "auth");
      const token = randomId() + randomId();
      const tokenHash = await sha256(token);
      state.magicLinks = state.magicLinks.filter((item) => item.expiresAt > now());
      state.magicLinks.push({ tokenHash, userId: user.id, expiresAt: now() + 15 * 60 * 1000 });
      write(state);
      return {
        demo: true,
        token,
        message: "Demo mode has no email server. Use the one-time link on this page to finish signing in."
      };
    },
    async completeMagicLink(token) {
      const state = read();
      const tokenHash = await sha256(String(token || ""));
      const link = state.magicLinks.find((item) => item.tokenHash === tokenHash && item.expiresAt > now());
      if (!link) fail("That sign-in link is invalid or expired.", "auth");
      state.magicLinks = state.magicLinks.filter((item) => item !== link);
      state.sessionUserId = link.userId;
      write(state);
      emit();
      return currentSession(state);
    },
    async signOut() {
      const state = read();
      state.sessionUserId = null;
      write(state);
      emit();
    },
    async listRecipes() {
      return allRecipes(read());
    },
    async getRecipe(slug) {
      return allRecipes(read()).find((recipe) => recipe.slug === slug) || null;
    },
    async createRecipe(input, meta) {
      assertHuman(meta, now());
      const state = read();
      const session = requireUser(state);
      takeLimit(state, "recipe");
      const parsed = validateRecipe(input);
      if (!parsed.ok) fail(parsed.message, "validation");
      const duplicate = [...SEED, ...state.recipes].some(
        (recipe) => recipe.authorId === session.id && recipe.title.toLowerCase() === parsed.value.title.toLowerCase()
      );
      if (duplicate) fail("You already posted a recipe with that title.", "validation");
      const slug = uniqueSlug(parsed.value.title, new Set([...SEED, ...state.recipes].map((recipe) => recipe.slug)));
      let photo = "";
      if (input.photoDataUrl) {
        if (typeof input.photoDataUrl !== "string" || !input.photoDataUrl.startsWith("data:image/")) {
          fail("The photo must be an image.", "validation");
        }
        if (input.photoDataUrl.length > 450000) fail("That photo is too large to save in this browser. Try a smaller one.", "validation");
        photo = input.photoDataUrl;
      }
      const recipe = {
        slug,
        ...parsed.value,
        photo,
        photoCredit: photo ? "Photo shared by the cook." : "",
        photoIsIllustration: false,
        sample: false,
        authorId: session.id,
        authorName: session.displayName,
        createdAt: new Date(now()).toISOString(),
        hidden: false
      };
      state.recipes.push(recipe);
      write(state);
      return decorate(state, recipe, session);
    },
    async setRecipeHidden(slug, hidden) {
      const state = read();
      const session = requireUser(state);
      if (!session.isOwner) fail("Only the owner can hide a recipe.", "auth");
      const known = SEED.some((recipe) => recipe.slug === slug) || state.recipes.some((recipe) => recipe.slug === slug);
      if (!known) fail("That recipe was not found.", "validation");
      state.flags[slug] = { ...flagFor(state, slug), hidden: Boolean(hidden) };
      const stored = state.recipes.find((recipe) => recipe.slug === slug);
      if (stored) stored.hidden = Boolean(hidden);
      write(state);
    },
    async deleteRecipe(slug) {
      const state = read();
      const session = requireUser(state);
      const stored = state.recipes.find((recipe) => recipe.slug === slug);
      const sample = SEED.some((recipe) => recipe.slug === slug);
      const isAuthor = stored && stored.authorId === session.id;
      if (!session.isOwner && !isAuthor) fail("You can delete only your own recipes.", "auth");
      if (stored) state.recipes = state.recipes.filter((recipe) => recipe.slug !== slug);
      if (sample || !stored) {
        if (!sample) fail("That recipe was not found.", "validation");
        state.flags[slug] = { hidden: true, deleted: true };
      }
      state.comments = state.comments.filter((comment) => comment.recipeSlug !== slug);
      state.hearts = state.hearts.filter((item) => item.slug !== slug);
      state.ratings = state.ratings.filter((item) => item.slug !== slug);
      write(state);
    },
    async listComments(slug) {
      const state = read();
      const session = currentSession(state);
      return state.comments
        .filter((comment) => comment.recipeSlug === slug)
        .filter((comment) => !comment.hidden || session?.isOwner || comment.authorId === session?.id)
        .map((comment) => ({
          ...comment,
          mine: Boolean(session && comment.authorId === session.id)
        }));
    },
    async addComment(slug, body, meta) {
      assertHuman(meta, now());
      const state = read();
      const session = requireUser(state);
      const recipe = allRecipes(state).find((item) => item.slug === slug);
      if (!recipe) fail("That recipe was not found.", "validation");
      takeLimit(state, "comment");
      const parsed = validateComment(body);
      if (!parsed.ok) fail(parsed.message, "validation");
      const duplicate = state.comments.some(
        (comment) => comment.authorId === session.id && comment.recipeSlug === slug && comment.body === parsed.value
      );
      if (duplicate) fail("You already posted that comment here.", "validation");
      const comment = {
        id: randomId(),
        recipeSlug: slug,
        body: parsed.value,
        authorId: session.id,
        authorName: session.displayName,
        createdAt: new Date(now()).toISOString(),
        hidden: false
      };
      state.comments.push(comment);
      write(state);
      return { ...comment, mine: true };
    },
    async setCommentHidden(id, hidden) {
      const state = read();
      const session = requireUser(state);
      if (!session.isOwner) fail("Only the owner can hide a comment.", "auth");
      const comment = state.comments.find((item) => item.id === id);
      if (!comment) fail("That comment was not found.", "validation");
      comment.hidden = Boolean(hidden);
      write(state);
    },
    async deleteComment(id) {
      const state = read();
      const session = requireUser(state);
      const comment = state.comments.find((item) => item.id === id);
      if (!comment) fail("That comment was not found.", "validation");
      if (!session.isOwner && comment.authorId !== session.id) fail("You can delete only your own comments.", "auth");
      state.comments = state.comments.filter((item) => item.id !== id);
      write(state);
    },
    async toggleHeart(slug) {
      const state = read();
      const session = requireUser(state);
      const recipe = allRecipes(state).find((item) => item.slug === slug);
      if (!recipe) fail("That recipe was not found.", "validation");
      const existing = state.hearts.find((item) => item.slug === slug && item.userId === session.id);
      if (existing) state.hearts = state.hearts.filter((item) => item !== existing);
      else state.hearts.push({ slug, userId: session.id, createdAt: new Date(now()).toISOString() });
      write(state);
      const next = allRecipes(read()).find((item) => item.slug === slug);
      return { hearted: next.heartedByMe, count: next.heartCount };
    },
    async setRating(slug, stars) {
      const state = read();
      const session = requireUser(state);
      const recipe = allRecipes(state).find((item) => item.slug === slug);
      if (!recipe) fail("That recipe was not found.", "validation");
      const value = Number(stars);
      if (!Number.isInteger(value) || value < 1 || value > 5) fail("Choose a rating from 1 to 5.", "validation");
      const existing = state.ratings.find((item) => item.slug === slug && item.userId === session.id);
      if (existing) existing.stars = value;
      else state.ratings.push({ slug, userId: session.id, stars: value });
      write(state);
      const next = allRecipes(read()).find((item) => item.slug === slug);
      return { average: next.ratingAvg, count: next.ratingCount, userRating: next.myRating };
    },
    async report(input, meta) {
      assertHuman(meta, now());
      const state = read();
      const session = requireUser(state);
      takeLimit(state, "report");
      const parsed = validateReport(input);
      if (!parsed.ok) fail(parsed.message, "validation");
      const targetType = input.targetType === "comment" ? "comment" : "recipe";
      const targetId = String(input.targetId || "").trim();
      const recipeSlug = String(input.recipeSlug || "").trim();
      if (!targetId) fail("Missing report target.", "validation");
      const report = {
        id: randomId(),
        reporterId: session.id,
        reporterName: session.displayName,
        targetType,
        targetId,
        recipeSlug,
        reason: parsed.value.reason,
        note: parsed.value.note,
        createdAt: new Date(now()).toISOString()
      };
      state.reports.push(report);
      write(state);
      return { id: report.id };
    },
    async listReports() {
      const state = read();
      const session = requireUser(state);
      if (!session.isOwner) fail("Only the owner can read reports.", "auth");
      return [...state.reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async uploadPhoto(file) {
      const blob = file instanceof Blob ? file : null;
      if (!blob) fail("Choose an image.", "validation");
      const dataUrl = await blobToDataUrl(blob);
      if (!dataUrl.startsWith("data:image/")) fail("The photo must be an image.", "validation");
      if (dataUrl.length > 450000) fail("That photo is too large to save in this browser. Try a smaller one.", "validation");
      return dataUrl;
    }
  };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(blob);
  });
}
