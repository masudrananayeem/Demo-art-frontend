import womenOuterwear from "../assets/clothing/women-outerwear.jpg";
import womenTop from "../assets/clothing/women-top.jpg";
import womenKnit from "../assets/clothing/women-knit.jpg";
import menShirt from "../assets/clothing/men-shirt.jpg";
import unisexEditorial from "../assets/clothing/unisex-editorial.jpg";
import kidsEditorial from "../assets/clothing/kids-editorial.jpg";

const CLOTHING_IMAGES = [womenOuterwear, womenTop, womenKnit, menShirt, unisexEditorial, kidsEditorial];
const clothingSeed = (seed) => {
  if (seed.includes("cat-clothing")) return womenOuterwear;
  if (seed.includes("wearing-women") || seed.includes("women-editorial")) return womenOuterwear;
  if (seed.includes("wearing-men") || seed.includes("men-editorial")) return menShirt;
  if (seed.includes("wearing-kids") || seed.includes("kids-editorial") || seed.includes("cat-clothing")) return kidsEditorial;
  const match = seed.match(/ac-clothing-(\d+)/);
  if (match) return CLOTHING_IMAGES[Number(match[1]) % CLOTHING_IMAGES.length];
  return null;
};
export const img = (seed, w = 600, h = 800) => clothingSeed(seed) || `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const CATEGORIES = [
  { id: "clothing", name: "Clothing", desc: "Structured essentials, made to last.", seed: "ac-cat-clothing" },
  { id: "art", name: "Art", desc: "Original works & limited prints.", seed: "ac-cat-art" },
  { id: "objects", name: "Objects", desc: "Sculpture, ceramics, desk pieces.", seed: "ac-cat-objects" },
  { id: "accessories", name: "Accessories", desc: "Bags, jewelry, small leather goods.", seed: "ac-cat-accessories" },
  { id: "gifts", name: "Gifts", desc: "Curated boxes for the discerning.", seed: "ac-cat-gifts" },
];

// Clothing is organized Men / Women / Kids, each with its own sub-categories.
export const GENDERS = [
  { id: "all", name: "Everyone" },
  { id: "women", name: "Women" },
  { id: "men", name: "Men" },
  { id: "kids", name: "Kids" },
];

export const SUBCATEGORIES = {
  women: ["Dresses", "Outerwear", "Tops"],
  men: ["Shirts", "Outerwear", "Trousers"],
  kids: ["Tees", "Outerwear", "Sets"],
  unisex: ["Tops"],
};

// [name, gender, subcategory]
const CLOTHING = [
  ["Fragment Overcoat", "women", "Outerwear"],
  ["Sculpted Blazer", "women", "Outerwear"],
  ["Draped Silk Slip", "women", "Dresses"],
  ["Ochre Wrap Dress", "women", "Dresses"],
  ["Ribbed Knit Top", "women", "Tops"],
  ["Oxide Trouser", "men", "Trousers"],
  ["Linen Field Shirt", "men", "Shirts"],
  ["Heavyweight Chino", "men", "Trousers"],
  ["Ash Denim Jacket", "men", "Outerwear"],
  ["Studio Flannel Shirt", "men", "Shirts"],
  ["Little Voyager Jacket", "kids", "Outerwear"],
  ["Striped Play Tee", "kids", "Tees"],
  ["Weekend Jogger Set", "kids", "Sets"],
  ["Rainy Day Slicker", "kids", "Outerwear"],
  ["Raw Edge Hoodie", "unisex", "Tops"],
];

const NAMES = {
  clothing: CLOTHING,
  art: ["Study in Ochre No.3", "Quiet Fracture Print", "Untitled (Terrain)", "Interior Weather", "Slow Erosion", "Marginalia I"],
  objects: ["Poured Ceramic Vessel", "Desk Monolith", "Ash Bowl Set", "Ribbed Candlestick", "Stone Tray"],
  accessories: [
    ["Folded Leather Bag", "women"],
    ["Signet Ring", "men"],
    ["Oxide Leather Belt", "unisex"],
    ["Woven Card Case", "unisex"],
    ["Brass Cuff", "women"],
  ],
  gifts: ["The Maker's Box", "Small Works Print Set", "Studio Candle Duo", "Print & Paper Set"],
};

function buildProducts() {
  const out = [];
  let id = 1;
  Object.entries(NAMES).forEach(([cat, entries]) => {
    entries.forEach((entry, i) => {
      const isArt = cat === "art";
      const isClothing = cat === "clothing";
      const [name, gender, subcategory] = Array.isArray(entry) ? entry : [entry, "unisex", null];
      out.push({
        id: id++,
        name,
        category: cat,
        gender: isArt || cat === "objects" || cat === "gifts" ? "unisex" : gender,
        subcategory: isClothing ? subcategory : null,
        price: isArt ? 220 + i * 65 : cat === "objects" ? 90 + i * 30 : isClothing && gender === "kids" ? 28 + i * 8 : 38 + i * 18,
        rating: (4.3 + ((i * 7) % 6) / 10).toFixed(1),
        reviews: 40 + ((i * 37) % 200),
        edition: isArt || cat === "objects" ? `${(i + 3) * 3}/${(i + 4) * 20}` : null,
        seed: `ac-${cat}-${i}`,
        material: isArt ? "Graphite & gouache on cotton paper" : cat === "objects" ? "Stoneware, hand-thrown" : "Brushed cotton twill",
        size: isArt ? "50 × 65 cm" : cat === "accessories" ? "One size" : isClothing && gender === "kids" ? "2T – 10Y" : "XS – XL",
        story:
          "Made in small batches in our studio — sketched, tested and finished by hand before it ever reaches a shelf. No two runs are ever quite identical.",
      });
    });
  });
  return out;
}

export const PRODUCTS = buildProducts();
export const getProduct = (id) => PRODUCTS.find((p) => String(p.id) === String(id));
export const related = (product, count = 4) =>
  PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, count);
