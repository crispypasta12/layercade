import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Toast notification.
 * Props:
 *   toast  — { type: 'success'|'error', message: string } or null
 *   onDismiss — called after 3 s or when the user clicks ✕
 */
export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDismiss, 3000);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  const isSuccess = toast?.type === 'success';

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className="fixed top-6 right-6 z-[200] flex items-center gap-3
                     bg-[#111111] border border-[#ff5500]/60 px-6 py-4 shadow-2xl
                     min-w-[260px] max-w-sm"
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 80 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <span
            className={`material-symbols-outlined flex-shrink-0 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}
            style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
          >
            {isSuccess ? 'check_circle' : 'error'}
          </span>
          <p className="font-body text-white text-sm flex-1">{toast.message}</p>
          <button
            onClick={onDismiss}
            className="text-stone-500 hover:text-white transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
