import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';

export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0 },
};

function ImgPlaceholder({ category }) {
  return (
    <div className="w-full h-full bg-stone-900 flex items-center justify-center">
      <span className="font-technical text-stone-700 text-[10px] uppercase tracking-widest">
        {category}
      </span>
    </div>
  );
}

export default function ProductCard({ product, location }) {
  const hasImg = product.img1 !== null;
  const addItem  = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    openCart();
  };

  return (
    <motion.div
      variants={fadeUp}
      className="product-card group relative bg-[#161616] border border-white/5 hover-glow transition-all duration-300 p-3 flex flex-col"
    >
      {/* Badges */}
      {product.sale && !product.isNew && (
        <div className="absolute top-4 left-0 z-20 bg-[#ff5500] text-black px-4 py-1 font-headline text-sm clip-parallelogram">
          SALE
        </div>
      )}
      {product.isNew && (
        <div className="absolute top-4 left-0 z-20 border border-[#ff5500] text-[#ff5500] px-4 py-1 font-headline text-sm clip-parallelogram bg-black/80">
          NEW
        </div>
      )}
      {product.stock_status === 'low_stock' && (
        <div className="absolute top-4 right-0 z-20 border border-yellow-700/60 bg-yellow-950/80 text-yellow-300 px-3 py-1 font-technical text-[10px] uppercase tracking-widest">
          Low Stock
        </div>
      )}

      {/* Clickable product area */}
      <Link
        to={`/products/${product.slug}`}
        state={{ backgroundLocation: location }}
        className="block flex-1"
      >
        {/* Image area */}
        <div className="relative aspect-square overflow-hidden mb-4">
          {hasImg ? (
            <>
              <img
                src={product.img1}
                alt={product.name}
                className="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
              />
              <img
                src={product.img2}
                alt={`${product.name} detail`}
                className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            </>
          ) : (
            <ImgPlaceholder category={product.category} />
          )}

          {/* ORDER NOW button slides up on hover */}
          <div className="absolute inset-0 flex items-end justify-center pb-6">
            <span className="order-btn clip-parallelogram bg-white text-black px-8 py-2 font-headline text-xl hover:bg-[#ff5500] hover:text-white transition-colors">
              ORDER NOW
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1">
          <span className="font-technical text-[10px] text-[#ff5500] uppercase">{product.category}</span>
          <h4 className="text-white font-medium text-lg leading-tight truncate">{product.name}</h4>

          {/* Stars */}
          <div className="flex items-center gap-0.5 text-orange-500 text-xs">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className="material-symbols-outlined"
                style={{
                  fontSize: 14,
                  fontVariationSettings: `'FILL' ${star <= product.rating ? 1 : 0}`,
                }}
              >
                star
              </span>
            ))}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-headline text-2xl text-[#ff5500]">
              {product.price.toLocaleString('en-IN')}৳
            </span>
            {product.sale && product.originalPrice && (
              <span className="font-technical text-stone-600 text-xs line-through">
                {product.originalPrice.toLocaleString('en-IN')}৳
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Add to Cart button */}
      <button
        onClick={handleAddToCart}
        className="mt-3 clip-parallelogram bg-[#ff5500] text-white font-headline text-xl py-2
                   hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all"
      >
        ADD TO CART
      </button>
    </motion.div>
  );
}
