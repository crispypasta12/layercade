import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchProducts, getProductBySlug } from '../data/products';
import { useCartStore } from '../store/cartStore';

function formatStockStatus(status) {
  if (!status) return 'Made to Order';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function DetailStat({ label, value, accent }) {
  return (
    <div className="border border-white/10 bg-[#161616] p-4">
      <p className="font-technical text-[10px] uppercase tracking-[0.25em] text-stone-500">
        {label}
      </p>
      <p className={`mt-2 text-sm ${accent ? 'text-[#ff5500]' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

export default function ProductModalPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isOverlay = Boolean(location.state?.backgroundLocation);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getProductBySlug(slug), fetchProducts()]).then(([currentProduct, allProducts]) => {
      if (!isMounted) return;

      setProduct(currentProduct);
      setSelectedImage(currentProduct?.img1 ?? null);

      const related = (allProducts ?? [])
        .filter((item) => item.slug !== slug)
        .sort((a, b) => {
          const sameCategoryA = a.category === currentProduct?.category ? 1 : 0;
          const sameCategoryB = b.category === currentProduct?.category ? 1 : 0;
          return sameCategoryB - sameCategoryA;
        })
        .slice(0, 3);

      setRelatedProducts(related);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!cartMessage) return undefined;
    const timeoutId = window.setTimeout(() => setCartMessage(''), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [cartMessage]);

  useEffect(() => {
    if (!isOverlay) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOverlay]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    openCart();
    setCartMessage(quantity === 1 ? 'Added to cart.' : `${quantity} items added to cart.`);
  };

  const handleBack = () => {
    if (isOverlay || window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  if (loading) {
    return (
      <div
        className={isOverlay ? 'fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center' : 'pt-44 pb-24 px-8 max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]'}
      >
        <p className="font-headline text-2xl text-white uppercase tracking-wider">Loading...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen pt-44 pb-24 px-8 max-w-4xl mx-auto">
        <div className="border border-white/10 bg-[#111111] p-10 text-center">
          <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">404</p>
          <h1 className="mt-4 font-headline text-5xl text-white">PRODUCT NOT FOUND</h1>
          <Link
            to="/"
            className="mt-8 inline-flex clip-parallelogram bg-[#ff5500] px-8 py-3 font-headline text-2xl text-black"
          >
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  const productImages = [...new Set([product.img1, product.img2].filter(Boolean))];
  const activeImage = selectedImage ?? productImages[0] ?? null;
  const availabilityLabel = formatStockStatus(product.stock_status);
  const supportLabel = product.featured ? 'Best seller support' : 'Custom quote available';
  const productionLabel = product.isNew ? 'New arrival' : 'Batch printed';

  return (
    <motion.div
      className={isOverlay ? 'fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm p-4 md:p-8' : 'pt-44 pb-24 px-8 max-w-6xl mx-auto'}
      onClick={isOverlay ? handleBack : undefined}
      initial={isOverlay ? { opacity: 0 } : false}
      animate={isOverlay ? { opacity: 1 } : false}
      exit={isOverlay ? { opacity: 0 } : undefined}
      transition={{ duration: 0.2 }}
    >
      <motion.article
        className={`${isOverlay ? 'mx-auto max-w-6xl max-h-[calc(100vh-2rem)] overflow-y-auto' : ''} border border-white/10 bg-[#111111] shadow-[0_20px_80px_rgba(0,0,0,0.45)]`}
        onClick={(event) => event.stopPropagation()}
        initial={isOverlay ? { scale: 0.95, opacity: 0 } : false}
        animate={isOverlay ? { scale: 1, opacity: 1 } : false}
        exit={isOverlay ? { scale: 0.95, opacity: 0 } : undefined}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-[#161616] p-4 md:p-6">
            <div className="overflow-hidden border border-white/10 bg-black/30">
              <div className="aspect-square">
                <img
                  src={activeImage ?? product.img1}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {productImages.length > 1 ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {productImages.map((image, index) => (
                  <button
                    key={`${product.id}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={`overflow-hidden border transition-colors ${
                      image === activeImage ? 'border-[#ff5500]' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="aspect-[4/3]">
                      <img
                        src={image}
                        alt={`${product.name} view ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 border border-white/10 bg-[#121212] p-4">
                <p className="font-technical text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  Product Snapshot
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-300">
                  Detailed preview for this print. More angles can be added once the product data includes multiple images.
                </p>
              </div>
            )}
          </div>

          <div className="p-6 md:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">
                  {product.category}
                </p>
                <h1 className="mt-3 font-headline text-5xl md:text-6xl leading-none text-white">
                  {product.name}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="border border-[#ff5500]/30 bg-[#ff5500]/10 px-3 py-1 font-technical text-[10px] uppercase tracking-[0.2em] text-[#ff5500]">
                    {availabilityLabel}
                  </span>
                  {product.featured && (
                    <span className="border border-white/10 px-3 py-1 font-technical text-[10px] uppercase tracking-[0.2em] text-stone-300">
                      Best Seller
                    </span>
                  )}
                  {product.isNew && (
                    <span className="border border-white/10 px-3 py-1 font-technical text-[10px] uppercase tracking-[0.2em] text-stone-300">
                      New Arrival
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleBack}
                className="flex h-12 w-12 items-center justify-center border border-white/10 text-stone-300 transition-colors hover:border-[#ff5500] hover:text-[#ff5500]"
                aria-label="Close product details"
              >
                <span className="material-symbols-outlined">{isOverlay ? 'close' : 'arrow_back'}</span>
              </button>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <p className="font-headline text-4xl text-[#ff5500]">
                {product.price.toLocaleString('en-IN')} BDT
              </p>
              <p className="pb-1 font-technical text-[10px] uppercase tracking-[0.2em] text-stone-500">
                per item
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <DetailStat label="Category" value={product.category} />
              <DetailStat label="Availability" value={availabilityLabel} accent />
              <DetailStat label="Production" value={productionLabel} />
              <DetailStat label="Support" value={supportLabel} />
            </div>

            <div className="mt-8 border border-white/10 bg-[#141414] p-5">
              <p className="font-technical text-[10px] uppercase tracking-[0.25em] text-stone-500">
                Overview
              </p>
              <p className="mt-3 text-base leading-7 text-stone-300">
                {product.description || 'Precision-printed piece finished for display, gifting, or everyday use. Use the quote flow if you want size or material changes before ordering.'}
              </p>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-stone-300">
              {[
                'Typical lead time: 3-5 business days for standard orders.',
                'Cash on delivery checkout is available for Bangladesh orders.',
                'Need a custom size or finish? Use Get a Quote before ordering.',
              ].map((note) => (
                <div key={note} className="flex gap-3 border border-white/8 bg-[#141414] px-4 py-3">
                  <span className="material-symbols-outlined text-[#ff5500]" style={{ fontSize: 16 }}>
                    check_circle
                  </span>
                  <p>{note}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="w-full sm:max-w-[180px]">
                  <p className="font-technical text-[10px] uppercase tracking-[0.25em] text-stone-500">
                    Quantity
                  </p>
                  <div className="mt-2 flex h-14 items-center border border-white/10 bg-[#161616]">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      className="flex h-full w-14 items-center justify-center text-stone-300 transition-colors hover:text-white"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <div
                      className="flex-1 text-center font-mono text-lg text-white"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      {quantity}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => prev + 1)}
                      className="flex h-full w-14 items-center justify-center text-stone-300 transition-colors hover:text-white"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="clip-parallelogram inline-flex min-h-[56px] w-full items-center justify-center bg-[#ff5500]
                               px-8 py-4 font-headline text-2xl text-white hover:shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all"
                  >
                    ADD {quantity > 1 ? `${quantity} TO CART` : 'TO CART'}
                  </button>
                </div>
              </div>

              {cartMessage && (
                <div className="border border-green-800/60 bg-green-950/30 px-4 py-3">
                  <p className="font-technical text-[10px] uppercase tracking-[0.2em] text-green-300">
                    {cartMessage}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/quote"
                  className="clip-parallelogram inline-flex items-center justify-center
                             border border-[#ff5500]/40 px-8 py-4 font-headline text-2xl
                             text-white transition-colors hover:bg-[#ff5500]/10 min-h-[56px] flex-1"
                >
                  Get a Quote
                </Link>
                <Link
                  to="/gallery"
                  className="clip-parallelogram inline-flex items-center justify-center
                             border border-white/10 px-8 py-4 font-headline text-2xl
                             text-stone-400 transition-colors hover:border-white/30 hover:text-white
                             min-h-[56px] flex-1"
                >
                  View Gallery
                </Link>
              </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="border-t border-white/10 bg-[#101010] p-6 md:p-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">
                  More to Explore
                </p>
                <h2 className="mt-3 font-headline text-4xl text-white">
                  Related Prints
                </h2>
              </div>
              <p className="max-w-sm text-right text-sm text-stone-500">
                Similar pieces based on category and current catalogue order.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {relatedProducts.map((item) => (
                <Link
                  key={item.id}
                  to={`/products/${item.slug}`}
                  state={isOverlay ? { backgroundLocation: location.state?.backgroundLocation ?? location } : undefined}
                  className="group border border-white/10 bg-[#161616] transition-colors hover:border-[#ff5500]/50"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={item.img1}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-technical text-[10px] uppercase tracking-[0.2em] text-[#ff5500]">
                      {item.category}
                    </p>
                    <h3 className="mt-2 font-headline text-3xl leading-none text-white">
                      {item.name}
                    </h3>
                    <p className="mt-3 text-sm text-stone-500">
                      {item.price.toLocaleString('en-IN')} BDT
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </motion.article>
    </motion.div>
  );
}
