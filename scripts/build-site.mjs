import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED } from "../assets/js/seed.js";
import { CATEGORIES } from "../assets/js/categories.js";
import { escapeHtml } from "../assets/js/lib/escape.js";
import { formatMinutes, isoDuration } from "../assets/js/lib/format.js";
import { favicon, illustrations } from "./art.mjs";
import { page } from "./layout.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://jonldavis-coder.github.io/granny-recipes";

function write(rel, contents) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function og(title, description, url) {
  return `<meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(url)}">`;
}

const cards = SEED.map((recipe) => `<article class="card">
        <a class="card-media" href="recipes/${recipe.slug}/">
          <img src="${recipe.photo}" alt="Illustration of ${escapeHtml(recipe.title)}" width="800" height="520">
          <span class="badge">Sample recipe</span>
        </a>
        <div class="card-body">
          <p class="eyebrow">${escapeHtml(recipe.category)}</p>
          <h2><a href="recipes/${recipe.slug}/">${escapeHtml(recipe.title)}</a></h2>
          <p class="meta">${formatMinutes(recipe.prepMinutes)} prep · ${formatMinutes(recipe.cookMinutes)} cook · Serves ${recipe.servings}</p>
          <p class="meta">No ratings yet · No favorites yet</p>
        </div>
      </article>`).join("\n");

const categoryButtons = ["All", ...CATEGORIES].map((category) => {
  const pressed = category === "All" ? "true" : "false";
  return `<button type="button" data-category="${escapeHtml(category)}" aria-pressed="${pressed}">${escapeHtml(category)}</button>`;
}).join("\n          ");

const homeDesc = "Browse and share favorite recipes from grandmother kitchens. Sample recipes, comments, hearts, and ratings. The shop is opening soon.";
write("index.html", page({
  title: "Granny Recipes — favorite recipes from grandmother kitchens",
  description: homeDesc,
  current: "home",
  pageName: "home",
  canonical: `${ORIGIN}/`,
  extraHead: og("Granny Recipes", homeDesc, `${ORIGIN}/`) + `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Granny Recipes",
    url: `${ORIGIN}/`,
    description: homeDesc,
    potentialAction: {
      "@type": "SearchAction",
      target: `${ORIGIN}/?q={query}`,
      "query-input": "required name=query"
    }
  })}</script>`,
  main: `<div class="wrap">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">A community cookbook</p>
        <h1>Recipes worth keeping</h1>
        <p class="lede">Write down the dishes you want to remember, and browse a shelf of classic, generic home recipes. Anyone can read. An account is only for posting, commenting, hearts, and stars.</p>
      </div>
      <img src="assets/images/hero.svg" alt="Illustration of a bowl, a pie, and a cup on a table" width="800" height="520">
    </section>
    <form class="filters panel" role="search" onsubmit="return false;">
      <label class="search-label" for="search">Search recipes</label>
      <input id="search" name="q" type="search" placeholder="Soup, apples, biscuits…" autocomplete="off">
      <p id="category-label">Category</p>
      <div id="category-filters" class="chip-row" role="group" aria-labelledby="category-label">
          ${categoryButtons}
      </div>
      <label for="rating-filter">Minimum rating</label>
      <select id="rating-filter">
        <option value="0">Any rating</option>
        <option value="3">3 stars and up</option>
        <option value="4">4 stars and up</option>
        <option value="5">5 stars</option>
      </select>
      <p class="hint">Unrated recipes are hidden while a minimum rating is selected.</p>
    </form>
    <p id="results-count" class="results-count" aria-live="polite">10 recipes</p>
    <div id="recipe-list" class="grid">
      ${cards}
    </div>
    <section class="shop-feature" aria-labelledby="shop-feature-title">
      <p class="status-pill">Opening soon</p>
      <h2 id="shop-feature-title">Granny's Kitchen Shop</h2>
      <p>Blank 4×6 recipe cards, a box to keep them in, a gift set, and The Granny Recipes Book — a 200-page spiral-bound cookbook as a PDF download or a mailed hardcopy.</p>
      <p class="note">Prices are not final, and nothing is for sale until checkout is turned on.</p>
      <div class="feature-grid">
        <a href="shop/recipe-cards/"><img src="assets/images/shop/recipe-cards.svg" alt="Illustration of recipe cards" width="800" height="520"><span><strong>Recipe card packs</strong><br>4×6 cards, packs of 25 and 50</span></a>
        <a href="shop/recipe-card-box/"><img src="assets/images/shop/recipe-card-box.svg" alt="Illustration of a recipe card box" width="800" height="520"><span><strong>Recipe card box</strong><br>A lidded box for 4×6 cards</span></a>
        <a href="shop/gift-set/"><img src="assets/images/shop/gift-set.svg" alt="Illustration of a gift set" width="800" height="520"><span><strong>Gift set</strong><br>The box plus a pack of cards</span></a>
        <a href="shop/cookbook/"><img src="assets/images/shop/cookbook.svg" alt="Illustration of a spiral-bound cookbook" width="800" height="520"><span><strong>The Granny Recipes Book</strong><br>200 pages, PDF or mailed hardcopy</span></a>
      </div>
      <p><a class="button" href="shop/">Visit the shop</a></p>
    </section>
  </div>`
}));

