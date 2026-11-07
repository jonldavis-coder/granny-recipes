export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "dataset" && value && typeof value === "object") {
      for (const [dataKey, dataValue] of Object.entries(value)) node.dataset[dataKey] = dataValue;
    } else node.setAttribute(key, value === true ? "" : String(value));
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  if (node) node.replaceChildren();
}

export function friendlyError(error) {
  const message = String(error?.message || "");
  if (error?.code === "spam" || error?.code === "fast" || error?.code === "validation" || error?.code === "auth") {
    return message || "Please try again.";
  }
  if (/rate limit/i.test(message)) return "Please wait a bit and try again.";
  if (/invalid login|invalid credentials|email or password/i.test(message)) {
    return "That email and password do not match.";
  }
  if (/already registered|already been registered|user already/i.test(message)) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (/row-level security|permission denied|not authorized|jwt/i.test(message)) {
    return "You do not have permission to do that.";
  }
  if (message && message.length < 180 && !/sql|policy|stack|function/i.test(message)) return message;
  return "Something went wrong. Please try again.";
}
