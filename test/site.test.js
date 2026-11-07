import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
import { filterRecipes, sortRecipes } from "../assets/js/lib/filter.js";
import { summarizeRatings } from "../assets/js/lib/ratings.js";
import { uniqueSlug } from "../assets/js/lib/slug.js";
import { checkRateLimit } from "../assets/js/lib/ratelimit.js";
import { escapeHtml } from "../assets/js/lib/escape.js";
import { validateComment, validateRecipe, safeNextPath } from "../assets/js/lib/validate.js";
import { callToAction, priceLabel, pricesTreatedAsFinal } from "../assets/js/lib/shop.js";
import { createDemoAdapter } from "../assets/js/demo-adapter.js";
import { isSupabaseConfigured } from "../assets/js/adapter.js";
import { SEED } from "../assets/js/seed.js";
import { consentBannerOn, slotsShouldRender, stepInsertIndex, withGridSlots } from "../assets/js/lib/ads.js";
import { affiliateRel, disclosureLine, linksForRecipe } from "../assets/js/lib/affiliate.js";

const root = path.resolve(import.meta.dirname, "..");

function memoryStorage() {
  let raw = null;
  return {
    load() {
      return raw ? JSON.parse(raw) : null;
    },
    save(next) {
      raw = JSON.stringify(next);
    }
  };
}

function adapter(email = "") {
  const storage = memoryStorage();
  const demo = createDemoAdapter(
    { OWNER_EMAIL: email, SUPABASE_URL: "", SUPABASE_ANON_KEY: "" },
    { storage }
  );
  demo.storage = storage;
  return demo;
}

const human = { honeypot: "", openedAt: Date.now() - 5000 };

test("sample shelf has 10 labeled recipes and no personal testimonials", () => {
  assert.equal(SEED.length, 10);
  const categories = new Set(SEED.map((recipe) => recipe.category));
  for (const category of ["Breakfast", "Mains", "Sides", "Soups", "Breads", "Desserts", "Holidays"]) {
    assert.equal(categories.has(category), true);
  }
  for (const recipe of SEED) {
    assert.equal(recipe.sample, true);
    assert.equal(recipe.photoIsIllustration, true);
    assert.match(recipe.photoCredit, /Illustration/);
    assert.equal(/testimonial|grandmother [A-Z][a-z]+|my grandma/i.test(recipe.story), false);
  }
});

test("search, category, and rating filters", () => {
  const recipes = [
    { title: "Pie", category: "Desserts", story: "", ingredients: ["apple"], steps: [], ratingAvg: 4.5, ratingCount: 2 },
    { title: "Soup", category: "Soups", story: "pepper", ingredients: [], steps: [], ratingAvg: 0, ratingCount: 0 }
  ];
  assert.equal(filterRecipes(recipes, { query: "apple" }).length, 1);
  assert.equal(filterRecipes(recipes, { category: "Soups" })[0].title, "Soup");
  assert.equal(filterRecipes(recipes, { minRating: 4 }).length, 1);
  assert.equal(filterRecipes(recipes, { minRating: 4, query: "pepper" }).length, 0);
});

test("user recipes sort ahead of samples", () => {
  const sorted = sortRecipes([
    { title: "Sample", sample: true, order: 1, createdAt: "2019-01-01" },
    { title: "Mine", sample: false, createdAt: "2026-01-01" }
  ]);
  assert.equal(sorted[0].title, "Mine");
});

test("one set of stars is averaged once", () => {
  assert.deepEqual(summarizeRatings([5, 4]), { ratingAvg: 4.5, ratingCount: 2 });
  assert.deepEqual(summarizeRatings([]), { ratingAvg: 0, ratingCount: 0 });
});

test("slugs stay unique and html is escaped", () => {
  assert.equal(uniqueSlug("Apple Pie!", new Set(["apple-pie"])), "apple-pie-2");
  assert.equal(escapeHtml(`<script>"&'</script>`), "&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;");
});

test("validation and rate limit", () => {
  const bad = validateRecipe({ title: "Pi", category: "Mains", prepMinutes: 0, cookMinutes: 0, servings: 1, ingredients: ["x"], steps: ["y"] });
  assert.equal(bad.ok, false);
  const good = validateRecipe({
    title: "Tomato toast",
    category: "Breakfast",
    prepMinutes: 5,
    cookMinutes: 0,
    servings: 1,
    ingredients: ["bread"],
    steps: ["Toast it."]
  });
  assert.equal(good.ok, true);
  assert.equal(validateComment("http://spam.test").ok, false);
  const limited = checkRateLimit([Date.now(), Date.now(), Date.now()], { limit: 3, windowMs: 1000 });
  assert.equal(limited.ok, false);
});

test("next links stay on this site", () => {
  assert.equal(safeNextPath("https://evil.test", "/granny-recipes/"), "/granny-recipes/index.html");
  assert.equal(safeNextPath("//evil.test", "/granny-recipes/"), "/granny-recipes/index.html");
  assert.equal(safeNextPath("post.html", "/granny-recipes/"), "/granny-recipes/post.html");
});

