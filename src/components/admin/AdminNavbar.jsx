import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const NAV_LINKS = [
  { label: 'Dashboard',  to: '/admin',            end: true,  icon: 'dashboard' },
  { label: 'Orders',     to: '/admin/orders',                 icon: 'receipt_long' },
  { label: 'Products',   to: '/admin/products',               icon: 'inventory_2' },
  { label: 'Categories', to: '/admin/categories',             icon: 'category' },
  { label: 'Calculator', to: '/admin/calculator',             icon: 'calculate' },
  { label: 'Invoices',   to: '/admin/invoices',               icon: 'receipt' },
  { label: 'Tasks',      to: '/admin/tasks',                  icon: 'task_alt' },
  { label: 'Expenses',   to: '/admin/expenses',               icon: 'payments' },
];

export default function AdminNavbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Close drawer on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <>
      <header className="bg-[#111111] border-b border-white/10 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-40">
        {/* Logo */}
        <NavLink to="/admin" end className="flex items-center gap-2.5">
          <span
            className="uppercase tracking-tight text-white hover:text-[#ff5500] transition-colors"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem' }}
          >
            Layercade
          </span>
          <span className="font-technical text-[9px] text-stone-500 uppercase tracking-widest border border-white/10 px-1.5 py-0.5 hidden sm:inline">
            Admin
          </span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(({ label, to, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `font-technical text-xs uppercase tracking-widest px-3 py-1.5 transition-colors ${
                  isActive
                    ? 'text-[#ff5500] border border-[#ff5500]/40 bg-[#ff5500]/5'
                    : 'text-stone-400 hover:text-white border border-transparent'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Desktop logout */}
          <button
            onClick={handleLogout}
            className="hidden lg:flex items-center gap-2 font-technical text-xs uppercase tracking-widest
                       text-stone-400 hover:text-[#ff5500] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
            Logout
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden flex items-center justify-center w-9 h-9 text-stone-400 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {open ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" />
      )}

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        className={`lg:hidden fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-[#111111] border-l border-white/10 z-40
                    flex flex-col transform transition-transform duration-200 ease-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span
            className="uppercase tracking-tight text-white"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem' }}
          >
            Menu
          </span>
          <button
            onClick={() => setOpen(false)}
            className="text-stone-500 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Drawer links */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_LINKS.map(({ label, to, end, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3.5 font-technical text-sm uppercase tracking-widest transition-colors ${
                  isActive
                    ? 'text-[#ff5500] bg-[#ff5500]/8 border-r-2 border-[#ff5500]'
                    : 'text-stone-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span
                className="material-symbols-outlined flex-shrink-0"
                style={{ fontSize: 20, fontVariationSettings: "'FILL' 0" }}
              >
                {icon}
              </span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Drawer logout */}
        <div className="p-5 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-3 font-technical text-sm uppercase
                       tracking-widest text-stone-400 hover:text-[#ff5500] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
