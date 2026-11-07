import { formatHearts, formatMinutes, formatRating, formatWhen, isoDuration } from "../lib/format.js";
import { safeJsonLd } from "../lib/escape.js";
import { armForm, readFormMeta } from "../lib/human.js";
import { el, friendlyError } from "../lib/dom.js";
import { mountAffiliateDisclosure, mountRecipeAds, mountStickyFooter } from "../ads-runtime.js";
const REPORT_REASONS = ["Spam", "Harassment", "Dangerous instructions", "Not a recipe", "Other"];

function herePath() {
  const base = window.GRANNY_RECIPES_CONFIG?.BASE_PATH || "/granny-recipes/";
  const full = `${location.pathname}${location.search}`;
  return full.startsWith(base) ? full.slice(base.length) : "index.html";
}

function loginHref() {
  return `login.html?next=${encodeURIComponent(herePath())}`;
}

export async function init(adapter) {
  const root = document.getElementById("recipe-root");
  const slug = root?.dataset.slug || new URLSearchParams(location.search).get("slug") || "";
  if (!slug) {
    renderMissing(root);
    return;
  }
  const recipe = await adapter.getRecipe(slug);
  if (!recipe) {
    renderMissing(root);
    return;
  }
  if (!root.querySelector(".recipe-title")) renderArticle(root, recipe);
  else refreshStats(root, recipe);
  document.title = `${recipe.title} · Granny Recipes`;
  ensureJsonLd(recipe);
  const session = await adapter.getSession();
  mountActions(adapter, recipe, session);
  await mountComments(adapter, recipe, session);
  applyPreview();
  mountRecipeAds(root);
  mountAffiliateDisclosure(root, recipe);
  document.addEventListener("granny-ads-remount", () => {
    mountRecipeAds(root);
    mountAffiliateDisclosure(root, recipe);
    mountStickyFooter();
  });
}

function renderMissing(root) {
  document.title = "Recipe not found · Granny Recipes";
  if (!root) return;
  root.replaceChildren(
    el("h1", {}, "That recipe is not on the shelf"),
    el("p", {}, "It may have been removed, or the link may be mistyped."),
    el("p", {}, [el("a", { class: "button", href: "index.html" }, "Back to recipes")])
  );
}

function renderArticle(root, recipe) {
  const figure = recipe.photo
    ? el("figure", { class: "recipe-photo" }, [
      el("img", {
        src: recipe.photo,
        alt: recipe.photoIsIllustration ? `Illustration of ${recipe.title}` : recipe.title,
        width: "800",
        height: "520"
      }),
      el("figcaption", {}, recipe.photoIsIllustration ? "Illustration" : (recipe.photoCredit || "Photo"))
    ])
    : null;
  root.replaceChildren(
    el("p", { class: "print-only print-brand" }, "Granny Recipes"),
    el("p", { class: "print-only shopping-label" }, "Shopping list"),
    figure,
    recipe.sample ? el("p", { class: "badge badge-inline" }, "Sample recipe") : null,
    el("p", { class: "eyebrow" }, recipe.category),
    el("h1", { class: "recipe-title" }, recipe.title),
    recipe.story ? el("p", { class: "recipe-story" }, recipe.story) : null,
    el("p", { class: "meta recipe-meta" }, [
      `${formatMinutes(recipe.prepMinutes)} prep`,
      " · ",
      `${formatMinutes(recipe.cookMinutes)} cook`,
      " · ",
      `Serves ${recipe.servings}`
    ]),
    el("p", { class: "meta", id: "rating-summary" }, formatRating(recipe.ratingAvg, recipe.ratingCount)),
    el("p", { class: "meta", id: "heart-summary" }, formatHearts(recipe.heartCount)),
    recipe.photoCredit ? el("p", { class: "credit" }, recipe.photoCredit) : null,
    el("h2", {}, "Ingredients"),
    el("ul", { class: "ingredients" }, recipe.ingredients.map((item) => el("li", {}, item))),
    el("h2", { class: "steps-heading" }, "Steps"),
    el("ol", { class: "steps" }, recipe.steps.map((item) => el("li", {}, item))),
    el("p", { class: "note" }, "Home recipe, shared for cooking inspiration. Use your own judgment on food safety and doneness.")
  );
}

