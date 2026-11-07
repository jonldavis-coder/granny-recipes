import { CATEGORIES } from "../categories.js";
import { armForm, readFormMeta } from "../lib/human.js";
import { el, friendlyError } from "../lib/dom.js";

export async function init(adapter) {
  const form = document.getElementById("post-form");
  if (!form) return;
  armForm(form);
  const session = await adapter.getSession();
  const note = document.getElementById("post-auth-note");
  if (!session && note) {
    note.hidden = false;
    note.textContent = "";
    note.append("Sign in before you post. The form stays here so you can look it over. ", el("a", { href: "login.html?next=post.html" }, "Sign in"));
  }
  wireRepeater(form.querySelector("#ingredients"), "ingredient", "2 cups flour");
  wireRepeater(form.querySelector("#steps"), "step", "Heat the oven.", true);
  const photo = form.querySelector("#photo");
  const preview = form.querySelector("#photo-preview");
  photo?.addEventListener("change", () => {
    const file = photo.files?.[0];
    if (!file) {
      preview.hidden = true;
      preview.removeAttribute("src");
      return;
    }
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
    preview.alt = "Selected recipe photo preview";
  });

  const error = document.getElementById("post-error");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";
    if (!session) {
      location.href = "login.html?next=post.html";
      return;
    }
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const data = new FormData(form);
      const ingredients = [...form.querySelectorAll("[name=ingredient]")].map((input) => input.value);
      const steps = [...form.querySelectorAll("[name=step]")].map((input) => input.value);
      let photoBlob = null;
      const file = photo?.files?.[0];
      if (file) photoBlob = await resizeImage(file);
      let photoDataUrl = "";
      if (photoBlob && adapter.mode === "demo") photoDataUrl = await blobToDataUrl(photoBlob);
      const recipe = await adapter.createRecipe({
        title: data.get("title"),
        story: data.get("story"),
        category: data.get("category"),
        prepMinutes: Number(data.get("prep")),
        cookMinutes: Number(data.get("cook")),
        servings: Number(data.get("servings")),
        ingredients,
        steps,
        photoBlob,
        photoDataUrl
      }, readFormMeta(form));
      location.href = `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
    } catch (err) {
      error.textContent = friendlyError(err);
      button.disabled = false;
    }
  });

  const select = form.querySelector("#category");
  if (select && select.options.length < 2) {
    select.replaceChildren(
      el("option", { value: "" }, "Choose a category"),
      ...CATEGORIES.map((category) => el("option", { value: category }, category))
    );
  }
}

function wireRepeater(list, name, placeholder, multiline) {
  const add = list.parentElement.querySelector(".add-row");
  const make = () => {
    const index = list.children.length + 1;
    const field = multiline
      ? el("textarea", { name, required: true, maxlength: "1000", rows: "3", placeholder })
      : el("input", { name, type: "text", required: true, maxlength: "200", placeholder });
    const id = `${name}-${index}-${Math.random().toString(36).slice(2, 6)}`;
    field.id = id;
    const label = el("label", { class: "sr-only", for: id }, `${multiline ? "Step" : "Ingredient"} ${index}`);
    const remove = el("button", { type: "button", class: "button-quiet remove-row" }, "Remove");
    remove.addEventListener("click", () => {
      if (list.children.length === 1) {
        field.value = "";
        return;
      }
      remove.parentElement.remove();
    });
    return el("li", {}, [label, field, remove]);
  };
  if (!list.children.length) list.append(make());
  list.querySelectorAll(".remove-row").forEach((button) => {
    button.addEventListener("click", () => {
      if (list.children.length === 1) {
        const field = button.parentElement.querySelector("input, textarea");
        if (field) field.value = "";
        return;
      }
      button.parentElement.remove();
    });
  });
  add?.addEventListener("click", () => list.append(make()));
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(Object.assign(new Error("Choose an image file."), { code: "validation" }));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(Object.assign(new Error("That image is larger than 8 MB."), { code: "validation" }));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 1000;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) reject(new Error("Could not read that image."));
        else resolve(blob);
      }, "image/jpeg", 0.72);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Object.assign(new Error("Could not read that image."), { code: "validation" }));
    };
    image.src = url;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(blob);
  });
}