function recipeJson(recipe) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.story,
    image: `${ORIGIN}/${recipe.photo}`,
    recipeCategory: recipe.category,
    recipeYield: `${recipe.servings} servings`,
    prepTime: isoDuration(recipe.prepMinutes),
    cookTime: isoDuration(recipe.cookMinutes),
    totalTime: isoDuration(recipe.prepMinutes + recipe.cookMinutes),
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.steps.map((text) => ({ "@type": "HowToStep", text })),
    author: { "@type": "Organization", name: "Granny Recipes" },
    url: `${ORIGIN}/recipes/${recipe.slug}/`
  };
}

for (const recipe of SEED) {
  const description = recipe.story;
  write(`recipes/${recipe.slug}/index.html`, page({
    title: `${recipe.title} · Granny Recipes`,
    description,
    current: "home",
    pageName: "recipe",
    canonical: `${ORIGIN}/recipes/${recipe.slug}/`,
    jsonLd: recipeJson(recipe),
    extraHead: og(recipe.title, description, `${ORIGIN}/recipes/${recipe.slug}/`),
    main: `<article id="recipe-root" class="wrap recipe-layout" data-slug="${recipe.slug}">
      <p class="print-only print-brand">Granny Recipes</p>
      <p class="print-only shopping-label">Shopping list</p>
      <figure class="recipe-photo">
        <img src="${recipe.photo}" alt="Illustration of ${escapeHtml(recipe.title)}" width="800" height="520">
        <figcaption>Illustration</figcaption>
      </figure>
      <div>
        <p class="badge badge-inline">Sample recipe</p>
        <p class="eyebrow">${escapeHtml(recipe.category)}</p>
        <h1 class="recipe-title">${escapeHtml(recipe.title)}</h1>
        <p class="recipe-story">${escapeHtml(recipe.story)}</p>
        <p class="meta recipe-meta">${formatMinutes(recipe.prepMinutes)} prep · ${formatMinutes(recipe.cookMinutes)} cook · Serves ${recipe.servings}</p>
        <p class="meta" id="rating-summary">No ratings yet</p>
        <p class="meta" id="heart-summary">No favorites yet</p>
        <p class="credit">${escapeHtml(recipe.photoCredit)}</p>
        <div id="recipe-actions"></div>
        <h2>Ingredients</h2>
        <ul class="ingredients">
          ${recipe.ingredients.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}
        </ul>
        <h2 class="steps-heading">Steps</h2>
        <ol class="steps">
          ${recipe.steps.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}
        </ol>
        <p class="note">Home recipe, shared for cooking inspiration. Use your own judgment on food safety and doneness.</p>
        <section id="comments" class="no-print" aria-label="Comments"></section>
      </div>
    </article>`
  }));
}

write("recipe.html", page({
  title: "Recipe · Granny Recipes",
  description: "A recipe on Granny Recipes.",
  current: "home",
  pageName: "recipe",
  robots: "noindex",
  main: `<div class="wrap">
    <article id="recipe-root"></article>
    <div id="recipe-actions"></div>
    <section id="comments" class="no-print" aria-label="Comments"></section>
    <noscript><p>This page needs JavaScript to show a recipe that was posted in the browser.</p></noscript>
  </div>`
}));

