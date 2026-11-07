# Granny Recipes

A warm, readable cookbook where people can browse recipes and, with an account, post their own. Sample recipes are generic home-cooking notes labeled **Sample recipe**. Pictures on those recipes, and in the shop, are illustrations made for this site.

The live site is a static GitHub Pages project:

**https://jonldavis-coder.github.io/granny-recipes/**

Anyone can read. Posting, comments, hearts, and star ratings need an account (email and password, or a magic link).

Until Supabase is connected, a banner says: **Demo mode: your posts are saved only in this browser.**

## Pages

- Home: search, categories (Breakfast, Mains, Sides, Soups, Breads, Desserts, Holidays), and a minimum-rating filter. Unrated recipes stay hidden while a minimum is set.
- Recipe pages: ingredients, numbered steps, one star rating per person, a favorite heart with a count, comments, and report.
- Print: **Print recipe** and **Print ingredients only** (a shopping list). Print CSS drops the navigation, footer, and comments.
- Post a recipe: title, optional granny name or story, optional photo, prep time, cook time, servings, ingredients, and steps.
- Accounts: email and password, or a one-time sign-in link.
- Moderation: report button on recipes and comments. The owner can hide or delete them.
- Shop: [Granny's Kitchen Shop](shop/) is marked **Opening soon**. Prices are placeholders, not final.
- About, community guidelines, draft Privacy, draft Terms, and a 404 page.

Spam protection on posts, comments, reports, and sign-in: a hidden honeypot field, a short pause before the first submit, length limits, link limits, duplicate checks, and rate limits. Supabase enforces the same write limits in the database.

## Run it locally

GitHub Pages serves this project at `/granny-recipes/`, and the HTML uses that base path. Preview it the same way:

```bash
npm run preview
```

Open http://127.0.0.1:4173/granny-recipes/

`npm test` rebuilds the recipe pages and runs the checks.

## Demo mode

Leave `SUPABASE_URL` and `SUPABASE_ANON_KEY` empty in [`config.js`](config.js). The site stores accounts and recipes in `localStorage`.

Passwords are hashed in the browser. That only keeps them from sitting in plain text. Anyone with access to the browser profile can still read the storage. Demo mode is for trying the kitchen, not for a private multi-user site.

To try moderation in demo mode, set `OWNER_EMAIL` in `config.js` to the email you sign up with, then reload and sign in. Open **Moderate** in the header.

Sample recipes live in [`assets/js/seed.js`](assets/js/seed.js). Hiding one in demo mode hides it in that browser. Removing it from the public site means deleting it from the seed and running `npm run build`.

## Switch on Supabase

The site uses Supabase when both slots in `config.js` are filled with a real `https://` project URL and an anon key of at least 20 characters. If the library cannot start, the site falls back to demo mode and says so.

Do this in order:

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql) all the way through. It creates tables, row level security, rate-limit triggers, the `recipe-photos` storage bucket, and photo policies.
3. In Authentication → Providers, keep Email enabled so people can use a password or a magic link.
4. In Authentication → URL configuration, set:
   - Site URL: `https://jonldavis-coder.github.io/granny-recipes/`
   - Redirect URL: `https://jonldavis-coder.github.io/granny-recipes/login.html`
5. In Project Settings → API, copy the project URL and the **anon public** key into `config.js`:

   ```js
   SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
   SUPABASE_ANON_KEY: "YOUR-ANON-KEY"
   ```

   Never put the service-role key in `config.js` or anywhere in this repository. The anon key is public. The SQL policies are what protect data.
