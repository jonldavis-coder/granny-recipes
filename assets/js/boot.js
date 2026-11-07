import { getAdapter } from "./adapter.js";
import { mountChrome } from "./chrome.js";

const pages = {
  home: () => import("./pages/home.js"),
  recipe: () => import("./pages/recipe.js"),
  post: () => import("./pages/post.js"),
  auth: () => import("./pages/auth.js"),
  moderate: () => import("./pages/moderate.js"),
  shop: () => import("./pages/shop.js"),
  thanks: () => import("./pages/thanks.js")
};

async function start() {
  const adapter = await getAdapter();
  await mountChrome(adapter);
  const name = document.body.dataset.page || "static";
  if (!pages[name]) return;
  const mod = await pages[name]();
  await mod.init(adapter);
}

start().catch((error) => {
  console.error(error);
  const banner = document.getElementById("demo-banner");
  if (banner) {
    banner.hidden = false;
    banner.textContent = "Something went wrong while loading the kitchen. Refresh the page.";
  }
});