const categoryOptions = CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join("\n            ");
write("post.html", page({
  title: "Post a recipe · Granny Recipes",
  description: "Share a recipe: title, story, photo, times, servings, ingredients, and steps.",
  current: "post",
  pageName: "post",
  robots: "noindex",
  main: `<div class="wrap">
    <h1>Post a recipe</h1>
    <p class="lede">Write it the way you would on a card: a clear title, a list, and numbered steps.</p>
    <p id="post-auth-note" class="note" hidden></p>
    <form id="post-form" class="form-card">
      <label for="title">Title</label>
      <input id="title" name="title" required maxlength="120" autocomplete="off">
      <label for="story">Granny's name or a short story (optional)</label>
      <textarea id="story" name="story" maxlength="2000" rows="4" placeholder="A Sunday soup that stayed warm on the stove."></textarea>
      <label for="photo">Photo (optional)</label>
      <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif">
      <img id="photo-preview" class="preview-img" alt="" hidden>
      <label for="prep">Prep time (minutes)</label>
      <input id="prep" name="prep" type="number" min="0" max="1440" step="1" value="15" required inputmode="numeric">
      <label for="cook">Cook time (minutes)</label>
      <input id="cook" name="cook" type="number" min="0" max="1440" step="1" value="30" required inputmode="numeric">
      <label for="servings">Servings</label>
      <input id="servings" name="servings" type="number" min="1" max="100" step="1" value="4" required inputmode="numeric">
      <label for="category">Category</label>
      <select id="category" name="category" required>
        <option value="">Choose a category</option>
        ${categoryOptions}
      </select>
      <div class="repeater">
        <div class="action-row">
          <h2 id="ing-heading">Ingredients</h2>
          <button type="button" class="add-row button-quiet">Add ingredient</button>
        </div>
        <ul id="ingredients" class="rows" aria-labelledby="ing-heading">
          <li>
            <label class="sr-only" for="ingredient-1">Ingredient 1</label>
            <input id="ingredient-1" name="ingredient" type="text" required maxlength="200" placeholder="2 cups flour">
            <button type="button" class="button-quiet remove-row">Remove</button>
          </li>
        </ul>
      </div>
      <div class="repeater">
        <div class="action-row">
          <h2 id="step-heading">Steps</h2>
          <button type="button" class="add-row button-quiet">Add step</button>
        </div>
        <ul id="steps" class="rows" aria-labelledby="step-heading">
          <li>
            <label class="sr-only" for="step-1">Step 1</label>
            <textarea id="step-1" name="step" required maxlength="1000" rows="3" placeholder="Heat the oven."></textarea>
            <button type="button" class="button-quiet remove-row">Remove</button>
          </li>
        </ul>
      </div>
      <p class="hp" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></p>
      <button type="submit">Post recipe</button>
      <p id="post-error" class="form-error" role="alert"></p>
    </form>
  </div>`
}));

function authForm(id, title, fields, button) {
  return `<form id="${id}" class="form-card" data-auth>
    <h2>${title}</h2>
    ${fields}
    <p class="hp" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></p>
    <button type="submit">${button}</button>
    <p class="form-error" role="alert"></p>
  </form>`;
}

write("login.html", page({
  title: "Sign in · Granny Recipes",
  description: "Sign in with email and password, or ask for a magic link.",
  pageName: "auth",
  robots: "noindex",
  main: `<div class="wrap">
    <h1>Your kitchen account</h1>
    <p class="lede">Browsing is open. Sign in to post, comment, save a favorite, or leave a star.</p>
    <p id="auth-status" role="status"></p>
    ${authForm("signin-form", "Sign in", `
      <label for="in-email">Email</label>
      <input id="in-email" name="email" type="email" autocomplete="username" required maxlength="120">
      <label for="in-password">Password</label>
      <input id="in-password" name="password" type="password" autocomplete="current-password" required minlength="8">
    `, "Sign in")}
    ${authForm("signup-form", "Create an account", `
      <label for="up-name">Display name (optional)</label>
      <input id="up-name" name="displayName" type="text" maxlength="40" autocomplete="nickname">
      <label for="up-email">Email</label>
      <input id="up-email" name="email" type="email" autocomplete="username" required maxlength="120">
      <label for="up-password">Password</label>
      <input id="up-password" name="password" type="password" autocomplete="new-password" required minlength="8" aria-describedby="pw-hint">
      <p id="pw-hint" class="hint">At least 8 characters. In demo mode the password stays in this browser as a hash.</p>
    `, "Create account")}
    ${authForm("magic-form", "Email me a sign-in link", `
      <label for="magic-email">Email</label>
      <input id="magic-email" name="email" type="email" autocomplete="username" required maxlength="120">
      <p class="hint">In demo mode there is no mail server. A one-time link appears on this page. With Supabase, the link arrives by email.</p>
    `, "Send a sign-in link")}
  </div>`
}));