6. Commit and push `config.js` to `main`. GitHub Pages publishes the root of `main`.
7. Create your account on the live site (confirm the email if Supabase asks you to).
8. In the SQL editor, make that account the owner:

   ```sql
   insert into public.owners (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

   Owner tools use `public.am_i_owner()`, not `OWNER_EMAIL`. `OWNER_EMAIL` applies only to demo mode.

After that, new recipes, comments, hearts, ratings, reports, and photos are shared. Sample recipes still come from `assets/js/seed.js` unless you hide one, which writes a row in `recipe_flags`. Photos upload to the `recipe-photos` bucket under the signed-in user's id.

Sign-up stores a display name in user metadata. The `handle_new_user` trigger copies it onto `profiles`. Public pages show that name, not the email address.

## Granny's Kitchen Shop

The shop is **opening soon**. Nothing in the committed config is a final price or a live checkout.

Edit [`assets/js/shop-config.js`](assets/js/shop-config.js):

| Field | What to put there |
| --- | --- |
| `openingSoon` | Leave `true` until you are ready to take orders. The banner stays up while this is true. |
| `pricesAreFinal` | Leave `false`. Prices are labeled "Placeholder price …, not final" until this is `true` **and** `openingSoon` is `false`. |
| `notifyEmail` | The address for "Coming soon / Notify me". An empty value still opens the visitor's email app. |
| `pricePlaceholder` | A stand-in amount such as `"12"`. It is not an offer. |
| `stripePaymentLink` | Leave `""` until you create a [Stripe Payment Link](https://stripe.com/payments/payment-links). An empty or non-https slot shows **Coming soon / Notify me**, which is a `mailto:` link. A filled `https://` link shows **Continue to checkout**. |

Products and formats:

- Recipe card packs: 4×6 inch cards, pack of 25 and pack of 50
- Recipe card box
- Gift set: the box plus a pack of 25 cards
- The Granny Recipes Book: a 200-page spiral-bound cookbook, as a PDF download or a mailed hardcopy

### PDF thank-you page

Static hosting cannot run a private download check. The pattern is:

1. Create a Stripe Payment Link for the PDF format.
2. Set its success URL to the value of `thankYouPath` on that format:

   `https://jonldavis-coder.github.io/granny-recipes/shop/thank-you.html?product=cookbook&format=pdf&session_id={CHECKOUT_SESSION_ID}`

3. Put the Payment Link URL in `stripePaymentLink`.
4. When you are ready to hand out the file, set `downloadUrl` to that file. The thank-you page then shows **Download the PDF**. Until `downloadUrl` is set, the page tells the buyer the file is not published yet.
5. Use a hard-to-guess file name. A file committed to this public repository can be downloaded by anyone who knows the URL. For a real launch, host the PDF somewhere that can expire links, or accept that the URL is the only lock.

The hardcopy format uses the same thank-you page with `format=hardcopy`. This site does not mail packages. Fulfill those orders from the Stripe dashboard.

Mailed cards, the box, and the gift set work the same way: paste a Payment Link when you are ready, and pack the order yourself.

## Advertising

Ads are off. [`assets/js/ads-config.js`](assets/js/ads-config.js) sets `provider` to `none`, so the slot containers are not rendered and do not reserve height. The cookie-consent banner stays off until that provider changes. [`ads.txt`](ads.txt) is a commented placeholder.

Slots, when a provider is on: below the recipe intro, between steps on long recipes (6 steps or more), a desktop sidebar, a dismissible mobile footer, and one browse-grid slot after every 6 cards. They never appear on the print view, the ingredients list print, the post form, the login page, or shop checkout (including the thank-you page).

To preview empty positions, open a page with `?adsDebug=1`. Outlines show, and no ad script loads. To turn ads on later, set `provider` to `"adsense"`, fill `adsense.publisherId` (`ca-pub-…`) and the slot IDs, uncomment the line in `ads.txt`, and use the real publisher ID there. Visitors then see the consent banner before any ad script loads.

Affiliate links are also off. Add them under `affiliates.links` with `enabled: true`. The helper writes `rel="sponsored nofollow"` and a disclosure line only on recipes that use a link. The footer links to the [Affiliate & Advertising Disclosure](disclosure.html).

## Rebuild pages

Recipe HTML, the sitemap, and illustrations are generated:

```bash
npm run build
```

Edit copy in `scripts/build-site.mjs` and recipes in `assets/js/seed.js`, then rebuild and commit the HTML.

## Food safety

Recipes are home notes. They are not professional food-safety advice. Cook meat and leftovers the way you trust, and use your own judgment.
