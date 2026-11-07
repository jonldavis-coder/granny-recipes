import {
  consentBannerOn,
  debugOutlines,
  publisherReady,
  readAdsConfig,
  slotHeight,
  slotId,
  slotsShouldRender,
  stepInsertIndex
} from "./lib/ads.js";
import { disclosureLine, linksForRecipe } from "./lib/affiliate.js";
import { el } from "./lib/dom.js";

let adsenseRequested = false;
const mountObservers = new WeakMap();

export function adsConfig() {
  return readAdsConfig(window.GRANNY_ADS_CONFIG || {});
}

export function adsContext() {
  const printing = Boolean(document.body?.dataset.print || document.body?.dataset.preview);
  return {
    pageName: document.body?.dataset.page || "static",
    printing,
    search: location.search
  };
}

export function adsActive() {
  return slotsShouldRender(adsConfig(), adsContext());
}

function reserve(node, name) {
  const height = slotHeight(adsConfig(), name);
  if (height) node.style.minHeight = `${height}px`;
}

export function createAdSlot(name) {
  const debug = debugOutlines(adsConfig(), location.search);
  const node = el("div", {
    class: `ad-slot ad-slot-${name} no-print`,
    "data-slot": name,
    "data-debug": debug ? "true" : "false"
  });
  reserve(node, name);
  if (debug) {
    node.setAttribute("aria-hidden", "true");
    node.append(el("span", { class: "ad-debug-label" }, `Ad slot: ${labelFor(name)}`));
  } else {
    node.setAttribute("aria-label", "Advertisement");
  }
  observeSlot(node, name);
  return node;
}

function labelFor(name) {
  return {
    recipeIntro: "below the recipe intro",
    recipeSteps: "between steps",
    sidebar: "sidebar",
    mobileFooter: "mobile footer",
    browseGrid: "browse grid"
  }[name] || name;
}

function observeSlot(node, name) {
  if (debugOutlines(adsConfig(), location.search) || !publisherReady(adsConfig())) return;
  if (!consentGranted()) return;
  const id = slotId(adsConfig(), name);
  if (!id) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      fillAdsense(entry.target, id);
    }
  }, { rootMargin: "200px 0px" });
  observer.observe(node);
  mountObservers.set(node, observer);
}

function fillAdsense(node, id) {
  const config = adsConfig();
  if (node.dataset.filled === "true" || !publisherReady(config)) return;
  node.dataset.filled = "true";
  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.style.minHeight = node.style.minHeight;
  ins.setAttribute("data-ad-client", config.adsense.publisherId);
  ins.setAttribute("data-ad-slot", id);
  ins.setAttribute("data-ad-format", "auto");
  ins.setAttribute("data-full-width-responsive", "true");
  node.append(ins);
  loadAdsense(config.adsense.publisherId);
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (error) {
    console.warn("Ad slot did not start.", error);
  }
}

function loadAdsense(publisherId) {
  if (adsenseRequested) return;
  adsenseRequested = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
  script.crossOrigin = "anonymous";
  document.head.append(script);
}

function consentKey() {
  return adsConfig().consent.storageKey;
}

export function consentGranted() {
  try {
    return localStorage.getItem(consentKey()) === "accepted";
  } catch {
    return false;
  }
}

export function mountRecipeAds(root) {
  if (!root || !adsActive() || root.querySelector(".ad-slot")) return;
  const config = adsConfig();
  const intro = createAdSlot("recipeIntro");
  const introAnchor = root.querySelector(".credit") || root.querySelector("#heart-summary") || root.querySelector(".recipe-story");
  const ingredients = [...root.querySelectorAll("h2")].find((heading) => heading.textContent.trim() === "Ingredients");
  if (introAnchor) introAnchor.after(intro);
  else if (ingredients) ingredients.before(intro);
  else root.append(intro);

  const steps = root.querySelector("ol.steps");
  const index = stepInsertIndex(steps?.children.length || 0, config.longRecipeMinSteps);
  if (steps && index > 0) {
    const host = document.createElement("li");
    host.className = "ad-step no-print";
    host.append(createAdSlot("recipeSteps"));
    const following = steps.children[index];
    steps.insertBefore(host, following || null);
    if (following) following.value = index + 1;
  }

  const aside = el("aside", { class: "ad-sidebar no-print" });
  aside.append(createAdSlot("sidebar"));
  root.classList.add("recipe-layout", "has-ad-sidebar");
  root.append(aside);
}