test("shop slots are notify links until Stripe is filled in", () => {
  const config = { openingSoon: true, pricesAreFinal: true, notifyEmail: "cook@example.com", products: [] };
  assert.equal(pricesTreatedAsFinal(config), false);
  const product = { name: "Recipe card packs" };
  const empty = callToAction(config, product, { name: "Pack of 25", stripePaymentLink: "" });
  assert.equal(empty.type, "notify");
  assert.equal(empty.label, "Coming soon / Notify me");
  assert.match(empty.href, /^mailto:cook@example.com\?/);
  const bad = callToAction(config, product, { stripePaymentLink: "javascript:alert(1)" });
  assert.equal(bad.type, "notify");
  const ready = callToAction(config, product, { stripePaymentLink: "https://buy.stripe.com/test_abc" });
  assert.equal(ready.type, "checkout");
  assert.match(priceLabel("12", config), /not final/);
});

test("committed shop config has empty payment links and opening soon", () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/shop-config.js"), "utf8"), context);
  const shop = context.window.GRANNY_SHOP_CONFIG;
  assert.equal(shop.openingSoon, true);
  assert.equal(shop.pricesAreFinal, false);
  const ids = shop.products.map((product) => product.id);
  assert.equal(JSON.stringify(ids), JSON.stringify(["recipe-cards", "recipe-card-box", "gift-set", "cookbook"]));
  const formats = shop.products.flatMap((product) => product.formats);
  assert.equal(formats.every((format) => format.stripePaymentLink === ""), true);
  const pdf = shop.products.find((product) => product.id === "cookbook").formats.find((format) => format.id === "pdf");
  assert.equal(pdf.delivery, "download");
  assert.equal(pdf.downloadUrl, "");
  assert.match(pdf.thankYouPath, /thank-you\.html\?product=cookbook&format=pdf/);
  assert.match(priceLabel(formats[0].pricePlaceholder, shop), /Placeholder price/);
});

test("supabase stays off until both slots are filled", () => {
  assert.equal(isSupabaseConfigured({ SUPABASE_URL: "", SUPABASE_ANON_KEY: "" }), false);
  assert.equal(isSupabaseConfigured({ SUPABASE_URL: "http://example.supabase.co", SUPABASE_ANON_KEY: "x".repeat(30) }), false);
  assert.equal(isSupabaseConfigured({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "short" }), false);
  assert.equal(isSupabaseConfigured({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "a".repeat(20) }), true);
});

test("demo accounts can post, heart, rate once, comment, report, and moderate", async () => {
  const owner = adapter("owner@example.com");
  await owner.signUp({ email: "owner@example.com", password: "long-password", displayName: "Owner" }, human);
  const created = await owner.createRecipe({
    title: "Pepper toast",
    story: "A <script>alert(1)</script> snack",
    category: "Breakfast",
    prepMinutes: 5,
    cookMinutes: 2,
    servings: 1,
    ingredients: ["bread", "pepper"],
    steps: ["Toast the bread."]
  }, human);
  assert.match(created.slug, /pepper-toast/);
  assert.match(created.story, /<script>/);

  let rated = await owner.setRating(created.slug, 5);
  rated = await owner.setRating(created.slug, 3);
  assert.equal(rated.count, 1);
  assert.equal(rated.userRating, 3);
  assert.equal(rated.average, 3);

  let heart = await owner.toggleHeart(created.slug);
  assert.equal(heart.hearted, true);
  assert.equal(heart.count, 1);
  heart = await owner.toggleHeart(created.slug);
  assert.equal(heart.count, 0);

  await owner.addComment(created.slug, "Crisp edges.", human);
  await assert.rejects(() => owner.addComment(created.slug, "Crisp edges.", human));
  await owner.report({ targetType: "recipe", targetId: created.slug, recipeSlug: created.slug, reason: "Spam", note: "" }, human);

  const guest = createDemoAdapter(
    { OWNER_EMAIL: "owner@example.com", SUPABASE_URL: "", SUPABASE_ANON_KEY: "" },
    { storage: owner.storage }
  );
  await owner.signOut();
  await guest.signUp({ email: "guest@example.com", password: "another-password" }, human);
  await assert.rejects(() => guest.setRecipeHidden(created.slug, true));
  assert.equal((await guest.listRecipes()).some((recipe) => recipe.slug === created.slug), true);
  await guest.signOut();
  await owner.signIn({ email: "owner@example.com", password: "long-password" }, human);
  const session = await owner.getSession();
  assert.equal(session.isOwner, true);
  await owner.setRecipeHidden(created.slug, true);
  await owner.signOut();
  await guest.signIn({ email: "guest@example.com", password: "another-password" }, human);
  assert.equal((await guest.listRecipes()).some((recipe) => recipe.slug === created.slug), false);
  const reports = await owner.listReports().catch((error) => error);
  assert.equal(reports instanceof Error, true);
});