write("about.html", page({
  title: "About · Granny Recipes",
  description: "What Granny Recipes is: a warm place to keep family-style recipes, with a shop that is opening soon.",
  current: "about",
  canonical: `${ORIGIN}/about.html`,
  main: `<article class="wrap prose">
    <h1>About Granny Recipes</h1>
    <p>Granny Recipes is a small website for recipes people want to keep: the Sunday roast, the biscuits, the pie that always came out of the same oven. It is a community cookbook, not a biography of any real person.</p>
    <p>The recipes already on the shelf are labeled <strong>Sample recipe</strong>. They are generic home-cooking notes written for this site. They are not quotations, and they are not attributed to a named person. The pictures are simple illustrations made for the site, not photographs of real people or children.</p>
    <h2>How saving works</h2>
    <p>Until a Supabase project is connected, the site runs in demo mode. The banner says so: your posts are saved only in this browser. Create an account with email and password, or use the one-time sign-in link shown on the login page. Hearts, stars, and comments stay on this device too.</p>
    <p>When <code>config.js</code> has a Supabase URL and anon key, the same screens use that shared kitchen instead. Setup steps are in the README.</p>
    <h2>The shop</h2>
    <p><a href="shop/">Granny's Kitchen Shop</a> is marked <strong>Opening soon</strong>. Recipe cards, a card box, a gift set, and The Granny Recipes Book are described there. Any prices you see are placeholders, not final prices, and an empty checkout slot does not take payment.</p>
    <h2>Moderation</h2>
    <p>Every recipe and comment has a report button. The owner can hide or delete posts and comments. In demo mode, set <code>OWNER_EMAIL</code> in <code>config.js</code>. With Supabase, add your user to <code>public.owners</code>.</p>
  </article>`
}));

write("guidelines.html", page({
  title: "Community guidelines · Granny Recipes",
  description: "How to take part in Granny Recipes: be kind, share recipes you may share, and report problems.",
  current: "guidelines",
  canonical: `${ORIGIN}/guidelines.html`,
  main: `<article class="wrap prose">
    <h1>Community guidelines</h1>
    <p>This kitchen works when people are decent to each other. These are the house rules.</p>
    <ul>
      <li>Be kind. Disagree about salt if you must, but do not insult, harass, or target anyone.</li>
      <li>Post recipes you have a right to share. Do not paste a book, a paid class, or someone else's story as if it were yours.</li>
      <li>Do not publish another person's private details, full name, address, or contact information.</li>
      <li>Do not upload photos of real people or children. Food and handwritten cards are enough.</li>
      <li>No spam, no pile of links, and no comments that are only an advertisement.</li>
      <li>Do not post dangerous instructions. Recipes are home cooking, not medical advice.</li>
      <li>Use the report button when something breaks these rules. The owner may hide or delete it.</li>
      <li>The shop is not open. Do not send card numbers or payment details by email. "Notify me" only asks to be told when something is available.</li>
    </ul>
    <p>Sample recipes are starting points. If you cook one, you are welcome to say how it went — in your own words, without inventing a quote from a real person.</p>
  </article>`
}));

