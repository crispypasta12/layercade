// Layercade Product Catalogue
// Last updated: April 2026
// Images: Upload to Cloudinary under layercade/products/{category}/
// Replace each image URL with your Cloudinary URL once uploaded

const productCatalog = [

  // ─── GAMING ACCESSORIES ───────────────────────────────────────────
  {
    id: 1,
    name: "God of War Guardian Shield Controller Stand",
    category: "gaming",
    subcategory: "Controller Stands",
    price: 1590,
    originalPrice: 1990,
    rating: 5,
    reviews: 20,
    badge: "sale",
    isNew: false,
    isBestSeller: true,
    material: "PLA",
    color: "Dark Grey",
    description: "Norse cave themed controller stand featuring the Guardian Shield and Leviathan Axe.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/god-of-war-stand.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/god-of-war-stand-hover.jpg",
  },
  {
    id: 2,
    name: "Batman Controller Stand",
    category: "gaming",
    subcategory: "Controller Stands",
    price: 990,
    originalPrice: 1200,
    rating: 5,
    reviews: 5,
    badge: "sale",
    isNew: false,
    isBestSeller: true,
    material: "PLA",
    color: "Matte Black",
    description: "Dark Knight themed controller stand — perfect for any gaming desk setup.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/batman-controller-stand.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/batman-controller-stand-hover.jpg",
  },
  {
    id: 3,
    name: "PS5 Slim / Fat / Pro Feet",
    category: "gaming",
    subcategory: "Console Accessories",
    price: 790,
    originalPrice: 1500,
    rating: 5,
    reviews: 20,
    badge: "sale",
    isNew: true,
    isBestSeller: true,
    material: "PETG",
    color: "White / Black",
    description: "Replacement feet for PS5 Slim, Fat, and Pro. Improved grip and airflow.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/ps5-feet.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/ps5-feet-hover.jpg",
  },
  {
    id: 4,
    name: "PS5 Slim / Fat / Pro Wall Mount",
    category: "gaming",
    subcategory: "Wall Mounts",
    price: 790,
    originalPrice: 1500,
    rating: 4,
    reviews: 6,
    badge: "sale",
    isNew: false,
    isBestSeller: true,
    material: "PETG",
    color: "White / Black",
    description: "Space-saving wall mount compatible with all PS5 versions.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/ps5-wall-mount.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/ps5-wall-mount-hover.jpg",
  },
  {
    id: 5,
    name: "PS4 Slim / Fat / Pro Wall Mount",
    category: "gaming",
    subcategory: "Wall Mounts",
    price: 590,
    originalPrice: 790,
    rating: 4,
    reviews: 5,
    badge: "sale",
    isNew: false,
    isBestSeller: false,
    material: "PETG",
    color: "Black",
    description: "Clean wall mount solution for all PS4 variants.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/ps4-wall-mount.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/ps4-wall-mount-hover.jpg",
  },

  // ─── HEADPHONE GEAR ───────────────────────────────────────────────
  {
    id: 6,
    name: "Classic Headphone Hanger",
    category: "headphones",
    subcategory: "Desk Hangers",
    price: 390,
    originalPrice: 450,
    rating: 5,
    reviews: 34,
    badge: "sale",
    isNew: false,
    isBestSeller: true,
    material: "PLA",
    color: "Black / White",
    description: "Clean minimalist desk hanger. Fits all standard headphones.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/classic-hanger.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/classic-hanger-hover.jpg",
  },
  {
    id: 7,
    name: "Classy Headphone Hanger",
    category: "headphones",
    subcategory: "Desk Hangers",
    price: 390,
    originalPrice: 450,
    rating: 5,
    reviews: 14,
    badge: "sale",
    isNew: false,
    isBestSeller: true,
    material: "PLA",
    color: "Matte Black",
    description: "Premium styled headphone hanger with a refined finish.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/classy-hanger.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/classy-hanger-hover.jpg",
  },
  {
    id: 8,
    name: "Under-Desk Headphone Hanger",
    category: "headphones",
    subcategory: "Under-Desk",
    price: 290,
    originalPrice: 450,
    rating: 4,
    reviews: 2,
    badge: "sale",
    isNew: false,
    isBestSeller: false,
    material: "PLA",
    color: "Black",
    description: "Mounts under your desk to save surface space entirely.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/under-desk-hanger.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/under-desk-hanger-hover.jpg",
  },
  {
    id: 9,
    name: "Combined Headphone & Controller Holder",
    category: "headphones",
    subcategory: "Combo Holders",
    price: 590,
    originalPrice: 700,
    rating: 5,
    reviews: 1,
    badge: "sale",
    isNew: true,
    isBestSeller: true,
    material: "PLA",
    color: "Black",
    description: "Single mount holds both your headphones and controller. Desk space saver.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/combo-holder.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/combo-holder-hover.jpg",
  },
  {
    id: 10,
    name: "Combined Headphone & Dual Controller Hanger",
    category: "headphones",
    subcategory: "Combo Holders",
    price: 790,
    originalPrice: 1000,
    rating: 4,
    reviews: 2,
    badge: "sale",
    isNew: false,
    isBestSeller: false,
    material: "PLA",
    color: "Black",
    description: "Holds headphones plus two controllers simultaneously.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/dual-combo-hanger.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/dual-combo-hanger-hover.jpg",
  },

  // ─── COLLECTIBLE BUSTS ────────────────────────────────────────────
  {
    id: 11,
    name: "The Dark Knight Batman Bust",
    category: "busts",
    subcategory: "Superhero",
    price: 990,
    originalPrice: 2000,
    rating: 5,
    reviews: 17,
    badge: "sale",
    isNew: false,
    isBestSeller: true,
    material: "Resin",
    color: "Dark Grey / Black",
    description: "Highly detailed Batman bust from The Dark Knight trilogy. Display piece.",
    priceFrom: true,
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/batman-bust.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/batman-bust-hover.jpg",
  },
  {
    id: 12,
    name: "Exquisite Lionel Messi Artwork Bust",
    category: "busts",
    subcategory: "Sports Legends",
    price: 1290,
    originalPrice: 2000,
    rating: 5,
    reviews: 8,
    badge: "sale",
    isNew: false,
    isBestSeller: true,
    material: "Resin",
    color: "Natural / Painted",
    description: "Museum-quality Messi bust. Incredible likeness and detail.",
    priceFrom: true,
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/messi-bust.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/messi-bust-hover.jpg",
  },
  {
    id: 13,
    name: "Cristiano Ronaldo Artwork Bust",
    category: "busts",
    subcategory: "Sports Legends",
    price: 1290,
    originalPrice: 2000,
    rating: 5,
    reviews: 6,
    badge: "sale",
    isNew: false,
    isBestSeller: true,
    material: "Resin",
    color: "Natural / Painted",
    description: "Stunning CR7 bust with fine facial detail. Collector's item.",
    priceFrom: true,
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/ronaldo-bust.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/ronaldo-bust-hover.jpg",
  },
  {
    id: 14,
    name: "The Godfather Don Vito Corleone Bust",
    category: "busts",
    subcategory: "Movie Icons",
    price: 990,
    originalPrice: 2000,
    rating: 4,
    reviews: 6,
    badge: "sale",
    isNew: false,
    isBestSeller: true,
    material: "Resin",
    color: "Natural",
    description: "Iconic Godfather bust. A statement piece for any room.",
    priceFrom: true,
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/godfather-bust.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/godfather-bust-hover.jpg",
  },

  // ─── MASKS & WEARABLES ────────────────────────────────────────────
  {
    id: 15,
    name: "Call of Duty: Ghost Mask",
    category: "masks",
    subcategory: "Gaming Characters",
    price: 1590,
    originalPrice: 2000,
    rating: 5,
    reviews: 14,
    badge: "sale",
    isNew: false,
    isBestSeller: true,
    material: "PLA",
    color: "White / Black",
    description: "Wearable COD Ghost mask. Full face coverage, comfortable fit.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/masks/ghost-mask.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/masks/ghost-mask-hover.jpg",
  },
  {
    id: 16,
    name: "Squid Game Frontman Mask",
    category: "masks",
    subcategory: "TV Characters",
    price: 1990,
    originalPrice: 3000,
    rating: 5,
    reviews: 8,
    badge: "sale",
    isNew: true,
    isBestSeller: true,
    material: "PLA",
    color: "Black",
    description: "The Frontman's iconic black mask from Squid Game. Wearable display piece.",
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/masks/frontman-mask.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/masks/frontman-mask-hover.jpg",
  },

  // ─── NEW ARRIVALS ─────────────────────────────────────────────────
  {
    id: 17,
    name: "Moon Cityscape: A Celestial Masterpiece",
    category: "sculptures",
    subcategory: "Cityscapes",
    price: 990,
    originalPrice: 1500,
    rating: 5,
    reviews: 6,
    badge: "sale",
    isNew: true,
    isBestSeller: false,
    material: "PLA",
    color: "Natural / Painted",
    description: "A breathtaking moon cityscape sculpture. Stunning display piece.",
    priceFrom: true,
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/sculptures/moon-cityscape.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/sculptures/moon-cityscape-hover.jpg",
  },
  {
    id: 18,
    name: "Game of Thrones Iron Throne",
    category: "sculptures",
    subcategory: "TV Characters",
    price: 990,
    originalPrice: 1100,
    rating: 5,
    reviews: 9,
    badge: "sale",
    isNew: true,
    isBestSeller: false,
    material: "Resin",
    color: "Dark Grey",
    description: "Detailed miniature Iron Throne from Game of Thrones. Collector's edition.",
    priceFrom: true,
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/sculptures/iron-throne.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/sculptures/iron-throne-hover.jpg",
  },
  {
    id: 19,
    name: "Wild Horse Figurine Art",
    category: "sculptures",
    subcategory: "Animals",
    price: 1590,
    originalPrice: 2500,
    rating: 0,
    reviews: 0,
    badge: "sale",
    isNew: true,
    isBestSeller: false,
    material: "Resin",
    color: "Natural",
    description: "Dynamic wild horse figurine. Expressive and beautifully detailed.",
    priceFrom: true,
    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/sculptures/wild-horse.jpg",
    imageHover: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/sculptures/wild-horse-hover.jpg",
  },
];

