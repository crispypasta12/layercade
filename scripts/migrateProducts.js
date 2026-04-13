/**
 * One-time migration: copy products from src/data/products.js → Supabase products table.
 * Run: npm run migrate-products
 *
 * Requires Node 20+ (uses --env-file flag to load .env.local).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Category mapping: internal code → display label used in Supabase ───────
function mapCategory(rawCategory) {
  switch (rawCategory) {
    case 'gaming':     return 'Gaming Accessories';
    case 'headphones': return 'Headphone Gear';
    case 'busts':      return 'Collectibles';
    case 'masks':      return 'Masks';
    case 'sculptures': return 'Sculptures';
    default:           return rawCategory;
  }
}

// ─── Slug generator ──────────────────────────────────────────────────────────
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Raw product catalogue (copied from src/data/products.js) ────────────────
const productCatalog = [
  { id: 1,  name: "God of War Guardian Shield Controller Stand",    category: "gaming",      price: 1590, isBestSeller: true,  isNew: false, description: "Norse cave themed controller stand featuring the Guardian Shield and Leviathan Axe.",            image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/god-of-war-stand.jpg" },
  { id: 2,  name: "Batman Controller Stand",                         category: "gaming",      price: 990,  isBestSeller: true,  isNew: false, description: "Dark Knight themed controller stand — perfect for any gaming desk setup.",                       image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/batman-controller-stand.jpg" },
  { id: 3,  name: "PS5 Slim / Fat / Pro Feet",                      category: "gaming",      price: 790,  isBestSeller: true,  isNew: true,  description: "Replacement feet for PS5 Slim, Fat, and Pro. Improved grip and airflow.",                        image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/ps5-feet.jpg" },
  { id: 4,  name: "PS5 Slim / Fat / Pro Wall Mount",                category: "gaming",      price: 790,  isBestSeller: true,  isNew: false, description: "Space-saving wall mount compatible with all PS5 versions.",                                       image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/ps5-wall-mount.jpg" },
  { id: 5,  name: "PS4 Slim / Fat / Pro Wall Mount",                category: "gaming",      price: 590,  isBestSeller: false, isNew: false, description: "Clean wall mount solution for all PS4 variants.",                                                image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/gaming/ps4-wall-mount.jpg" },
  { id: 6,  name: "Classic Headphone Hanger",                        category: "headphones", price: 390,  isBestSeller: true,  isNew: false, description: "Clean minimalist desk hanger. Fits all standard headphones.",                                    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/classic-hanger.jpg" },
  { id: 7,  name: "Classy Headphone Hanger",                         category: "headphones", price: 390,  isBestSeller: true,  isNew: false, description: "Premium styled headphone hanger with a refined finish.",                                         image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/classy-hanger.jpg" },
  { id: 8,  name: "Under-Desk Headphone Hanger",                     category: "headphones", price: 290,  isBestSeller: false, isNew: false, description: "Mounts under your desk to save surface space entirely.",                                         image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/under-desk-hanger.jpg" },
  { id: 9,  name: "Combined Headphone & Controller Holder",          category: "headphones", price: 590,  isBestSeller: true,  isNew: true,  description: "Single mount holds both your headphones and controller. Desk space saver.",                     image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/combo-holder.jpg" },
  { id: 10, name: "Combined Headphone & Dual Controller Hanger",     category: "headphones", price: 790,  isBestSeller: false, isNew: false, description: "Holds headphones plus two controllers simultaneously.",                                          image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/headphones/dual-combo-hanger.jpg" },
  { id: 11, name: "The Dark Knight Batman Bust",                      category: "busts",      price: 990,  isBestSeller: true,  isNew: false, description: "Highly detailed Batman bust from The Dark Knight trilogy. Display piece.",                       image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/batman-bust.jpg" },
  { id: 12, name: "Exquisite Lionel Messi Artwork Bust",             category: "busts",      price: 1290, isBestSeller: true,  isNew: false, description: "Museum-quality Messi bust. Incredible likeness and detail.",                                    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/messi-bust.jpg" },
  { id: 13, name: "Cristiano Ronaldo Artwork Bust",                  category: "busts",      price: 1290, isBestSeller: true,  isNew: false, description: "Stunning CR7 bust with fine facial detail. Collector's item.",                                  image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/ronaldo-bust.jpg" },
  { id: 14, name: "The Godfather Don Vito Corleone Bust",            category: "busts",      price: 990,  isBestSeller: true,  isNew: false, description: "Iconic Godfather bust. A statement piece for any room.",                                        image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/busts/godfather-bust.jpg" },
  { id: 15, name: "Call of Duty: Ghost Mask",                        category: "masks",      price: 1590, isBestSeller: true,  isNew: false, description: "Wearable COD Ghost mask. Full face coverage, comfortable fit.",                                 image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/masks/ghost-mask.jpg" },
  { id: 16, name: "Squid Game Frontman Mask",                        category: "masks",      price: 1990, isBestSeller: true,  isNew: true,  description: "The Frontman's iconic black mask from Squid Game. Wearable display piece.",                    image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/masks/frontman-mask.jpg" },
  { id: 17, name: "Moon Cityscape: A Celestial Masterpiece",         category: "sculptures", price: 990,  isBestSeller: false, isNew: true,  description: "A breathtaking moon cityscape sculpture. Stunning display piece.",                             image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/sculptures/moon-cityscape.jpg" },
  { id: 18, name: "Game of Thrones Iron Throne",                     category: "sculptures", price: 990,  isBestSeller: false, isNew: true,  description: "Detailed miniature Iron Throne from Game of Thrones. Collector's edition.",                   image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/sculptures/iron-throne.jpg" },
  { id: 19, name: "Wild Horse Figurine Art",                         category: "sculptures", price: 1590, isBestSeller: false, isNew: true,  description: "Dynamic wild horse figurine. Expressive and beautifully detailed.",                            image: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/layercade/products/sculptures/wild-horse.jpg" },
];

async function migrate() {
  console.log(`Migrating ${productCatalog.length} products to Supabase...\n`);
  let success = 0;
  let failed  = 0;

  for (const p of productCatalog) {
    const row = {
      name:         p.name,
      slug:         generateSlug(p.name),
      description:  p.description ?? '',
      price:        p.price,
      category:     mapCategory(p.category),
      image:        p.image,
      images:       p.image ? [p.image] : [],
      featured:     p.isBestSeller ?? false,
      new_arrival:  p.isNew ?? false,
      stock_status: 'in_stock',
      sort_order:   p.id,
    };

    const { error } = await supabase.from('products').insert(row);

    if (error) {
      console.error(`  ✗ [${p.id}] ${p.name}`);
      console.error(`      ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ [${p.id}] ${p.name}  (slug: ${row.slug})`);
      success++;
    }
  }

  console.log(`\nDone. ${success} inserted, ${failed} failed.`);
}

migrate();
