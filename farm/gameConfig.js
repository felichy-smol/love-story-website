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
  playerName: "Tony",
  recipientName: "my love",
  fromName: "Tony",
  milestone: "2 months together",

  /* ---- readable in-world signposts ---- */
  signLines: [
    "Moonberry Farm - welcome, my love.",
    "Coins: till, plant, water, then harvest crops.",
    "The hidden garden hides in the far EAST -",
    "an old gate tucked in the hedge. 7 keepsakes open it."
  ],
  gardenSignLines: [
    "the hidden garden, straight ahead",
    "the old gate needs all 7 keepsakes to open."
  ],

  /* ---- the letter shown when you start ---- */
  openingLetter: {
    title: "A letter arrived...",
    lines: [
      "Hey my love,",
      "I couldn't be there in person, so I made you a little farm instead.",
      "It's a bit overgrown - I think it just needs some gentle care.",
      "Water the crops, sleep, and watch them grow. A little like us.",
      "x Tony"
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
    flower: { name: "Pressed Flower", text: "u r the prettiest girl i know" },
    heart:  { name: "Paper Heart",    text: "i cant believe u will rewarm ur coffee in microwave again" },
    shell:  { name: "Seashell",       text: "i got pb just to eat it with u" },
    photo:  { name: "Little Photo",   text: "i promise to watch hundreds of sunsets with u" },
    ribbon: { name: "Lost Ribbon",    text: "i hope u r having fun" },
    key:    { name: "Mysterious Key", text: "u have the cutest smile" },
    locket: { name: "Keepsake",       text: "camera where" }
  },

  /* ---- the hidden garden unlocks once all 7 keepsakes are found ---- */
  gateLockedMessage: "The gate is old and shut tight... maybe it opens with a key.",
  gateOpenMessage: "The old gate swings open. The hidden garden is yours.",

  /* ---- the final anniversary letter ---- */
  finalLetter: {
    title: "For you, my love",
    lines: [
      "Two months of you, and I still can't believe you're mine.",
      "Every little thing we care for grows - even a tiny pixel farm.",
      "Thank you for showing up for us, again and again.",
      "Here's to growing a whole lot more together.",
      "x Tony"
    ]
  },
  finalSceneTitle: "Happy 2 Months",
  finalSceneSubtitle: "and many, many more",

  /* ---- tiny helper notes that appear as hints ---- */
  hints: [
    "Move with WASD or the arrow keys.",
    "Walk to a soil patch and press E to tend it.",
    "Till, plant, then water - crops grow when you sleep.",
    "Harvest ripe crops to earn coins (carrot 4, berry 7, flower 5).",
    "Spend coins at the seed box beside the cottage.",
    "Sleep by pressing E at the cottage door.",
    "The hidden garden is in the far EAST - an old gate in the hedge.",
    "Find all 7 keepsakes to make the gate open."
  ],

  /* ---- cozy muted palette (change if you like) ---- */
  palette: {
    grass:     "#7fa653",
    grassDark: "#5f8440",
    grassLite: "#9dc06b",
    sage:      "#b8d189",
    cream:     "#f6ead0",
    creamDark: "#e2cfa2",
    wood:      "#a06a3e",
    woodDark:  "#73482a",
    roof:      "#b5623f",
    roofDark:  "#8c472c",
    soil:      "#7a5236",
    soilDark:  "#5c3d28",
    soilWet:   "#48301f",
    water:     "#5fa8c4",
    waterDark: "#3f88a6",
    waterLite: "#a6d3e2",
    sand:      "#e3d2a3",
    sky:       "#bfe0ee",
    gold:      "#ecc24e",
    pink:      "#e08aa8",
    pinkSoft:  "#f4c3d3",
    red:       "#cf5a5a",
    stone:     "#a9a89e",
    stoneDark: "#7c7b72",
    ink:       "#3b3026",
    shadow:    "rgba(40,52,34,0.22)"
  }

};
