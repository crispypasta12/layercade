import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FOOTER_TAGLINE, FOOTER_STATS, COPYRIGHT_QUIP } from '../lib/voice';
import { CONTACT_EMAIL, ADDRESS_LINES } from '../lib/contact';

const STATS_SHOWN = 4;

export default function Footer() {
  // Rotate which "system stats" are visible on each hover
  const [statOffset, setStatOffset] = useState(0);
  const [shareLabel, setShareLabel] = useState('Share Layercade');

  const handleShare = async () => {
    const data = { title: 'Layercade', url: 'https://www.layercade.com' };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(data.url);
      setShareLabel('Link copied');
      setTimeout(() => setShareLabel('Share Layercade'), 2000);
    } catch {
      // User cancelled the share sheet or clipboard is unavailable
    }
  };
  const stats = Array.from(
    { length: STATS_SHOWN },
    (_, i) => FOOTER_STATS[(statOffset + i) % FOOTER_STATS.length]
  );

  return (
    <footer className="bg-stone-950 relative overflow-hidden">
      {/* Orange gradient top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-orange-600 to-transparent" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 py-16 w-full max-w-7xl mx-auto">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <Link to="/" className="text-xl font-headline font-bold text-white uppercase italic">
            Layercade
          </Link>
          <p className="font-body text-sm text-stone-500 leading-relaxed">
            {FOOTER_TAGLINE}
          </p>
          <div className="flex gap-4">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              aria-label={`Email ${CONTACT_EMAIL}`}
              title={CONTACT_EMAIL}
              className="material-symbols-outlined text-[#ff5500] hover:scale-110 transition-transform select-none"
            >
              mail
            </a>
            <button
              type="button"
              onClick={handleShare}
              aria-label={shareLabel}
              title={shareLabel}
              className="material-symbols-outlined text-[#ff5500] hover:scale-110 transition-transform select-none"
            >
              {shareLabel === 'Link copied' ? 'check' : 'share'}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-3">
          <h5 className="font-headline text-white text-xl tracking-wider mb-2">Navigation</h5>
          {[
            { label: 'Collections', to: '/#collections' },
            { label: 'Best Sellers', to: '/#best-sellers' },
            { label: 'Process',     to: '/process' },
            { label: 'Materials',   to: '/materials' },
            { label: 'Gallery',     to: '/gallery' },
          ].map(({ label, to }) =>
            to.startsWith('/#') ? (
              <a
                key={label}
                href={to}
                className="font-body text-sm text-stone-500 hover:text-orange-400 hover:translate-x-1 transition-transform duration-200 inline-block"
              >
                {label}
              </a>
            ) : (
              <Link
                key={label}
                to={to}
                className="font-body text-sm text-stone-500 hover:text-orange-400 hover:translate-x-1 transition-transform duration-200 inline-block"
              >
                {label}
              </Link>
            )
          )}
        </div>

        {/* Technical Specs */}
        <div className="flex flex-col gap-3">
          <h5 className="font-headline text-white text-xl tracking-wider mb-2">Technical</h5>
          <div
            className="font-technical text-[10px] text-stone-600 space-y-1 cursor-default"
            onMouseEnter={() => setStatOffset((o) => (o + STATS_SHOWN) % FOOTER_STATS.length)}
          >
            {stats.map(([label, value]) => (
              <p key={label}>{label}: {value}</p>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-3">
          <h5 className="font-headline text-white text-xl tracking-wider mb-2">Contact</h5>
          <div className="font-technical text-xs text-stone-500 leading-loose">
            {ADDRESS_LINES.map((line) => (
              <span key={line} className="block uppercase">{line}</span>
            ))}
            <a href={`mailto:${CONTACT_EMAIL}`} className="block hover:text-[#ff5500] transition-colors">
              {CONTACT_EMAIL}
            </a>
          </div>
          <Link
            to="/quote"
            className="clip-parallelogram bg-[#ff5500] text-white font-headline px-6 py-2 text-lg
                       hover:scale-[1.02] transition-transform hover:shadow-[0_0_20px_rgba(255,85,0,0.3)]
                       inline-flex items-center justify-center mt-2 w-fit"
          >
            Get a Quote
          </Link>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-12 py-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="font-body text-stone-600 text-xs">
          © {new Date().getFullYear()} Layercade. {COPYRIGHT_QUIP}
        </span>
        <div className="flex gap-8 font-technical text-[10px] text-stone-600">
          <Link to="/privacy" className="hover:text-[#ff5500] transition-colors">Privacy_Policy</Link>
          <Link to="/terms" className="hover:text-[#ff5500] transition-colors">Terms_Of_Service</Link>
        </div>
      </div>
    </footer>
  );
}
