import { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import CartDrawer from './CartDrawer';
import { supabase } from '../lib/supabase';

const navLinks = [
  { label: 'Shop',         to: '/shop' },
  { label: 'Best Sellers', to: '/#best-sellers' },
  { label: 'Process',      to: '/process' },
  { label: 'Materials',    to: '/materials' },
  { label: 'Gallery',      to: '/gallery' },
];

export default function Navbar() {
  const [scrolled,       setScrolled]       = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [logoClicks,     setLogoClicks]     = useState(0);
  const [adminVisible,   setAdminVisible]   = useState(false);
  const [pendingCount,   setPendingCount]   = useState(0);
  const logoClickTimer = useRef(null);
  const { openCart, items } = useCartStore();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Fetch pending order count once admin link is revealed
  useEffect(() => {
    if (!adminVisible) return;
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0));
  }, [adminVisible]);

  // 5-click logo easter egg
  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    clearTimeout(logoClickTimer.current);
    if (next >= 5) {
      setAdminVisible(true);
      setLogoClicks(0);
    } else {
      // Reset counter if user stops clicking within 2 seconds
      logoClickTimer.current = setTimeout(() => setLogoClicks(0), 2000);
    }
  };

  const handleHashLink = (e, to) => {
    if (to.startsWith('/#')) {
      e.preventDefault();
      setMenuOpen(false);
      const id = to.slice(2);
      // If we're not on home, navigate there first
      if (window.location.pathname !== '/') {
        window.location.href = to;
        return;
      }
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setMenuOpen(false);
    }
  };

  return (
    <>
    <nav
      className={`fixed top-[36px] w-full z-[100] flex justify-between items-center px-8 h-20 transition-all duration-300 ${
        scrolled
          ? 'bg-stone-950/90 backdrop-blur-md border-b border-white/5'
          : 'bg-stone-950/80 backdrop-blur-md border-b border-white/5'
      }`}
    >
      {/* Logo — click 5× to reveal admin link */}
      <Link
        to="/"
        onClick={handleLogoClick}
        className="font-headline font-black text-2xl tracking-tighter text-white uppercase italic select-none"
      >
        Layercade
      </Link>

      {/* Desktop Links */}
      <div className="hidden md:flex gap-8 items-center">
        {navLinks.map(({ label, to }) => (
          to.startsWith('/#') ? (
            <a
              key={label}
              href={to}
              onClick={(e) => handleHashLink(e, to)}
              className="font-body font-medium tracking-wide text-stone-400 hover:text-white transition-colors duration-300"
            >
              {label}
            </a>
          ) : (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `font-body font-medium tracking-wide transition-colors duration-300 ${
                  isActive
                    ? 'text-primary border-b-2 border-primary pb-1'
                    : 'text-stone-400 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          )
        ))}
      </div>

      {/* CTA + Cart */}
      <div className="flex items-center gap-4">
        <Link
          to="/quote"
          className="clip-parallelogram bg-[#ff5500] text-white font-headline px-8 py-2 text-xl
                     hover:scale-[1.02] transition-transform
                     hover:shadow-[0_0_20px_rgba(255,85,0,0.3)]
                     active:scale-95 duration-100 hidden md:flex items-center justify-center"
        >
          Get a Quote
        </Link>

        {/* Hidden admin link — revealed after 5 logo clicks */}
        {adminVisible && (
          <Link
            to="/admin/orders"
            className="relative flex items-center justify-center text-stone-600 hover:text-stone-400 transition-colors p-1"
            title="Admin Panel"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>admin_panel_settings</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white font-technical text-[9px] flex items-center justify-center font-bold px-1">
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </Link>
        )}

        {/* Cart icon */}
        <button
          onClick={openCart}
          aria-label="Open cart"
          className="relative flex items-center justify-center text-stone-400 hover:text-white transition-colors p-1"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>shopping_cart</span>
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff5500] text-white font-technical text-[10px] flex items-center justify-center font-bold">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </button>

        {/* Hamburger */}
        <button
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden flex flex-col gap-[5px] p-2"
        >
          <span
            className={`block w-6 h-[2px] bg-white transition-all duration-300 origin-center ${
              menuOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`}
          />
          <span
            className={`block w-6 h-[2px] bg-white transition-all duration-300 ${
              menuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-6 h-[2px] bg-white transition-all duration-300 origin-center ${
              menuOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`absolute top-full left-0 w-full bg-stone-950/95 backdrop-blur-md border-b border-white/5
                    flex flex-col gap-0 md:hidden overflow-hidden transition-all duration-300 ${
          menuOpen ? 'max-h-[400px] py-4' : 'max-h-0'
        }`}
      >
        {navLinks.map(({ label, to }) => (
          to.startsWith('/#') ? (
            <a
              key={label}
              href={to}
              onClick={(e) => handleHashLink(e, to)}
              className="font-body font-medium tracking-wide text-stone-400 hover:text-white
                         px-8 py-4 border-b border-white/5 transition-colors duration-200"
            >
              {label}
            </a>
          ) : (
            <NavLink
              key={label}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `font-body font-medium tracking-wide px-8 py-4 border-b border-white/5
                 transition-colors duration-200 ${
                  isActive ? 'text-[#ff5500]' : 'text-stone-400 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          )
        ))}
        <Link
          to="/quote"
          onClick={() => setMenuOpen(false)}
          className="clip-parallelogram bg-[#ff5500] text-white font-headline text-xl
                     mx-8 my-4 py-3 flex items-center justify-center"
        >
          Get a Quote
        </Link>
      </div>
    </nav>
    <CartDrawer />
    </>
  );
}
