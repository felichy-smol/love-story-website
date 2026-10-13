/* ============================================================
   OUR LITTLE FARM  --  PERSONALIZATION FILE
   ------------------------------------------------------------
   This is the ONLY file you need to edit to make the game yours.
   Everything in [SQUARE BRACKETS] is a placeholder: replace it
   with your real words. Do not delete the quotes or commas.
   ============================================================ */

window.GAME_CONFIG = {

  /* ---- names & titles ---- */
  title: "Our Little Farm",
  subtitle: "a little world we grow together",
  farmName: "Moonberry Farm",
  playerName: "Farmer",
  recipientName: "[HER NICKNAME]",
  fromName: "[YOUR NAME]",
  milestone: "2 months together",

  /* ---- the letter shown when you start ---- */
  openingLetter: {
    title: "A letter arrived...",
    lines: [
      "Hey [HER NICKNAME],",
      "I couldn't be there in person, so I made you a little farm instead.",
      "It's a bit overgrown - I think it just needs some gentle care.",
      "Water the crops, sleep, and watch them grow. A little like us.",
      "x [YOUR NAME]"
    ]
  },

  /* ---- crop display names (shown in menus) ---- */
  cropNames: {
    carrot: "Carrots",
    strawberry: "Strawberries",
    flower: "Moonflowers"
  },

  /* ---- the seven keepsakes hidden around the farm ----
     id must stay the same (flower, heart, shell, photo,
     ribbon, key, locket). Only edit name + text. */
  collectibles: {
    flower: { name: "Pressed Flower", text: "[A MESSAGE ABOUT A FLOWER, A DATE, SPRING...]" },
    heart:  { name: "Paper Heart",    text: "[A SWEET IN-JOKE OR A COMPLIMENT YOU LOVE]" },
    shell:  { name: "Seashell",       text: "[A MEMORY ABOUT THE SEA OR A TRIP YOU TOOK]" },
    photo:  { name: "Little Photo",   text: "[A MEMORY SHE WILL RECOGNISE INSTANTLY]" },
    ribbon: { name: "Lost Ribbon",    text: "[A FUNNY OR TENDER LITTLE MOMENT]" },
    key:    { name: "Mysterious Key", text: "[SOMETHING ABOUT TRUST, OR OPENING UP]" },
    locket: { name: "Keepsake",       text: "[ONE THING YOU LOVE ABOUT HER]" }
  },

  /* ---- the hidden garden unlocks once all 7 keepsakes are found ---- */
  gateLockedMessage: "The gate is old and shut tight... maybe it opens with a key.",
  gateOpenMessage: "The old gate swings open. The hidden garden is yours.",

  /* ---- the final anniversary letter ---- */
  finalLetter: {
    title: "For you, [HER NICKNAME]",
    lines: [
      "[WRITE YOUR PERSONAL ANNIVERSARY LETTER HERE]",
      "Every little thing we care for grows - even a tiny pixel farm.",
      "Thank you for two months of showing up for us.",
      "Here's to growing a whole lot more together.",
      "x [YOUR NAME]"
    ]
  },
  finalSceneTitle: "Happy 2 Months",
  finalSceneSubtitle: "and many, many more",

  /* ---- tiny helper notes that appear as hints ---- */
  hints: [
    "Move with WASD or the arrow keys.",
    "Walk to a soil patch and press E to tend it.",
    "Pick a seed with 1 / 2 / 3, then plant it.",
    "Water your crops - they grow when you sleep.",
    "Press E at the cottage door to end the day."
  ],

  /* ---- cozy muted palette (change if you like) ---- */
  palette: {
    grass:     "#7ba05b",
    grassDark: "#648a48",
    grassLite: "#94b774",
    sage:      "#a7c08a",
    cream:     "#f3e8cf",
    creamDark: "#e0cfa6",
    wood:      "#9c6b43",
    woodDark:  "#734d31",
    roof:      "#b06e4d",
    roofDark:  "#8a5339",
    soil:      "#6b4a34",
    soilDark:  "#523726",
    soilWet:   "#4a3323",
    water:     "#79b0c6",
    waterDark: "#5a91a8",
    waterLite: "#a9d0de",
    sky:       "#bcdcea",
    gold:      "#e6b84a",
    pink:      "#d98ca5",
    pinkSoft:  "#ecbcca",
    red:       "#c65b5b",
    stone:     "#9a9a95",
    stoneDark: "#72726d",
    ink:       "#3c3227",
    shadow:    "rgba(38,48,38,0.22)"
  }

};