write("privacy.html", page({
  title: "Privacy (draft) · Granny Recipes",
  description: "Draft privacy notice for Granny Recipes, including demo mode, accounts, and the shop.",
  canonical: `${ORIGIN}/privacy.html`,
  main: `<article class="wrap prose">
    <p class="draft-banner"><strong>Draft.</strong> This is a plain-language starting point, not legal advice and not a finished policy. Review it before you rely on it.</p>
    <h1>Privacy</h1>
    <p>Last updated November 7, 2026.</p>
    <h2>What this site is</h2>
    <p>Granny Recipes lets people read recipes and, with an account, post recipes, comment, save favorites, and rate. The shop describes products that are not on sale yet.</p>
    <h2>Demo mode</h2>
    <p>If Supabase is not configured, data stays in this browser's localStorage. That includes your email, a hash of your password, recipes, comments, hearts, ratings, and reports. It is not sent to a server by this site. Anyone who can use your browser profile can read that storage. Clearing site data removes it.</p>
    <h2>Supabase mode</h2>
    <p>If the public config file contains a Supabase project URL and anon key, accounts, recipes, comments, hearts, ratings, reports, and photos are stored in that Supabase project. Supabase processes authentication. Passwords are handled by Supabase, not by this page. The anon key is public; access rules in the database are what limit reading and writing. The owner can read reports and hidden items.</p>
    <h2>What other people see</h2>
    <p>Your display name is shown with recipes and comments. Your email is not shown on the public page. Hearts and ratings are counted. Other visitors are not shown a list of who clicked them.</p>
    <h2>Shop</h2>
    <p>"Coming soon / Notify me" opens your email app with a draft message. Nothing is sent until you send it. If a Stripe Payment Link is added later, card payments are handled by Stripe on Stripe's site. This static site does not receive card numbers. A PDF download linked from the thank-you page is a file on the public site unless you host it somewhere else.</p>
    <h2>Cookies</h2>
    <p>Demo mode uses localStorage, not a tracking cookie. Supabase Auth stores a session in browser storage. Advertising is off while the ad provider is set to none, so the advertising-cookie banner stays hidden and no ad script is loaded.</p>
    <h2>Advertising cookies</h2>
    <p>If the site owner later sets the ad provider to AdSense in <code>assets/js/ads-config.js</code>, a consent banner appears before any advertising cookie is set. Accepting allows the ad script to load. Rejecting keeps the ad slots empty. The choice is stored in this browser under a local key and is not an account setting. Ad slots are kept out of print views, the recipe form, the login page, and shop checkout. See the <a href="disclosure.html">Affiliate &amp; Advertising Disclosure</a>.</p>
    <h2>Affiliates</h2>
    <p>A recipe can list affiliate links. Those links use <code>rel="sponsored nofollow"</code>, and the page shows a short disclosure when any are present. The other site may learn that you arrived from Granny Recipes. Affiliate links are optional, off until configured, and are not a sale of your account information.</p>
    <h2>Children</h2>
    <p>The site is not directed at children, and photos of children are not allowed.</p>
  </article>`
}));

write("terms.html", page({
  title: "Terms (draft) · Granny Recipes",
  description: "Draft terms for using Granny Recipes and the shop that is opening soon.",
  canonical: `${ORIGIN}/terms.html`,
  main: `<article class="wrap prose">
    <p class="draft-banner"><strong>Draft.</strong> These terms are a starting point for the site owner. They are not legal advice.</p>
    <h1>Terms</h1>
    <p>Last updated November 7, 2026.</p>
    <p>By using Granny Recipes you agree to the <a href="guidelines.html">community guidelines</a> and to these draft terms. If you do not agree, do not post.</p>
    <h2>The cookbook</h2>
    <p>Sample recipes are provided as-is for home cooking. They are not a promise of a result, and they are not professional food-safety instruction. You are responsible for allergens, doneness, and safe storage.</p>
    <p>You keep the responsibility for what you post. You give the site owner permission to display it, and to hide or remove it. Do not post anything you lack the right to share.</p>
    <h2>Accounts</h2>
    <p>Keep your password to yourself. Demo-mode accounts exist only in your browser. We may remove content that breaks the guidelines.</p>
    <h2>The shop</h2>
    <p>Granny's Kitchen Shop is marked opening soon. Prices shown from the shop config are placeholders and are not an offer, an invoice, or a final price. An empty payment link does not sell anything. "Notify me" only prepares an email. If checkout is enabled later, Stripe's terms apply to the payment, and mailed goods are fulfilled by the shop owner, not automatically by this website.</p>
    <h2>No warranty</h2>
    <p>The site is provided as-is. To the extent the law allows, the owner is not liable for lost data in demo mode, recipe outcomes, or a shop purchase that is not yet offered.</p>
  </article>`
}));

