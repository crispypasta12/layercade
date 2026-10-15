import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DESTRUCTIVE, quip } from '../../lib/quips';

/**
 * Confirmation for anything irreversible.
 *
 * Props:
 *   open         — show it
 *   title        — heading, e.g. "Delete Review?"
 *   name         — the thing's name, emphasised inside the sentence (optional)
 *   body         — override the whole sentence (optional)
 *   confirmLabel — the button's text. ALWAYS literal: "Delete expense", never
 *                  a joke. Whatever the body says, nobody should have to parse
 *                  a punchline to know what the red button does.
 *   onClose, onConfirm
 */
export default function DeleteConfirmModal({
  open,
  title = 'Delete?',
  name,
  body,
  confirmLabel = 'Delete',
  onClose,
  onConfirm,
}) {
  /* ESC key closes */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Seeded on the title so reopening the same dialog shows the same line.
  const aside = useMemo(() => quip(DESTRUCTIVE, title), [title]);

  return (
    <AnimatePresence>
      {open && (
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
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-[#111111] border border-white/10 p-8"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
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
                {title}
              </h2>

              <p className="font-body text-white/60 text-sm leading-relaxed">
                {body ?? (
                  <>
                    Are you sure you want to delete
                    {name ? <> <span className="text-white font-medium">{name}</span></> : ' this'}
                    ? This action cannot be undone.
                  </>
                )}
              </p>

              <p className="font-technical text-[10px] text-stone-600 tracking-wide italic">
                {aside}
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
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
