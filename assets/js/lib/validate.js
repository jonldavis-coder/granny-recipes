import { CATEGORIES } from "../categories.js";

const LINK_PATTERN = /https?:\/\/|www\./gi;

export function countLinks(text) {
  return (String(text || "").match(LINK_PATTERN) || []).length;
}

function cleanLines(list, { maxItems, maxLen, label }) {
  if (!Array.isArray(list)) {
    return { ok: false, message: `Add ${label}.` };
  }
  const lines = list.map((item) => String(item || "").trim()).filter(Boolean);
  if (!lines.length) return { ok: false, message: `Add at least one ${label}.` };
  if (lines.length > maxItems) return { ok: false, message: `Use ${maxItems} ${label} or fewer.` };
  if (lines.some((line) => line.length > maxLen)) {
    return { ok: false, message: `Each ${label} entry must be ${maxLen} characters or fewer.` };
  }
  return { ok: true, lines };
}

export function validateRecipe(input) {
  const title = String(input?.title || "").trim();
  const story = String(input?.story || "").trim();
  const category = String(input?.category || "").trim();
  const prepMinutes = Number(input?.prepMinutes);
  const cookMinutes = Number(input?.cookMinutes);
  const servings = Number(input?.servings);

  if (title.length < 3) return { ok: false, message: "Give the recipe a title of at least 3 characters." };
  if (title.length > 120) return { ok: false, message: "Keep the title to 120 characters or fewer." };
  if (countLinks(title) > 0) return { ok: false, message: "Put the title in words, without a web link." };
  if (story.length > 2000) return { ok: false, message: "Keep the story to 2000 characters or fewer." };
  if (countLinks(story) > 2) return { ok: false, message: "Keep the story to two links or fewer." };
  if (!CATEGORIES.includes(category)) return { ok: false, message: "Choose a category." };
  if (!Number.isInteger(prepMinutes) || prepMinutes < 0 || prepMinutes > 1440) {
    return { ok: false, message: "Enter prep time in whole minutes, from 0 to 1440." };
  }
  if (!Number.isInteger(cookMinutes) || cookMinutes < 0 || cookMinutes > 1440) {
    return { ok: false, message: "Enter cook time in whole minutes, from 0 to 1440." };
  }
  if (prepMinutes + cookMinutes < 1) return { ok: false, message: "Enter a prep time or a cook time." };
  if (!Number.isInteger(servings) || servings < 1 || servings > 100) {
    return { ok: false, message: "Enter servings from 1 to 100." };
  }

  const ingredients = cleanLines(input?.ingredients, { maxItems: 40, maxLen: 200, label: "ingredient" });
  if (!ingredients.ok) return ingredients;
  const steps = cleanLines(input?.steps, { maxItems: 30, maxLen: 1000, label: "step" });
  if (!steps.ok) return steps;

  return {
    ok: true,
    value: {
      title,
      story,
      category,
      prepMinutes,
      cookMinutes,
      servings,
      ingredients: ingredients.lines,
      steps: steps.lines
    }
  };
}

export function validateComment(body) {
  const text = String(body || "").trim();
  if (text.length < 2) return { ok: false, message: "Write a comment of at least 2 characters." };
  if (text.length > 2000) return { ok: false, message: "Keep the comment to 2000 characters or fewer." };
  if (countLinks(text) > 2) return { ok: false, message: "Keep the comment to two links or fewer." };
  if (/^(https?:\/\/|www\.)\S+$/i.test(text)) {
    return { ok: false, message: "Write a comment in words. A bare link is not enough." };
  }
  return { ok: true, value: text };
}

export function validateReport({ reason, note }) {
  const why = String(reason || "").trim();
  const extra = String(note || "").trim();
  const allowed = ["Spam", "Harassment", "Dangerous instructions", "Not a recipe", "Other"];
  if (!allowed.includes(why)) return { ok: false, message: "Choose a reason." };
  if (extra.length > 1000) return { ok: false, message: "Keep the note to 1000 characters or fewer." };
  if (countLinks(extra) > 2) return { ok: false, message: "Keep the note to two links or fewer." };
  return { ok: true, value: { reason: why, note: extra } };
}

export function validateEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 120) {
    return { ok: false, message: "Enter a valid email address." };
  }
  return { ok: true, value };
}

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8) return { ok: false, message: "Use a password of at least 8 characters." };
  if (value.length > 200) return { ok: false, message: "That password is too long." };
  return { ok: true, value };
}

export function validateDisplayName(name, email) {
  const fallback = String(email || "cook").split("@")[0].replace(/[^a-zA-Z0-9 ._-]/g, "").slice(0, 40) || "Cook";
  const value = String(name || "").trim().replace(/\s+/g, " ");
  if (!value) return { ok: true, value: fallback };
  if (value.length > 40) return { ok: false, message: "Keep the display name to 40 characters or fewer." };
  if (countLinks(value) > 0) return { ok: false, message: "Display names cannot contain links." };
  return { ok: true, value };
}

export function safeNextPath(next, basePath) {
  const value = String(next || "").trim();
  if (!value) return `${basePath}index.html`;
  if (value.startsWith("//") || value.includes("\\") || value.includes("://")) return `${basePath}index.html`;
  const base = basePath.endsWith("/") ? basePath : `${basePath}/`;
  if (value.startsWith(base)) return value;
  if (value.startsWith("/")) return `${basePath}index.html`;
  if (!/^[a-zA-Z0-9/_.?=&%-]+$/.test(value)) return `${basePath}index.html`;
  return `${base}${value.replace(/^\.\//, "")}`;
}