write("404.html", page({
  title: "Page not found · Granny Recipes",
  description: "That page is not in the Granny Recipes kitchen.",
  robots: "noindex",
  main: `<div class="wrap prose">
    <p class="eyebrow">404</p>
    <h1>That page is not on the shelf</h1>
    <p>The link may be old, or the address may be mistyped.</p>
    <p><a class="button" href="index.html">Back to recipes</a> <a class="button button-quiet" href="shop/">Visit the shop</a></p>
  </div>`
}));

write("moderate.html", page({
  title: "Moderation · Granny Recipes",
  description: "Owner tools for reports and hidden recipes.",
  pageName: "moderate",
  robots: "noindex",
  main: `<div class="wrap prose">
    <h1>Moderation</h1>
    <p>Hide or delete from a recipe or comment. Reports land here for the owner.</p>
    <div id="mod-root"></div>
  </div>`
}));

const products = {
  "recipe-cards": {
    title: "Recipe card packs",
    lede: "Blank 4×6 inch cards with room for a title, ingredients, and steps. Packs of 25 and 50.",
    extra: "The cards are meant for recipes you write yourself. The picture is an illustration, not a photo of a finished pack."
  },
  "recipe-card-box": {
    title: "Recipe card box",
    lede: "A lidded box sized for 4×6 inch cards, so the recipes you write down stay in one place.",
    extra: "The box is drawn here as an illustration. It is not on sale while the shop says opening soon."
  },
  "gift-set": {
    title: "Gift set",
    lede: "The recipe card box plus a pack of 25 blank 4×6 cards.",
    extra: "Give the set when the shop is actually open. Until then, the notify link only opens an email."
  },
  cookbook: {
    title: "The Granny Recipes Book",
    lede: "A 200-page spiral-bound cookbook. Choose a PDF download or a hardcopy sent by mail.",
    extra: "The book is listed as a product, not published in this repository. After a real Stripe payment, buyers should return to the thank-you page, where the PDF link appears once downloadUrl is set. Mailed copies are packed by the shop owner."
  }
};

const imageFor = {
  "recipe-cards": "assets/images/shop/recipe-cards.svg",
  "recipe-card-box": "assets/images/shop/recipe-card-box.svg",
  "gift-set": "assets/images/shop/gift-set.svg",
  cookbook: "assets/images/shop/cookbook.svg"
};

function productMain(id) {
  const product = products[id];
  return `<article class="wrap product-layout" data-product="${id}">
    <figure class="product-photo">
      <img src="${imageFor[id]}" alt="Illustration of ${escapeHtml(product.title)}" width="800" height="520">
      <figcaption>Illustration</figcaption>
    </figure>
    <div>
      <p class="status-pill">Opening soon</p>
      <h1>${escapeHtml(product.title)}</h1>
      <p class="lede">${escapeHtml(product.lede)}</p>
      <p>${escapeHtml(product.extra)}</p>
      <p class="note">Prices below are placeholders, not final prices. Nothing is charged from an empty checkout slot.</p>
      <div class="js-offer"></div>
      <noscript>
        <p><a href="mailto:?subject=Notify%20me%20about%20Granny%27s%20Kitchen%20Shop">Coming soon / Notify me</a></p>
      </noscript>
    </div>
  </article>`;
}

const shopDesc = "Granny's Kitchen Shop is opening soon. Recipe cards, a card box, a gift set, and a spiral-bound cookbook. Prices are not final.";
write("shop/index.html", page({
  title: "Granny's Kitchen Shop — opening soon",
  description: shopDesc,
  current: "shop",
  pageName: "shop",
  canonical: `${ORIGIN}/shop/`,
  extraHead: og("Granny's Kitchen Shop", shopDesc, `${ORIGIN}/shop/`),
  main: `<div class="wrap">
    <p class="status-pill">Opening soon</p>
    <h1>Granny's Kitchen Shop</h1>
    <p class="lede">Cards for the recipes you want to keep, a box to hold them, a gift set, and a 200-page spiral-bound book. Prices are placeholders, not final, and checkout stays off until a payment link is added.</p>
    <div class="grid">
      ${Object.entries(products).map(([id, product]) => `<article class="product-card" data-product="${id}">
        <a href="${id === "cookbook" ? "shop/cookbook/" : `shop/${id}/`}"><img src="${imageFor[id]}" alt="Illustration of ${escapeHtml(product.title)}" width="800" height="520"></a>
        <p class="illus-label">Illustration</p>
        <h2><a href="${id === "cookbook" ? "shop/cookbook/" : `shop/${id}/`}">${escapeHtml(product.title)}</a></h2>
        <p>${escapeHtml(product.lede)}</p>
        <div class="js-offer"></div>
      </article>`).join("\n")}
    </div>
  </div>`
}));

