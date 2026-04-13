import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../store/cartStore';

export default function CartDrawer() {
  const { isCartOpen, closeCart, items, removeItem, updateQuantity } = useCartStore();
  const navigate = useNavigate();
  const [checkoutError, setCheckoutError] = useState(false);

  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItems  = items.reduce((sum, i) => sum + i.quantity, 0);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeCart]);

  /* Lock body scroll while open */
  useEffect(() => {
    document.body.style.overflow = isCartOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen]);

  /* Clear checkout error when items are added */
  useEffect(() => {
    if (items.length > 0) setCheckoutError(false);
  }, [items.length]);

  const handleCheckout = () => {
    if (items.length === 0) {
      setCheckoutError(true);
      return;
    }
    closeCart();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-[#111111] z-[201] flex flex-col border-l border-white/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 flex-shrink-0">
              <h2 className="font-headline text-3xl text-white">
                CART{totalItems > 0 && (
                  <span className="text-[#ff5500] ml-2">({totalItems})</span>
                )}
              </h2>
              <button
                onClick={closeCart}
                className="text-stone-400 hover:text-white transition-colors p-1"
                aria-label="Close cart"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>close</span>
              </button>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 no-scrollbar">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <span
                    className="material-symbols-outlined text-stone-700 mb-4"
                    style={{ fontSize: 64 }}
                  >
                    shopping_cart
                  </span>
                  <p className="font-headline text-2xl text-stone-500">YOUR CART IS EMPTY</p>
                  <p className="font-body text-sm text-stone-600 mt-2">
                    Add some products to get started
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-3 bg-[#161616] p-3 border border-white/5"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 flex-shrink-0 bg-stone-900 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span
                            className="material-symbols-outlined text-stone-600"
                            style={{ fontSize: 24 }}
                          >
                            image
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info + quantity */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-body font-medium text-sm leading-tight line-clamp-2">
                        {item.name}
                      </p>
                      <p className="font-technical text-[#ff5500] text-sm mt-1">
                        {item.price.toLocaleString('en-IN')}৳
                      </p>

                      {/* Qty controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 bg-stone-800 hover:bg-[#ff5500] text-white flex items-center justify-center transition-colors flex-shrink-0"
                          aria-label="Decrease quantity"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>remove</span>
                        </button>
                        <span className="font-technical text-white text-sm w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-7 h-7 bg-stone-800 hover:bg-[#ff5500] text-white flex items-center justify-center transition-colors flex-shrink-0"
                          aria-label="Increase quantity"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                        </button>
                      </div>
                    </div>

                    {/* Line total + remove */}
                    <div className="flex flex-col items-end justify-between flex-shrink-0">
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-stone-600 hover:text-red-500 transition-colors"
                        aria-label="Remove item"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                      </button>
                      <span className="font-headline text-lg text-white">
                        {(item.price * item.quantity).toLocaleString('en-IN')}৳
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-white/5 flex-shrink-0 space-y-3">
              {checkoutError && (
                <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/60 px-3 py-2">
                  <span
                    className="material-symbols-outlined text-red-500 flex-shrink-0"
                    style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                  >
                    error
                  </span>
                  <p className="font-technical text-[10px] text-red-400 uppercase tracking-wide">
                    Add items to cart before checking out
                  </p>
                </div>
              )}
              {items.length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-technical text-stone-400 uppercase text-sm tracking-wider">
                      Subtotal
                    </span>
                    <span className="font-headline text-2xl text-white">
                      {totalAmount.toLocaleString('en-IN')}৳
                    </span>
                  </div>
                  <p className="font-technical text-stone-600 text-xs">
                    Delivery fee (৳60) calculated at checkout
                  </p>
                  <button
                    onClick={handleCheckout}
                    className="w-full clip-parallelogram bg-[#ff5500] text-white font-headline text-2xl py-3
                               hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all min-h-[44px]"
                  >
                    PROCEED TO CHECKOUT
                  </button>
                  <button
                    onClick={closeCart}
                    className="w-full text-stone-500 hover:text-white font-technical text-sm
                               transition-colors py-2 min-h-[44px]"
                  >
                    Continue Shopping
                  </button>
                </>
              ) : (
                <button
                  onClick={closeCart}
                  className="w-full clip-parallelogram border border-stone-700 text-stone-400 hover:text-white
                             font-headline text-xl py-3 transition-colors min-h-[44px]"
                >
                  CONTINUE SHOPPING
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
