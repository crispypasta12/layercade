import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const NAV_LINKS = [
  { label: 'Dashboard',  to: '/admin',            end: true },
  { label: 'Orders',     to: '/admin/orders' },
  { label: 'Products',   to: '/admin/products' },
  { label: 'Categories', to: '/admin/categories' },
];

export default function AdminNavbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <header className="bg-[#111111] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      {/* Logo + nav links */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span
            className="uppercase tracking-tight text-white"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem' }}
          >
            Layercade
          </span>
          <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest border border-white/10 px-2 py-0.5">
            Admin
          </span>
        </div>

        <nav className="flex items-center gap-1">
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
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 font-technical text-xs uppercase tracking-widest
                   text-stone-400 hover:text-[#ff5500] transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
        Logout
      </button>
    </header>
  );
}
