import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NOT_FOUND, pick } from '../lib/voice';

export default function NotFound() {
  const [quip] = useState(() => pick(NOT_FOUND));

  return (
    <main className="pt-44 pb-20 px-8 min-h-screen flex items-start justify-center">
      <motion.div
        className="w-full max-w-2xl text-center space-y-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="font-technical text-[10px] text-[#ff5500] uppercase tracking-[0.3em]">
          ERROR_404 // PRINT_FAILED
        </p>
        <h1 className="font-headline text-7xl md:text-9xl text-white">PAGE NOT FOUND</h1>
        <p className="font-body text-stone-400 text-base">{quip}</p>
        <div className="signature-divider opacity-30" />
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="clip-parallelogram bg-[#ff5500] text-white font-headline text-2xl px-10 py-4
                       hover:shadow-[0_0_20px_rgba(255,85,0,0.3)] transition-all"
          >
            BACK TO HOME
          </Link>
          <Link
            to="/shop"
            className="clip-parallelogram border border-white/20 bg-white/5 text-white font-headline text-xl px-10 py-4
                       hover:border-[#ff5500] transition-all"
          >
            BROWSE THE SHOP
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
