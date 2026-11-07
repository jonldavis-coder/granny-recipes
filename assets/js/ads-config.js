// Advertising and affiliate settings.
// provider "none" renders no slots and reserves no height.
// Set provider to "adsense" only when the publisher ID and slot IDs are real.
// Add ?adsDebug=1 to a page URL to outline empty slot positions without loading ads.
window.GRANNY_ADS_CONFIG = {
  provider: "none",
  debug: false,
  longRecipeMinSteps: 6,
  gridEvery: 6,
  heights: {
    recipeIntro: 100,
    recipeSteps: 100,
    sidebar: 280,
    mobileFooter: 64,
    browseGrid: 100
  },
  adsense: {
    publisherId: "",
    slots: {
      recipeIntro: "",
      recipeSteps: "",
      sidebar: "",
      mobileFooter: "",
      browseGrid: ""
    }
  },
  // The consent banner stays off while provider is "none".
  // It turns on automatically when a real ad provider is selected.
  consent: {
    enabled: false,
    storageKey: "granny-ads-consent"
  },
  affiliates: {
    enabled: false,
    disclosure: "Some links on this page are affiliate links. If you buy through them, we may earn a small commission, at no extra cost to you.",
    links: [
      // { href: "https://example.com/item", label: "Example tool", recipes: ["cast-iron-peach-cobbler"] }
    ]
  }
};
