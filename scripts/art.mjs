function svg(title, desc, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">${desc}</desc>
  <rect width="800" height="520" rx="28" fill="#f6e6d0"/>
  <rect y="330" width="800" height="190" fill="#e7c79a"/>
  <ellipse cx="400" cy="360" rx="250" ry="28" fill="#d7b184"/>
  ${body}
</svg>
`;
}

export const illustrations = {
  "assets/images/recipes/flaky-buttermilk-biscuits.svg": svg(
    "Flaky buttermilk biscuits",
    "Illustration of golden biscuits on a plate.",
    `<ellipse cx="400" cy="300" rx="170" ry="36" fill="#fffaf3" stroke="#e4d3c0" stroke-width="8"/>
     <g fill="#f0b15a" stroke="#c47d32" stroke-width="4">
       <ellipse cx="330" cy="250" rx="62" ry="40"/>
       <ellipse cx="430" cy="246" rx="66" ry="42"/>
       <ellipse cx="380" cy="200" rx="60" ry="38"/>
     </g>
     <path d="M350 188c10 16 30 16 40 0" fill="none" stroke="#a86428" stroke-width="4"/>`
  ),
  "assets/images/recipes/chicken-noodle-soup.svg": svg(
    "Chicken noodle soup",
    "Illustration of a bowl of noodle soup with carrots.",
    `<ellipse cx="400" cy="300" rx="150" ry="48" fill="#f4f7fb"/>
     <path d="M270 280c20 80 240 80 260 0" fill="#f7e7b2" stroke="#d7b56a" stroke-width="8"/>
     <path d="M320 300c20 10 30-10 50 0s30 10 50 0 30-10 50 0" fill="none" stroke="#e7c56a" stroke-width="6"/>
     <circle cx="340" cy="290" r="12" fill="#e07a3d"/>
     <circle cx="430" cy="305" r="12" fill="#e07a3d"/>
     <path d="M360 210c8-20 8-20 0-36M410 200c10-22 8-22 0-40M450 214c8-18 6-18-2-34" fill="none" stroke="#c9d4de" stroke-width="4"/>`
  ),
  "assets/images/recipes/deep-dish-apple-pie.svg": svg(
    "Deep-dish apple pie",
    "Illustration of a lattice apple pie.",
    `<ellipse cx="400" cy="320" rx="180" ry="46" fill="#c9844a"/>
     <path d="M230 300c10 70 330 70 340 0" fill="#e0a15d" stroke="#b8743a" stroke-width="6"/>
     <path d="M250 250h300M250 220h300M280 190l240 110M300 190l220 110M520 190L300 300M500 190L280 300" fill="none" stroke="#f2c48a" stroke-width="10" stroke-linecap="round"/>
     <circle cx="400" cy="230" r="16" fill="#c4553a"/>`
  ),
  "assets/images/recipes/sunday-pot-roast.svg": svg(
    "Sunday pot roast",
    "Illustration of a pot roast with carrots and potatoes on a platter.",
    `<ellipse cx="400" cy="310" rx="210" ry="50" fill="#fffaf3" stroke="#e7d5c3" stroke-width="8"/>
     <ellipse cx="400" cy="250" rx="120" ry="58" fill="#8d4b3a"/>
     <ellipse cx="300" cy="280" rx="36" ry="24" fill="#e39a4a"/>
     <ellipse cx="500" cy="276" rx="34" ry="22" fill="#e39a4a"/>
     <circle cx="330" cy="250" r="28" fill="#f0d2a0"/>
     <circle cx="470" cy="246" r="26" fill="#f0d2a0"/>
     <path d="M360 230c30 16 60 16 90 0" fill="none" stroke="#6e382c" stroke-width="4"/>`
  ),
  "assets/images/recipes/skillet-creamed-corn.svg": svg(
    "Skillet creamed corn",
    "Illustration of creamed corn in a skillet.",
    `<ellipse cx="400" cy="300" rx="170" ry="48" fill="#4e4a46"/>
     <ellipse cx="400" cy="270" rx="140" ry="70" fill="#f2d56b" stroke="#e0b43a" stroke-width="6"/>
     <circle cx="350" cy="260" r="14" fill="#ffe38a"/>
     <circle cx="400" cy="280" r="14" fill="#ffe38a"/>
     <circle cx="450" cy="255" r="14" fill="#ffe38a"/>
     <rect x="560" y="180" width="18" height="90" rx="8" fill="#6b442c"/>`
  ),
  "assets/images/recipes/fluffy-breakfast-pancakes.svg": svg(
    "Fluffy breakfast pancakes",
    "Illustration of a stack of pancakes with butter.",
    `<ellipse cx="390" cy="320" rx="130" ry="28" fill="#e7b15a"/>
     <ellipse cx="390" cy="280" rx="120" ry="28" fill="#f0c27a"/>
     <ellipse cx="390" cy="242" rx="110" ry="26" fill="#f6d59a"/>
     <rect x="360" y="200" width="46" height="28" rx="6" fill="#ffe28a" stroke="#e6c15a"/>
     <path d="M470 210c20 40 10 90-10 120" fill="none" stroke="#c47a2a" stroke-width="8" stroke-linecap="round"/>`
  ),
  "assets/images/recipes/holiday-cut-out-cookies.svg": svg(
    "Holiday cut-out cookies",
    "Illustration of shaped sugar cookies on a tray.",
    `<rect x="180" y="200" width="440" height="200" rx="28" fill="#d7ebe4" stroke="#b7d2c8" stroke-width="6"/>
     <polygon points="300,300 330,240 360,300" fill="#f4d36a" stroke="#e0b43a" stroke-width="4"/>
     <circle cx="450" cy="280" r="36" fill="#f7e7c2" stroke="#e6c9a2"/>
     <path d="M520 250l18 16 22-8-10 20 16 16-22-2-10 20-8-20-22 2 16-16z" fill="#f2c1c1"/>`
  ),
  "assets/images/recipes/brown-sugar-banana-bread.svg": svg(
    "Brown sugar banana bread",
    "Illustration of a loaf of banana bread beside a banana.",
    `<path d="M250 300c20-70 180-70 220 0v40H250z" fill="#c4844a" stroke="#a86a34" stroke-width="6"/>
     <path d="M270 250c40 20 120 20 180 0" fill="none" stroke="#8d5a2b" stroke-width="6"/>
     <path d="M520 280c40-10 70 20 60 50-30 8-70-10-60-50z" fill="#f2d34b" stroke="#d2b13a" stroke-width="4"/>
     <rect x="230" y="330" width="280" height="16" rx="6" fill="#c49a6c"/>`
  ),
  "assets/images/recipes/family-style-meatloaf.svg": svg(
    "Family-style meatloaf",
    "Illustration of a glazed meatloaf on a platter.",
    `<ellipse cx="400" cy="320" rx="200" ry="40" fill="#fffaf3" stroke="#eadccb" stroke-width="8"/>
     <path d="M270 300c10-70 250-70 260 0v20H270z" fill="#a24b3b"/>
     <path d="M290 250c40 16 180 16 220 0" fill="none" stroke="#d4654a" stroke-width="10" stroke-linecap="round"/>
     <circle cx="330" cy="270" r="6" fill="#6a8f4e"/>
     <circle cx="470" cy="268" r="6" fill="#6a8f4e"/>`
  ),
  "assets/images/recipes/cast-iron-peach-cobbler.svg": svg(
    "Cast-iron peach cobbler",
    "Illustration of peach cobbler in a round skillet.",
    `<ellipse cx="400" cy="310" rx="170" ry="46" fill="#3f3b38"/>
     <ellipse cx="400" cy="280" rx="145" ry="60" fill="#f0b15c"/>
     <circle cx="340" cy="250" r="28" fill="#f6d59a" stroke="#e0b15a"/>
     <circle cx="410" cy="236" r="30" fill="#f6d59a" stroke="#e0b15a"/>
     <circle cx="470" cy="258" r="26" fill="#f6d59a" stroke="#e0b15a"/>
     <path d="M360 250c10 8 16 8 24 0M430 236c10 8 16 8 24 0" fill="none" stroke="#e07a3d" stroke-width="4"/>`
  ),
  "assets/images/shop/recipe-cards.svg": svg(
    "Recipe cards",
    "Illustration of a stack of blank recipe cards and a pencil.",
    `<g transform="translate(210 150)">
       <rect x="30" y="30" width="280" height="180" rx="10" fill="#fff" stroke="#e4d3c0" transform="rotate(-6 160 120)"/>
       <rect x="20" y="20" width="280" height="180" rx="10" fill="#fffaf3" stroke="#c47d32" stroke-width="4"/>
       <path d="M40 70h240M40 100h200M40 130h220" stroke="#e7b8b0" stroke-width="3"/>
     </g>
     <rect x="560" y="150" width="18" height="150" rx="6" fill="#e7c07a" transform="rotate(20 569 225)"/>`
  ),
  "assets/images/shop/recipe-card-box.svg": svg(
    "Recipe card box",
    "Illustration of a wooden box holding recipe cards.",
    `<path d="M230 250h340v130H230z" fill="#c4894e" stroke="#8d5a32" stroke-width="6"/>
     <path d="M230 250l40-50h340l-40 50z" fill="#e0b07a"/>
     <rect x="300" y="180" width="150" height="90" rx="6" fill="#fffaf3" stroke="#e4d3c0"/>
     <path d="M316 210h118M316 230h90" stroke="#e7b8b0"/>`
  ),
  "assets/images/shop/gift-set.svg": svg(
    "Gift set",
    "Illustration of a recipe card box tied with a ribbon, with cards beside it.",
    `<path d="M250 270h280v120H250z" fill="#c4894e" stroke="#8d5a32" stroke-width="6"/>
     <path d="M250 270l30-40h280l-30 40z" fill="#e0b07a"/>
     <path d="M390 180v210M250 320h280" stroke="#8d3f2a" stroke-width="14"/>
     <path d="M390 190c-30-40-70-20-40 10 30-30 70-10 40-10z" fill="#8d3f2a"/>
     <rect x="560" y="250" width="90" height="60" rx="6" fill="#fffaf3" stroke="#e4d3c0"/>`
  ),
  "assets/images/shop/cookbook.svg": svg(
    "The Granny Recipes Book",
    "Illustration of a spiral-bound cookbook and a wooden spoon.",
    `<rect x="230" y="140" width="300" height="250" rx="12" fill="#fffaf3" stroke="#c47d32" stroke-width="6"/>
     ${Array.from({ length: 10 }, (_, i) => `<circle cx="230" cy="${165 + i * 22}" r="7" fill="none" stroke="#8d5a32" stroke-width="3"/>`).join("")}
     <path d="M270 190h210M270 230h180M270 270h200" stroke="#e7b8b0" stroke-width="4"/>
     <rect x="560" y="160" width="16" height="150" rx="8" fill="#c4894e"/>
     <ellipse cx="568" cy="330" rx="28" ry="36" fill="#e0b07a"/>`
  ),
  "assets/images/hero.svg": svg(
    "Kitchen table",
    "Illustration of a bowl, a pie, and a cup on a kitchen table.",
    `<ellipse cx="250" cy="280" rx="90" ry="28" fill="#fffaf3"/>
     <path d="M180 270c10-50 130-50 140 0" fill="#f6d7a2" stroke="#8d3f2a" stroke-width="4"/>
     <ellipse cx="430" cy="290" rx="80" ry="24" fill="#e0a15d"/>
     <path d="M360 270h140" stroke="#f2c48a" stroke-width="8"/>
     <rect x="560" y="210" width="70" height="80" rx="10" fill="#f7f1e8" stroke="#cbbba8"/>
     <path d="M575 210c10-30 40-30 50 0" fill="none" stroke="#c9d4de" stroke-width="4"/>`
  )
};

export const favicon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#8d3f2a"/>
  <path d="M16 42c2-14 10-20 16-20s14 6 16 20" fill="#f6d7a2"/>
  <ellipse cx="32" cy="44" rx="18" ry="7" fill="#f3eee4"/>
</svg>
`;
