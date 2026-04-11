import { Link } from 'react-router-dom';

export default function Footer() {
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
            Pushing the boundaries of additive manufacturing. Precision engineering
            for enthusiasts and industries.
          </p>
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-[#ff5500] hover:scale-110 transition-transform cursor-pointer select-none">
              mail
            </span>
            <span className="material-symbols-outlined text-[#ff5500] hover:scale-110 transition-transform cursor-pointer select-none">
              share
            </span>
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
          <div className="font-technical text-[10px] text-stone-600 space-y-1">
            <p>STATUS: OPTIMAL</p>
            <p>LATENCY: 12MS</p>
            <p>UPTIME: 99.98%</p>
            <p>LOCATION: DHAKA, BD</p>
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-3">
          <h5 className="font-headline text-white text-xl tracking-wider mb-2">Contact</h5>
          <div className="font-technical text-xs text-stone-500 leading-loose">
            LAYER_HEADQUARTERS<br />
            INDUSTRIAL ZONE 7<br />
            DHAKA, BANGLADESH
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
          © 2024 Layercade. Precision. Layer by Layer.
        </span>
        <div className="flex gap-8 font-technical text-[10px] text-stone-600">
          <span className="hover:text-[#ff5500] cursor-pointer transition-colors">Privacy_Policy</span>
          <span className="hover:text-[#ff5500] cursor-pointer transition-colors">Terms_Of_Service</span>
        </div>
      </div>
    </footer>
  );
}
