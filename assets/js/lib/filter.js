export function filterRecipes(recipes, { query = "", category = "All", minRating = 0 } = {}) {
  const q = String(query || "").trim().toLowerCase();
  const minimum = Number(minRating) || 0;
  return (recipes || []).filter((recipe) => {
    if (category && category !== "All" && recipe.category !== category) return false;
    if (minimum > 0 && (!(recipe.ratingCount > 0) || Number(recipe.ratingAvg) < minimum)) return false;
    if (!q) return true;
    const haystack = [
      recipe.title,
      recipe.story,
      recipe.category,
      ...(recipe.ingredients || []),
      ...(recipe.steps || [])
    ]
      .join("\n")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function sortRecipes(recipes) {
  return [...(recipes || [])].sort((a, b) => {
    if (Boolean(a.sample) !== Boolean(b.sample)) return a.sample ? 1 : -1;
    if (!a.sample) return new Date(b.createdAt) - new Date(a.createdAt);
    return (a.order ?? 0) - (b.order ?? 0);
  });
}
