import { findFormat, findProduct } from "../lib/shop.js";
import { el } from "../lib/dom.js";

export async function init() {
  const root = document.getElementById("thanks");
  if (!root) return;
  const config = window.GRANNY_SHOP_CONFIG || { products: [] };
  const params = new URLSearchParams(location.search);
  const product = findProduct(config, params.get("product"));
  const format = findFormat(product, params.get("format"));
  const sessionId = params.get("session_id");
  const realSession = sessionId && !sessionId.includes("{") && !sessionId.includes("}");

  const parts = [
    el("p", { class: "eyebrow" }, "Granny's Kitchen Shop"),
    el("h1", {}, "Thank you"),
    el("p", {}, "This is the page Stripe should open after checkout. If you just paid, keep this page.")
  ];

  if (config.openingSoon) {
    parts.push(el("p", { class: "status-pill" }, "Opening soon"));
  }

  if (product && format) {
    parts.push(el("p", {}, `${product.name} — ${format.name}`));
  } else {
    parts.push(el("p", {}, "No product was named in the link. That is all right if you arrived here by accident."));
  }

  if (format?.delivery === "download") {
    const download = String(format.downloadUrl || "").trim();
    if (download.startsWith("https://") || download.startsWith("assets/") || download.startsWith("downloads/")) {
      parts.push(
        el("p", {}, "Your PDF download:"),
        el("p", {}, [el("a", { class: "button", href: download }, "Download the PDF")])
      );
    } else {
      parts.push(el("p", {}, "The PDF download link is not published yet. The site owner adds it as downloadUrl on the PDF format in assets/js/shop-config.js. If you already paid, save your payment reference and check back."));
    }
    parts.push(el("p", { class: "hint" }, "Set the Stripe Payment Link success URL to the thankYouPath in shop-config.js so buyers land here."));
  } else if (format?.delivery === "mail" || (format && format.delivery !== "download")) {
    parts.push(el("p", {}, "Mailed goods are packed by the shop owner from the Stripe order. This static site does not ship a package by itself."));
  }

  if (realSession) {
    parts.push(el("p", { class: "hint" }, `Payment reference: ${sessionId}`));
  }

  parts.push(el("p", {}, [el("a", { href: "shop/" }, "Back to the shop")]));
  root.replaceChildren(...parts);
}
