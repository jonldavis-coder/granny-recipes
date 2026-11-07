// Granny's Kitchen Shop
// Prices below are placeholders, not an offer and not final.
// Leave each stripePaymentLink empty until you create a Stripe Payment Link.
// An empty slot shows "Coming soon / Notify me" and opens a mailto.
//
// PDF checkout pattern:
// In the Stripe Payment Link for the cookbook PDF, set the success URL to:
// https://jonldavis-coder.github.io/granny-recipes/shop/thank-you.html?product=cookbook&format=pdf&session_id={CHECKOUT_SESSION_ID}
// Then set the pdf format's downloadUrl to the PDF file (see README).
// A static GitHub Pages file is not a secret. Use an unguessable name,
// or host the file somewhere that can require a real check, before launch.
window.GRANNY_SHOP_CONFIG = {
  openingSoon: true,
  pricesAreFinal: false,
  notifyEmail: "",
  products: [
    {
      id: "recipe-cards",
      name: "Recipe card packs",
      page: "shop/recipe-cards/",
      formats: [
        {
          id: "pack-25",
          name: "4×6 inch cards, pack of 25",
          pricePlaceholder: "12",
          stripePaymentLink: ""
        },
        {
          id: "pack-50",
          name: "4×6 inch cards, pack of 50",
          pricePlaceholder: "20",
          stripePaymentLink: ""
        }
      ]
    },
    {
      id: "recipe-card-box",
      name: "Recipe card box",
      page: "shop/recipe-card-box/",
      formats: [
        {
          id: "box",
          name: "Recipe card box",
          pricePlaceholder: "24",
          stripePaymentLink: ""
        }
      ]
    },
    {
      id: "gift-set",
      name: "Gift set",
      page: "shop/gift-set/",
      formats: [
        {
          id: "gift",
          name: "Box plus a pack of 25 cards",
          pricePlaceholder: "34",
          stripePaymentLink: ""
        }
      ]
    },
    {
      id: "cookbook",
      name: "The Granny Recipes Book",
      page: "shop/cookbook/",
      formats: [
        {
          id: "pdf",
          name: "PDF download",
          pricePlaceholder: "16",
          stripePaymentLink: "",
          delivery: "download",
          downloadUrl: "",
          thankYouPath: "shop/thank-you.html?product=cookbook&format=pdf&session_id={CHECKOUT_SESSION_ID}"
        },
        {
          id: "hardcopy",
          name: "Mailed hardcopy",
          pricePlaceholder: "28",
          stripePaymentLink: "",
          delivery: "mail",
          thankYouPath: "shop/thank-you.html?product=cookbook&format=hardcopy&session_id={CHECKOUT_SESSION_ID}"
        }
      ]
    }
  ]
};