for (const id of Object.keys(products)) {
  const folder = id === "cookbook" ? "cookbook" : id;
  write(`shop/${folder}/index.html`, page({
    title: `${products[id].title} · Granny's Kitchen Shop`,
    description: `${products[id].lede} Opening soon. Prices are placeholders, not final.`,
    current: "shop",
    pageName: "shop",
    canonical: `${ORIGIN}/shop/${folder}/`,
    main: productMain(id)
  }));
}

write("disclosure.html", page({
  title: "Affiliate & Advertising Disclosure · Granny Recipes",
  description: "How Granny Recipes would show advertising and affiliate links. Ads are off until a provider is configured.",
  canonical: `${ORIGIN}/disclosure.html`,
  main: `<article class="wrap prose">
    <p class="draft-banner"><strong>Draft.</strong> Advertising is not turned on. This page explains the hooks that are ready, not a live ad program.</p>
    <h1>Affiliate &amp; Advertising Disclosure</h1>
    <p>Granny Recipes is a community cookbook. The shelves and the shop can be read without an account. Advertising space is built in, and it is empty.</p>
    <h2>Advertising</h2>
    <p>The ad provider in <code>assets/js/ads-config.js</code> is <code>none</code>. Empty slots are not drawn and do not take space. If that provider is later set to AdSense, and a publisher ID and slot IDs are filled in, ads can appear in these places:</p>
    <ul>
      <li>Below the recipe introduction</li>
      <li>Between the steps of a long recipe</li>
      <li>A sidebar on a wide screen</li>
      <li>A dismissible bar at the bottom of a phone</li>
      <li>In the recipe browse grid, after every sixth card</li>
    </ul>
    <p>Ads are not placed on the print view, the ingredients shopping list, the post-a-recipe form, the login page, or shop checkout. A consent banner asks before any advertising cookie is set. Until you accept, the ad script is not loaded. You can read the <a href="privacy.html">privacy draft</a> for how that choice is stored.</p>
    <p>The root <code>ads.txt</code> file is a commented placeholder. It does not name a seller until the owner publishes a real publisher ID.</p>
    <h2>Affiliates</h2>
    <p>Affiliate links are off until they are listed in the same config file. When a recipe uses one, the link is marked <code>rel="sponsored nofollow"</code> and the page says that a purchase through it may earn this site a commission, at no extra cost to you. Sample recipes do not include affiliate links.</p>
    <h2>The shop</h2>
    <p><a href="shop/">Granny's Kitchen Shop</a> is opening soon. Its prices are placeholders. Checkout, when it exists, is handled by Stripe and is not an ad slot.</p>
  </article>`
}));

write("shop/thank-you.html", page({
  title: "Thank you · Granny's Kitchen Shop",
  description: "The page buyers return to after checkout, including the PDF download when it is published.",
  pageName: "thanks",
  robots: "noindex",
  main: `<article class="wrap prose" id="thanks"></article>`
}));

const urls = [
  `${ORIGIN}/`,
  `${ORIGIN}/about.html`,
  `${ORIGIN}/privacy.html`,
  `${ORIGIN}/terms.html`,
  `${ORIGIN}/guidelines.html`,
  `${ORIGIN}/disclosure.html`,
  `${ORIGIN}/shop/`,
  `${ORIGIN}/shop/recipe-cards/`,
  `${ORIGIN}/shop/recipe-card-box/`,
  `${ORIGIN}/shop/gift-set/`,
  `${ORIGIN}/shop/cookbook/`,
  ...SEED.map((recipe) => `${ORIGIN}/recipes/${recipe.slug}/`)
];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc><lastmod>2026-11-07</lastmod></url>`).join("\n")}
</urlset>
`);

for (const [rel, contents] of Object.entries(illustrations)) write(rel, contents);
write("favicon.svg", favicon);

console.log(`Wrote ${urls.length} public URLs and ${Object.keys(illustrations).length} illustrations.`);