test("fast submits and honeypots are refused", async () => {
  const demo = adapter();
  await assert.rejects(() => demo.signUp({ email: "a@example.com", password: "long-password" }, { openedAt: Date.now(), honeypot: "" }));
  await assert.rejects(() => demo.signUp({ email: "a@example.com", password: "long-password" }, { openedAt: Date.now() - 5000, honeypot: "http://spam.test" }));
});

test("built pages include seo, print hooks, shop, and demo copy", () => {
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const recipe = fs.readFileSync(path.join(root, "recipes/deep-dish-apple-pie/index.html"), "utf8");
  const shop = fs.readFileSync(path.join(root, "shop/index.html"), "utf8");
  const book = fs.readFileSync(path.join(root, "shop/cookbook/index.html"), "utf8");
  const thanks = fs.readFileSync(path.join(root, "shop/thank-you.html"), "utf8");
  assert.match(home, /Granny's Kitchen Shop/);
  assert.match(home, /Opening soon/);
  assert.match(home, /Sample recipe/);
  assert.match(home, /<base href="\/granny-recipes\/">/);
  assert.match(recipe, /"@type":"Recipe"/);
  assert.match(recipe, /Sample recipe/);
  assert.match(recipe, /Print preview|id="recipe-actions"/);
  assert.match(shop, /Opening soon/);
  assert.match(book, /data-product="cookbook"/);
  assert.match(thanks, /data-page="thanks"/);
  assert.match(fs.readFileSync(path.join(root, "assets/js/chrome.js"), "utf8"), /Demo mode: your posts are saved only in this browser\./);
  assert.equal(fs.existsSync(path.join(root, ".nojekyll")), true);
  assert.match(fs.readFileSync(path.join(root, "sitemap.xml"), "utf8"), /recipes\/flaky-buttermilk-biscuits\//);
  assert.match(fs.readFileSync(path.join(root, "robots.txt"), "utf8"), /sitemap\.xml/);
  for (const file of ["about.html", "privacy.html", "terms.html", "guidelines.html", "disclosure.html", "404.html", "post.html", "login.html"]) {
    assert.equal(fs.existsSync(path.join(root, file)), true);
  }
  const privacy = fs.readFileSync(path.join(root, "privacy.html"), "utf8");
  assert.match(privacy, /Advertising cookies/);
  assert.match(privacy, /Affiliates/);
  assert.match(home, /disclosure\.html/);
  assert.match(fs.readFileSync(path.join(root, "disclosure.html"), "utf8"), /Affiliate &amp; Advertising Disclosure|Affiliate & Advertising Disclosure/);
  const adsTxt = fs.readFileSync(path.join(root, "ads.txt"), "utf8");
  assert.match(adsTxt, /^#/m);
  assert.equal(/^\s*google\.com,/m.test(adsTxt), false);
});

test("ad slots stay empty until a provider is on, and skip print, login, posting, and checkout", () => {
  const off = { provider: "none" };
  assert.equal(slotsShouldRender(off, { pageName: "home" }), false);
  assert.equal(slotsShouldRender(off, { pageName: "recipe", search: "?adsDebug=1" }), true);
  assert.equal(slotsShouldRender(off, { pageName: "recipe", search: "?adsDebug=1", printing: true }), false);
  for (const pageName of ["post", "auth", "thanks", "shop"]) {
    assert.equal(slotsShouldRender(off, { pageName, search: "?adsDebug=1" }), false);
  }
  assert.equal(consentBannerOn(off), false);
  assert.equal(consentBannerOn({ provider: "adsense" }), true);
  assert.equal(stepInsertIndex(5, 6), -1);
  assert.equal(stepInsertIndex(7, 6), 3);
  const grid = withGridSlots([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 6);
  assert.equal(grid.filter((entry) => entry.kind === "ad").length, 1);
  assert.equal(grid[6].kind, "ad");
});

test("affiliate links are sponsored and disclosed only when a recipe uses them", () => {
  assert.equal(affiliateRel(), "sponsored nofollow");
  const config = {
    affiliates: {
      enabled: true,
      disclosure: "Affiliate disclosure.",
      links: [{ href: "https://example.com/pan", label: "Pan", recipes: ["cast-iron-peach-cobbler"] }]
    }
  };
  const used = linksForRecipe({ slug: "cast-iron-peach-cobbler" }, config);
  assert.equal(used[0].rel, "sponsored nofollow");
  assert.equal(disclosureLine(config, used), "Affiliate disclosure.");
  assert.equal(linksForRecipe({ slug: "sunday-pot-roast" }, config).length, 0);
  assert.equal(disclosureLine(config, []), "");
  assert.equal(linksForRecipe({ slug: "cast-iron-peach-cobbler" }, { affiliates: { enabled: false, links: config.affiliates.links } }).length, 0);
});
