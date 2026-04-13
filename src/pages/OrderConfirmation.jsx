import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCartStore } from '../store/cartStore';

export default function OrderConfirmation() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const clearCart = useCartStore((state) => state.clearCart);

  const { orderId, customerName, totalAmount } = location.state || {};

  /* Guard — no order data means someone landed here directly */
  useEffect(() => {
    if (!orderId) {
      navigate('/', { replace: true });
    }
  }, [orderId, navigate]);

  /* Clear the cart once on mount */
  useEffect(() => {
    if (orderId) {
      clearCart();
    }
  }, [orderId, clearCart]);

  /* Don't render anything while redirecting */
  if (!orderId) return null;

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER;
  const whatsappMsg    = encodeURIComponent(
    `Hi! I just placed order #ORD-${orderId} on Layercade.`
  );
  const whatsappUrl    = `https://wa.me/${whatsappNumber}?text=${whatsappMsg}`;

  return (
    <main className="pt-44 pb-20 px-8 min-h-screen flex items-start justify-center">
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Card */}
        <div className="bg-[#161616] border border-white/5 p-12 text-center space-y-8">

          {/* Animated checkmark */}
          <motion.div
            className="mx-auto w-24 h-24 bg-emerald-500/10 border-2 border-emerald-500
                       flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          >
            <span
              className="material-symbols-outlined text-emerald-400"
              style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="space-y-2"
          >
            <h1 className="font-headline text-5xl md:text-7xl text-white">ORDER PLACED!</h1>
            <p className="font-technical text-stone-500 text-sm uppercase tracking-widest">
              Thank you, {customerName}
            </p>
          </motion.div>

          {/* Divider */}
          <div className="signature-divider opacity-30" />

          {/* Order details */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="space-y-4"
          >
            <div className="bg-[#111111] border border-white/5 p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-technical text-xs text-stone-500 uppercase tracking-widest">
                  Order ID
                </span>
                <span className="font-headline text-2xl text-[#ff5500]">
                  #ORD-{orderId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-technical text-xs text-stone-500 uppercase tracking-widest">
                  Total Paid on Delivery
                </span>
                <span className="font-headline text-2xl text-white">
                  {totalAmount?.toLocaleString('en-IN')}৳
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-technical text-xs text-stone-500 uppercase tracking-widest">
                  Payment
                </span>
                <span className="font-body text-stone-300 text-sm">Cash on Delivery</span>
              </div>
            </div>

            {/* Confirmation message */}
            <div className="flex items-start gap-3 bg-[#ff5500]/5 border border-[#ff5500]/20 p-4 text-left">
              <span
                className="material-symbols-outlined text-[#ff5500] flex-shrink-0 mt-0.5"
                style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
              >
                phone_in_talk
              </span>
              <p className="font-body text-stone-300 text-sm leading-relaxed">
                We'll call you before delivery to confirm your order and arrange a convenient time.
              </p>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="flex flex-col gap-4 pt-2"
          >
            {/* WhatsApp button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="clip-parallelogram bg-[#ff5500] text-white font-headline text-2xl py-4
                         hover:shadow-[0_0_30px_rgba(255,85,0,0.4)] transition-all
                         flex items-center justify-center gap-3 min-h-[56px]"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}
              >
                chat
              </span>
              MESSAGE US ON WHATSAPP
            </a>

            {/* Continue Shopping */}
            <Link
              to="/"
              className="clip-parallelogram border border-stone-700 text-stone-400
                         hover:text-white hover:border-stone-500
                         font-headline text-xl py-4 transition-all
                         flex items-center justify-center min-h-[56px]"
            >
              CONTINUE SHOPPING
            </Link>
          </motion.div>

          {/* Footer note */}
          <p className="font-technical text-[10px] text-stone-700 uppercase tracking-widest">
            Order #{orderId} — Layercade // Dhaka, Bangladesh
          </p>
        </div>
      </motion.div>
    </main>
  );
}
