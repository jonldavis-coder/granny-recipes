const DEMO_TEXT = "Demo mode: your posts are saved only in this browser.";

export function mountChrome(adapter) {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const banner = document.getElementById("demo-banner");
  if (banner) {
    if (adapter.mode === "demo") {
      banner.hidden = false;
      banner.textContent = adapter.fallbackReason ? `${DEMO_TEXT} ${adapter.fallbackReason}` : DEMO_TEXT;
    } else {
      banner.hidden = true;
    }
  }

  const modeNote = document.getElementById("mode-note");
  if (modeNote) {
    modeNote.textContent = adapter.mode === "demo"
      ? "Demo mode: your posts are saved only in this browser."
      : "Connected to the shared kitchen.";
  }

  return refreshAuth(adapter);
}

export async function refreshAuth(adapter) {
  const slot = document.getElementById("auth-slot");
  if (!slot) return null;
  const session = await adapter.getSession();
  slot.replaceChildren();
  if (!session) {
    const link = document.createElement("a");
    link.href = "login.html";
    link.textContent = "Sign in";
    if (document.body.dataset.page === "auth") link.setAttribute("aria-current", "page");
    slot.append(link);
    return null;
  }

  const name = document.createElement("span");
  name.className = "who";
  name.textContent = session.displayName;

  if (session.isOwner && document.body.dataset.page !== "moderate") {
    const mod = document.createElement("a");
    mod.href = "moderate.html";
    mod.textContent = "Moderate";
    slot.append(mod);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "linkish";
  button.textContent = "Sign out";
  button.addEventListener("click", async () => {
    button.disabled = true;
    await adapter.signOut();
    location.reload();
  });
  slot.append(name, button);
  return session;
}
