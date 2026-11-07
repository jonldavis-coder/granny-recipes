export const AD_SLOTS = ["recipeIntro", "recipeSteps", "sidebar", "mobileFooter", "browseGrid"];

const EXCLUDED_PAGES = new Set(["post", "auth", "thanks", "shop"]);

export function readAdsConfig(source) {
  const config = source || {};
  return {
    provider: config.provider === "adsense" ? "adsense" : "none",
    debug: config.debug === true,
    longRecipeMinSteps: Number(config.longRecipeMinSteps) > 0 ? Number(config.longRecipeMinSteps) : 6,
    gridEvery: Number(config.gridEvery) > 0 ? Number(config.gridEvery) : 6,
    heights: { ...(config.heights || {}) },
    adsense: {
      publisherId: String(config.adsense?.publisherId || "").trim(),
      slots: { ...(config.adsense?.slots || {}) }
    },
    consent: {
      enabled: config.consent?.enabled === true,
      storageKey: config.consent?.storageKey || "granny-ads-consent"
    },
    affiliates: config.affiliates || { enabled: false, links: [] }
  };
}

export function adsProviderOn(config) {
  return readAdsConfig(config).provider !== "none";
}

export function debugOutlines(config, search = "") {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(String(search).replace(/^\?/, ""));
  return readAdsConfig(config).debug || params.get("adsDebug") === "1";
}

export function pageAllowsAds(pageName) {
  return !EXCLUDED_PAGES.has(pageName || "");
}

export function slotsShouldRender(config, { pageName = "", printing = false, search = "" } = {}) {
  if (printing || !pageAllowsAds(pageName)) return false;
  return adsProviderOn(config) || debugOutlines(config, search);
}

export function consentBannerOn(config) {
  return adsProviderOn(config);
}

export function publisherReady(config) {
  const parsed = readAdsConfig(config);
  return parsed.provider === "adsense" && /^ca-pub-\d{10,20}$/.test(parsed.adsense.publisherId);
}

export function slotId(config, name) {
  return String(readAdsConfig(config).adsense.slots[name] || "").trim();
}

export function slotHeight(config, name) {
  const height = Number(readAdsConfig(config).heights[name]);
  return Number.isFinite(height) && height > 0 ? height : 0;
}

export function stepInsertIndex(stepCount, minSteps = 6) {
  const count = Number(stepCount) || 0;
  const minimum = Number(minSteps) || 6;
  if (count < minimum) return -1;
  const index = Math.floor(count / 2);
  if (index < 1 || index >= count) return -1;
  return index;
}

export function withGridSlots(items, every = 6) {
  const stride = Number(every) > 0 ? Number(every) : 6;
  const out = [];
  items.forEach((item, index) => {
    out.push({ kind: "item", item });
    if ((index + 1) % stride === 0) out.push({ kind: "ad", slot: "browseGrid" });
  });
  return out;
}
