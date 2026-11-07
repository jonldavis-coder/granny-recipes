const SAFE_REL = "sponsored nofollow";

export function affiliateRel() {
  return SAFE_REL;
}

function httpsUrl(href) {
  try {
    const url = new URL(String(href || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export function linksForRecipe(recipe, config) {
  if (!config?.affiliates?.enabled || !recipe) return [];
  const fromConfig = (config.affiliates.links || []).filter((link) => {
    const recipes = link?.recipes || [];
    return recipes.includes(recipe.slug) || recipes.includes("*");
  });
  const fromRecipe = Array.isArray(recipe.affiliateLinks) ? recipe.affiliateLinks : [];
  const seen = new Set();
  const links = [];
  for (const link of [...fromConfig, ...fromRecipe]) {
    const href = httpsUrl(link?.href);
    const label = String(link?.label || "").trim();
    if (!href || !label || seen.has(href)) continue;
    seen.add(href);
    links.push({ href, label, rel: SAFE_REL });
  }
  return links;
}

export function disclosureLine(config, links) {
  if (!links?.length) return "";
  return String(config?.affiliates?.disclosure || "").trim();
}

export function decorateAnchor(anchor, config) {
  const href = httpsUrl(anchor?.href);
  const known = (config?.affiliates?.links || []).some((link) => httpsUrl(link?.href) === href);
  if (!href || (!known && !anchor?.affiliate)) return null;
  return { href, rel: SAFE_REL, label: String(anchor.label || href) };
}
