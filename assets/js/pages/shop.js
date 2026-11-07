import { callToAction, findProduct, priceLabel } from "../lib/shop.js";
import { el } from "../lib/dom.js";

export async function init() {
  const config = window.GRANNY_SHOP_CONFIG;
  if (!config) return;
  document.querySelectorAll("[data-product]").forEach((node) => {
    const product = findProduct(config, node.dataset.product);
    const slot = node.querySelector(".js-offer");
    if (!product || !slot) return;
    slot.replaceChildren(...product.formats.map((format) => offer(config, product, format)));
  });
}

function offer(config, product, format) {
  const action = callToAction(config, product, format);
  const link = el("a", {
    class: action.type === "checkout" ? "button" : "button button-quiet",
    href: action.href
  }, action.label);
  if (action.type === "checkout") link.rel = "noopener";
  return el("div", { class: "offer" }, [
    el("h3", {}, format.name),
    el("p", { class: "price" }, priceLabel(format.pricePlaceholder, config)),
    link,
    el("p", { class: "hint" }, action.type === "notify"
      ? "Opens your email app. No payment is taken."
      : "Payments are handled by Stripe. The price label stays a placeholder until the shop marks prices final.")
  ]);
}