function toDisplayCategory(category) {
  switch (category) {
    case 'gaming':
      return 'Gaming';
    case 'headphones':
      return 'Headphone Gear';
    case 'busts':
      return 'Busts';
    case 'masks':
      return 'Masks';
    case 'sculptures':
      return 'Decor';
    default:
      return category;
  }
}

function slugifyProductName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const products = productCatalog.map((product) => ({
  ...product,
  slug: slugifyProductName(product.name),
  category: toDisplayCategory(product.category),
  sale: product.badge === 'sale',
  img1: product.image ?? null,
  img2: product.imageHover ?? product.image ?? null,
}));

export const categories = ['ALL', ...new Set(products.map((product) => product.category))];

export const newArrivals = products
  .filter((product) => product.isNew)
  .slice(0, 3)
  .map((product) => ({
    ...product,
    series: product.subcategory || toDisplayCategory(product.category),
  }));

export const productsBySlug = Object.fromEntries(
  products.map((product) => [product.slug, product])
);

export default products;

// ─── HELPER FILTERS ───────────────────────────────────────────────
// Use these in your components:
// Best sellers:   products.filter(p => p.isBestSeller)
// New arrivals:   products.filter(p => p.isNew)
// By category:    products.filter(p => p.category === 'gaming')
// Sort by price:  products.sort((a, b) => a.price - b.price)
