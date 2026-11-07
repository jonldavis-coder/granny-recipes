import { el, friendlyError } from "../lib/dom.js";
import { formatWhen } from "../lib/format.js";

export async function init(adapter) {
  const root = document.getElementById("mod-root");
  const session = await adapter.getSession();
  if (!session) {
    root.append(el("p", {}, [el("a", { href: "login.html?next=moderate.html" }, "Sign in"), " to open the moderation desk."]));
    return;
  }
  if (!session.isOwner) {
    root.append(
      el("p", {}, "This desk is for the kitchen owner."),
      el("p", {}, "In demo mode, set OWNER_EMAIL in config.js to your account email and sign in again. With Supabase, add your user to the public.owners table. The README has the exact steps.")
    );
    return;
  }
  try {
    const [reports, recipes] = await Promise.all([adapter.listReports(), adapter.listRecipes()]);
    const hidden = recipes.filter((recipe) => recipe.hidden);
    root.append(
      el("h2", {}, "Reports"),
      reports.length ? el("ul", { class: "report-list" }, reports.map((report) => el("li", {}, [
        el("strong", {}, report.reason),
        ` · ${report.targetType} · ${formatWhen(report.createdAt)}`,
        report.recipeSlug ? el("div", {}, [el("a", { href: reportLink(report) }, report.recipeSlug)]) : null,
        report.note ? el("p", {}, report.note) : null,
        el("p", { class: "hint" }, `From ${report.reporterName || "a cook"}`)
      ]))) : el("p", { class: "empty" }, "No reports."),
      el("h2", {}, "Hidden recipes"),
      hidden.length ? el("ul", {}, hidden.map((recipe) => el("li", {}, [
        el("a", { href: recipe.sample ? `recipes/${recipe.slug}/` : `recipe.html?slug=${encodeURIComponent(recipe.slug)}` }, recipe.title)
      ]))) : el("p", { class: "empty" }, "Nothing is hidden.")
    );
  } catch (error) {
    root.append(el("p", { class: "form-error", role: "alert" }, friendlyError(error)));
  }
}

function reportLink(report) {
  const slug = report.recipeSlug || (report.targetType === "recipe" ? report.targetId : "");
  if (!slug) return "moderate.html";
  return `recipe.html?slug=${encodeURIComponent(slug)}`;
}
