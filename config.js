// Site configuration.
// Leave SUPABASE_URL and SUPABASE_ANON_KEY empty to stay in demo mode.
// When both are filled in, the site uses Supabase for accounts, recipes,
// comments, hearts, ratings, reports, and photos.
// Never put the service-role key in this file. The anon key is public by design.
window.GRANNY_RECIPES_CONFIG = {
  BASE_PATH: "/granny-recipes/",
  SITE_ORIGIN: "https://jonldavis-coder.github.io",
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  // Demo mode only: the account with this email can hide and delete.
  // For Supabase, owner access comes from the public.owners table (see README).
  OWNER_EMAIL: ""
};
