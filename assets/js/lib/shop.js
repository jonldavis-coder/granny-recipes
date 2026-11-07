export function pricesTreatedAsFinal(config) {
  return config?.pricesAreFinal === true && config?.openingSoon !== true;
}

export function formatMoney(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  if (/^[$€£]/.test(text)) return text;
  const amount = Number(text);
  if (!Number.isFinite(amount)) return text;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function priceLabel(raw, config) {
  const money = formatMoney(raw);
  if (!money) return "";
  if (pricesTreatedAsFinal(config)) return money;
  return `Placeholder price ${money}, not final`;
}

export function notifyHref(config, product, format) {
  const email = String(config?.notifyEmail || "").trim();
  const subject = `Notify me: ${product?.name || "Granny's Kitchen Shop"}${format?.name ? ` — ${format.name}` : ""}`;
  const body = [
    "Please tell me when this is available in Granny's Kitchen Shop.",
    "",
    `Item: ${product?.name || "Shop"}`,
    format?.name ? `Option: ${format.name}` : "",
    "",
    "Sent from the Granny Recipes website."
  ]
    .filter((line) => line !== "")
    .join("\n");
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function isHttpsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function callToAction(config, product, format) {
  const link = String(format?.stripePaymentLink || "").trim();
  if (!isHttpsUrl(link)) {
    return {
      type: "notify",
      label: "Coming soon / Notify me",
      href: notifyHref(config, product, format)
    };
  }
  return {
    type: "checkout",
    label: "Continue to checkout",
    href: link
  };
}

export function findProduct(config, productId) {
  return (config?.products || []).find((product) => product.id === productId) || null;
}

export function findFormat(product, formatId) {
  return (product?.formats || []).find((format) => format.id === formatId) || null;
}