export function mountAffiliateDisclosure(root, recipe) {
  if (!root || root.querySelector(".affiliate-note")) return;
  const config = window.GRANNY_ADS_CONFIG || {};
  const links = linksForRecipe(recipe, config);
  const text = disclosureLine(config, links);
  if (!root || !text) return;
  const block = el("aside", { class: "affiliate-note" }, [
    el("p", { class: "affiliate-disclosure" }, text),
    el("ul", {}, links.map((link) => el("li", {}, [
      el("a", { href: link.href, rel: link.rel }, link.label)
    ])))
  ]);
  const ingredients = [...root.querySelectorAll("h2")].find((heading) => heading.textContent.trim() === "Ingredients");
  if (ingredients) ingredients.before(block);
  else root.append(block);
}

export function mountStickyFooter() {
  if (!adsActive() || document.querySelector(".ad-footer")) return;
  let dismissed = false;
  try {
    dismissed = sessionStorage.getItem("granny-ad-footer-dismissed") === "1";
  } catch {
    dismissed = false;
  }
  if (dismissed) return;
  const bar = el("div", { class: "ad-footer no-print" }, [
    createAdSlot("mobileFooter"),
    el("button", { type: "button", class: "ad-dismiss" }, "Dismiss")
  ]);
  bar.querySelector(".ad-dismiss").addEventListener("click", () => {
    try {
      sessionStorage.setItem("granny-ad-footer-dismissed", "1");
    } catch {
      /* ignore */
    }
    bar.remove();
  });
  document.body.append(bar);
}

export function mountConsent() {
  if (!consentBannerOn(adsConfig()) || document.querySelector(".cookie-banner")) return;
  let choice = "";
  try {
    choice = localStorage.getItem(consentKey()) || "";
  } catch {
    choice = "";
  }
  if (choice === "accepted" || choice === "rejected") return;
  const banner = el("div", { class: "cookie-banner no-print", role: "dialog", "aria-label": "Advertising cookies" }, [
    el("p", {}, [
      "Advertising is off until you allow it. Accepting lets this site load advertising cookies. ",
      el("a", { href: "disclosure.html" }, "Affiliate and advertising disclosure")
    ]),
    el("div", { class: "action-row" }, [
      el("button", { type: "button", class: "consent-accept" }, "Accept"),
      el("button", { type: "button", class: "button-quiet consent-reject" }, "Reject")
    ])
  ]);
  banner.querySelector(".consent-accept").addEventListener("click", () => {
    try {
      localStorage.setItem(consentKey(), "accepted");
    } catch {
      /* ignore */
    }
    banner.remove();
    location.reload();
  });
  banner.querySelector(".consent-reject").addEventListener("click", () => {
    try {
      localStorage.setItem(consentKey(), "rejected");
    } catch {
      /* ignore */
    }
    banner.remove();
  });
  document.body.append(banner);
}

export function clearAds() {
  document.querySelectorAll(".ad-slot, .ad-sidebar, .ad-footer, .cookie-banner, .ad-step").forEach((node) => {
    const observer = mountObservers.get(node);
    observer?.disconnect();
    node.remove();
  });
  document.querySelector(".recipe-layout")?.classList.remove("has-ad-sidebar");
}

export function startAds() {
  if (document.body?.dataset.print || document.body?.dataset.preview) {
    clearAds();
    return;
  }
  mountConsent();
  mountStickyFooter();
  window.addEventListener("beforeprint", clearAds);
  window.addEventListener("afterprint", () => {
    if (document.body.dataset.preview) return;
    delete document.body.dataset.print;
    document.dispatchEvent(new CustomEvent("granny-ads-remount"));
  });
}