function refreshStats(root, recipe) {
  const rating = root.querySelector("#rating-summary") || document.getElementById("rating-summary");
  const hearts = root.querySelector("#heart-summary") || document.getElementById("heart-summary");
  if (rating) rating.textContent = formatRating(recipe.ratingAvg, recipe.ratingCount);
  if (hearts) hearts.textContent = formatHearts(recipe.heartCount);
}

function ensureJsonLd(recipe) {
  const origin = window.GRANNY_RECIPES_CONFIG?.SITE_ORIGIN || location.origin;
  const base = window.GRANNY_RECIPES_CONFIG?.BASE_PATH || "/";
  const pageUrl = recipe.sample
    ? `${origin}${base}recipes/${recipe.slug}/`
    : `${origin}${base}recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
  const image = recipe.photo
    ? (recipe.photo.startsWith("data:") ? undefined : new URL(recipe.photo, `${origin}${base}`).href)
    : undefined;
  const data = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.story || recipe.title,
    image,
    recipeCategory: recipe.category,
    recipeYield: `${recipe.servings} servings`,
    prepTime: isoDuration(recipe.prepMinutes) || undefined,
    cookTime: isoDuration(recipe.cookMinutes) || undefined,
    totalTime: isoDuration(recipe.prepMinutes + recipe.cookMinutes) || undefined,
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.steps.map((text) => ({ "@type": "HowToStep", text })),
    author: recipe.sample || !recipe.authorName
      ? { "@type": "Organization", name: "Granny Recipes" }
      : { "@type": "Person", name: recipe.authorName },
    url: pageUrl
  };
  if (recipe.ratingCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: recipe.ratingAvg,
      ratingCount: recipe.ratingCount,
      bestRating: 5,
      worstRating: 1
    };
  }
  let script = document.getElementById("recipe-jsonld");
  if (!script) {
    script = document.createElement("script");
    script.id = "recipe-jsonld";
    script.type = "application/ld+json";
    document.head.append(script);
  }
  script.textContent = safeJsonLd(data);
}

function mountActions(adapter, recipe, session) {
  const slot = document.getElementById("recipe-actions");
  if (!slot) return;
  const heart = el("button", { type: "button", class: "heart", "aria-pressed": recipe.heartedByMe ? "true" : "false" }, [
    el("span", { "aria-hidden": "true", class: "heart-mark" }, recipe.heartedByMe ? "♥" : "♡"),
    el("span", { class: "heart-label" }, recipe.heartedByMe ? "Saved" : "Save"),
    el("span", { class: "count" }, String(recipe.heartCount))
  ]);
  heart.addEventListener("click", async () => {
    if (!session) {
      location.href = loginHref();
      return;
    }
    heart.disabled = true;
    try {
      const result = await adapter.toggleHeart(recipe.slug);
      recipe.heartedByMe = result.hearted;
      recipe.heartCount = result.count;
      heart.setAttribute("aria-pressed", result.hearted ? "true" : "false");
      heart.querySelector(".heart-mark").textContent = result.hearted ? "♥" : "♡";
      heart.querySelector(".heart-label").textContent = result.hearted ? "Saved" : "Save";
      heart.querySelector(".count").textContent = String(result.count);
      const summary = document.getElementById("heart-summary");
      if (summary) summary.textContent = formatHearts(result.count);
    } catch (error) {
      alert(friendlyError(error));
    } finally {
      heart.disabled = false;
    }
  });

  const printFull = el("button", { type: "button" }, "Print recipe");
  const printList = el("button", { type: "button" }, "Print ingredients only");
  printFull.addEventListener("click", () => doPrint("full"));
  printList.addEventListener("click", () => doPrint("ingredients"));

  const rateBox = el("form", { class: "rate-box", id: "rate-form" }, [
    el("fieldset", { class: "rate" }, [
      el("legend", {}, "Rate this recipe"),
      ...[1, 2, 3, 4, 5].flatMap((value) => {
        const id = `star-${value}`;
        const input = el("input", { type: "radio", name: "stars", id, value: String(value) });
        if (recipe.myRating === value) input.checked = true;
        const label = el("label", { for: id }, [el("span", { class: "sr-only" }, `${value} ${value === 1 ? "star" : "stars"}`)]);
        return [input, label];
      })
    ]),
    el("p", { class: "hint", id: "rate-hint" }, session
      ? (recipe.myRating ? "Your rating is saved. Choosing another star replaces it." : "One rating per person. You can change it later.")
      : "Sign in to rate.")
  ]);
  const rateForm = rateBox;
  armForm(rateForm);
  paintStars(rateForm);
  rateForm.addEventListener("change", async () => {
    if (!session) {
      location.href = loginHref();
      return;
    }
    paintStars(rateForm);
    const stars = Number(new FormData(rateForm).get("stars"));
    try {
      const result = await adapter.setRating(recipe.slug, stars);
      recipe.ratingAvg = result.average;
      recipe.ratingCount = result.count;
      recipe.myRating = result.userRating;
      const summary = document.getElementById("rating-summary");
      if (summary) summary.textContent = formatRating(result.average, result.count);
      document.getElementById("rate-hint").textContent = "Your rating is saved. Choosing another star replaces it.";
      paintStars(rateForm);
      ensureJsonLd({ ...recipe });
    } catch (error) {
      document.getElementById("rate-hint").textContent = friendlyError(error);
    }
  });

  const tools = [];
  if (session?.isOwner || (session && recipe.authorId === session.id && !recipe.sample)) {
    if (session.isOwner) {
      const hide = el("button", { type: "button" }, recipe.hidden ? "Unhide recipe" : "Hide recipe");
      hide.addEventListener("click", async () => {
        if (!confirm(recipe.hidden ? "Show this recipe again?" : "Hide this recipe from the public kitchen?")) return;
        await adapter.setRecipeHidden(recipe.slug, !recipe.hidden);
        location.reload();
      });
      tools.push(hide);
    }
    const remove = el("button", { type: "button" }, "Delete recipe");
    remove.addEventListener("click", async () => {
      if (!confirm("Delete this recipe? This cannot be undone.")) return;
      await adapter.deleteRecipe(recipe.slug);
      location.href = "index.html";
    });
    tools.push(remove);
  }

  const report = el("button", { type: "button", class: "linkish" }, "Report");
  report.addEventListener("click", () => openReport(adapter, session, {
    targetType: "recipe",
    targetId: recipe.slug,
    recipeSlug: recipe.slug,
    loginHref: loginHref()
  }));

  slot.replaceChildren(
    el("div", { class: "action-row no-print" }, [heart, printFull, printList, report, ...tools]),
    rateBox
  );
  rateBox.classList.add("no-print");
}

function paintStars(form) {
  const value = Number(new FormData(form).get("stars") || 0);
  [...form.querySelectorAll(".rate label")].forEach((label, index) => {
    label.classList.toggle("is-on", index < value);
  });
}

function doPrint(mode) {
  document.body.dataset.print = mode;
  const done = () => {
    if (!document.body.dataset.preview) delete document.body.dataset.print;
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}

function applyPreview() {
  const preview = new URLSearchParams(location.search).get("preview");
  if (preview === "print" || preview === "full" || preview === "ingredients") {
    const mode = preview === "ingredients" ? "ingredients" : "full";
    document.body.dataset.preview = mode;
    document.body.dataset.print = mode;
    const bar = document.getElementById("preview-bar");
    if (bar) {
      bar.hidden = false;
      bar.textContent = "";
      const back = document.createElement("a");
      const url = new URL(location.href);
      url.searchParams.delete("preview");
      back.href = `${url.pathname}${url.search}`;
      back.textContent = "Back to recipe";
      bar.append("Print preview. ", back);
    }
  }
}

async function mountComments(adapter, recipe, session) {
  const slot = document.getElementById("comments");
  if (!slot) return;
  const comments = await adapter.listComments(recipe.slug);
  const list = el("div", { id: "comment-list" });
  renderCommentList(list, comments, adapter, session, recipe);
  const form = commentForm(adapter, recipe, session);
  slot.replaceChildren(
    el("h2", {}, "Comments"),
    list,
    form
  );
}

function renderCommentList(list, comments, adapter, session, recipe) {
  if (!comments.length) {
    list.replaceChildren(el("p", { class: "empty" }, "No comments yet. If you cook this, tell us how it went."));
    return;
  }
  list.replaceChildren(...comments.map((comment) => commentCard(comment, adapter, session, recipe, list)));
}

function commentCard(comment, adapter, session, recipe, list) {
  const tools = [];
  if (session?.isOwner) {
    const hide = el("button", { type: "button", class: "linkish" }, comment.hidden ? "Unhide" : "Hide");
    hide.addEventListener("click", async () => {
      await adapter.setCommentHidden(comment.id, !comment.hidden);
      const comments = await adapter.listComments(recipe.slug);
      renderCommentList(list, comments, adapter, session, recipe);
    });
    tools.push(hide);
  }
  if (session?.isOwner || comment.mine) {
    const remove = el("button", { type: "button", class: "linkish" }, "Delete");
    remove.addEventListener("click", async () => {
      if (!confirm("Delete this comment?")) return;
      await adapter.deleteComment(comment.id);
      const comments = await adapter.listComments(recipe.slug);
      renderCommentList(list, comments, adapter, session, recipe);
    });
    tools.push(remove);
  }
  const report = el("button", { type: "button", class: "linkish" }, "Report");
  report.addEventListener("click", () => openReport(adapter, session, {
    targetType: "comment",
    targetId: comment.id,
    recipeSlug: recipe.slug,
    loginHref: loginHref()
  }));
  return el("article", { class: `comment${comment.hidden ? " is-hidden" : ""}` }, [
    el("header", {}, [
      el("strong", {}, comment.authorName || "Cook"),
      " · ",
      el("time", { datetime: comment.createdAt }, formatWhen(comment.createdAt)),
      comment.hidden ? el("span", { class: "badge" }, "Hidden") : null
    ]),
    el("p", {}, comment.body),
    el("p", { class: "comment-tools no-print" }, [report, ...tools])
  ]);
}

function commentForm(adapter, recipe, session) {
  if (!session) {
    return el("p", {}, [
      el("a", { href: loginHref() }, "Sign in to comment")
    ]);
  }
  const error = el("p", { class: "form-error", role: "alert" });
  const form = el("form", { id: "comment-form" }, [
    el("label", { for: "comment-body" }, "Add a comment"),
    el("textarea", { id: "comment-body", name: "body", required: true, maxlength: "2000", rows: "4" }),
    el("p", { class: "hp", "aria-hidden": "true" }, [
      el("label", {}, ["Website", el("input", { name: "website", tabindex: "-1", autocomplete: "off" })])
    ]),
    el("button", { type: "submit" }, "Post comment"),
    error
  ]);
  armForm(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await adapter.addComment(recipe.slug, new FormData(form).get("body"), readFormMeta(form));
      form.reset();
      armForm(form);
      const comments = await adapter.listComments(recipe.slug);
      renderCommentList(document.getElementById("comment-list"), comments, adapter, session, recipe);
    } catch (err) {
      error.textContent = friendlyError(err);
    } finally {
      button.disabled = false;
    }
  });
  return form;
}

function openReport(adapter, session, target) {
  if (!session) {
    location.href = target.loginHref;
    return;
  }
  const existing = document.getElementById("report-dialog");
  existing?.remove();
  const error = el("p", { class: "form-error", role: "alert" });
  const form = el("form", {}, [
    el("label", { for: "report-reason" }, "Reason"),
    el("select", { id: "report-reason", name: "reason", required: true }, [
      el("option", { value: "" }, "Choose a reason"),
      ...REPORT_REASONS.map((reason) => el("option", { value: reason }, reason))
    ]),
    el("label", { for: "report-note" }, "Note (optional)"),
    el("textarea", { id: "report-note", name: "note", maxlength: "1000", rows: "3" }),
    el("p", { class: "hp", "aria-hidden": "true" }, [
      el("label", {}, ["Company", el("input", { name: "company", tabindex: "-1", autocomplete: "off" })])
    ]),
    el("div", { class: "action-row" }, [
      el("button", { type: "submit" }, "Send report"),
      el("button", { type: "button", id: "close-report", class: "button-quiet" }, "Cancel")
    ]),
    error
  ]);
  armForm(form);
  const dialog = el("dialog", { id: "report-dialog" }, [
    el("h2", {}, "Report this"),
    el("p", {}, "Reports go to the kitchen owner. This is not a public comment."),
    form
  ]);
  document.body.append(dialog);
  dialog.querySelector("#close-report").addEventListener("click", () => dialog.close());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    const data = new FormData(form);
    try {
      await adapter.report({
        targetType: target.targetType,
        targetId: target.targetId,
        recipeSlug: target.recipeSlug,
        reason: data.get("reason"),
        note: data.get("note")
      }, readFormMeta(form));
      dialog.replaceChildren(el("h2", {}, "Report sent"), el("p", {}, "Thank you. The owner can review it."), el("button", { type: "button", id: "done-report" }, "Close"));
      dialog.querySelector("#done-report").addEventListener("click", () => dialog.close());
    } catch (err) {
      error.textContent = friendlyError(err);
    }
  });
  dialog.showModal();
}
