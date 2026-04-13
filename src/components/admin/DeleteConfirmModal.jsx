import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Delete confirmation modal.
 * Props:
 *   product   — the product to delete (or null = hidden)
 *   onClose   — called on cancel / backdrop click
 *   onConfirm — called when the user clicks Delete
 */
export default function DeleteConfirmModal({ product, onClose, onConfirm }) {
  /* ESC key closes */
  useEffect(() => {
    if (!product) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product, onClose]);

  return (
    <AnimatePresence>
      {product && (
        /* Backdrop */
        <motion.div
          className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          {/* Panel */}
          <motion.div
            className="w-full max-w-md bg-[#111111] border border-white/10 p-8"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning icon */}
            <div className="flex flex-col items-center text-center gap-4">
              <span
                className="material-symbols-outlined text-red-500"
                style={{ fontSize: 48, fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>

              <h2
                className="text-white uppercase"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem' }}
              >
                Delete Product?
              </h2>

              <p className="font-body text-white/60 text-sm leading-relaxed">
                Are you sure you want to delete{' '}
                <span className="text-white font-medium">{product.name}</span>?{' '}
                This action cannot be undone.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={onClose}
                className="flex-1 py-3 font-technical text-xs uppercase tracking-widest
                           bg-white/10 text-stone-300 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 font-technical text-xs uppercase tracking-widest
                           bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
