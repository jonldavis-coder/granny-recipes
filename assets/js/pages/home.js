import { CATEGORIES } from "../categories.js";
import { filterRecipes, sortRecipes } from "../lib/filter.js";
import { formatHearts, formatMinutes, formatRating } from "../lib/format.js";
import { el } from "../lib/dom.js";
import { withGridSlots } from "../lib/ads.js";
import { adsActive, adsConfig, createAdSlot } from "../ads-runtime.js";

export async function init(adapter) {
  const recipes = sortRecipes(await adapter.listRecipes());
  const search = document.getElementById("search");
  const rating = document.getElementById("rating-filter");
  const list = document.getElementById("recipe-list");
  const count = document.getElementById("results-count");
  const categoryRow = document.getElementById("category-filters");
  const state = readState();

  function readState() {
    const params = new URLSearchParams(location.search);
    return {
      query: params.get("q") || "",
      category: CATEGORIES.includes(params.get("category")) ? params.get("category") : "All",
      minRating: Number(params.get("min") || 0)
    };
  }

  if (search) search.value = state.query;
  if (rating) rating.value = String(state.minRating || 0);

  function writeUrl() {
    const params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    if (state.category && state.category !== "All") params.set("category", state.category);
    if (state.minRating) params.set("min", String(state.minRating));
    const next = `${location.pathname}${params.toString() ? `?${params}` : ""}`;
    history.replaceState(null, "", next);
  }

  function render() {
    const visible = filterRecipes(recipes, state);
    list.replaceChildren();
    if (!visible.length) {
      const empty = el("p", { class: "empty" }, "No recipes match. Try another word, or clear the rating filter. Unrated recipes stay hidden while a minimum rating is set.");
      list.append(empty);
    } else {
      const entries = adsActive() ? withGridSlots(visible, adsConfig().gridEvery) : visible.map((item) => ({ kind: "item", item }));
      for (const entry of entries) {
        list.append(entry.kind === "ad" ? createAdSlot("browseGrid") : card(entry.item));
      }
    }
    const noun = visible.length === 1 ? "recipe" : "recipes";
    count.textContent = `${visible.length} ${noun}`;
    categoryRow.querySelectorAll("button").forEach((button) => {
      const on = button.dataset.category === state.category;
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  categoryRow.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    writeUrl();
    render();
  });
  search?.addEventListener("input", () => {
    state.query = search.value;
    writeUrl();
    render();
  });
  rating?.addEventListener("change", () => {
    state.minRating = Number(rating.value);
    writeUrl();
    render();
  });
  document.addEventListener("granny-ads-remount", render);

  render();
}

function card(recipe) {
  const href = recipe.sample ? `recipes/${recipe.slug}/` : `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
  const media = recipe.photo
    ? el("img", {
      src: recipe.photo,
      alt: recipe.photoIsIllustration ? `Illustration of ${recipe.title}` : `Photo of ${recipe.title}`,
      width: "800",
      height: "520"
    })
    : el("div", { class: "photo-fallback", "aria-hidden": "true" }, recipe.category);
  return el("article", { class: "card" }, [
    el("a", { class: "card-media", href }, [
      media,
      recipe.sample ? el("span", { class: "badge" }, "Sample recipe") : null
    ]),
    el("div", { class: "card-body" }, [
      el("p", { class: "eyebrow" }, recipe.category),
      el("h2", {}, [el("a", { href }, recipe.title)]),
      el("p", { class: "meta" }, `${formatMinutes(recipe.prepMinutes)} prep · ${formatMinutes(recipe.cookMinutes)} cook · Serves ${recipe.servings}`),
      el("p", { class: "meta" }, `${formatRating(recipe.ratingAvg, recipe.ratingCount)} · ${formatHearts(recipe.heartCount)}`)
    ])
  ]);
}
