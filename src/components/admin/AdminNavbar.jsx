import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useCurrentMember } from '../../contexts/CurrentMemberContext';
import { useAdminBadges } from '../../lib/useAdminBadges';
import { GROUP_TAGLINES } from '../../lib/quips';
import CommandPalette from './CommandPalette';
import MemberAvatar from './MemberAvatar';
import AvatarPicker from './AvatarPicker';
import { shortcutLabel } from '../../lib/platform';

// Clicking the chip opens the avatar picker — it is the one place every admin
// sees their own face, so it is where they would look to change it.
function UserChip({ member, compact = false, onClick }) {
  if (!member) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title="Change avatar"
      className="flex items-center gap-2 px-2 py-1 border border-white/10 rounded-sm hover:border-[#ff5500]/40 transition-colors"
    >
      <MemberAvatar member={member} size={22} title="" />
      {!compact && (
        <span className="font-technical text-[10px] uppercase tracking-widest text-stone-300 whitespace-nowrap">
          {member.name.split(' ')[0]}
        </span>
      )}
    </button>
  );
}

/* ─── Navigation ──────────────────────────────────────────────────── */

// Eleven flat links no longer fit a 1280px bar, so the rest is grouped by what
// you are doing: listing it, making it, or paying for it.
//
// Dashboard and Orders stay outside the groups. Orders is the busiest page and
// the one that carries a pending count — putting the only badge that routinely
// fires behind a dropdown would make the most common task slower, not faster.
//
// `badge` names a count from useAdminBadges; a group shows the sum of its own.

const TOP_LINKS = [
  { label: 'Dashboard', to: '/admin',        end: true, icon: 'dashboard' },
  { label: 'Orders',    to: '/admin/orders',            icon: 'receipt_long', badge: 'orders' },
];

const NAV_GROUPS = [
  {
    id: 'catalogue',
    label: 'The Bait',
    icon: 'storefront',
    links: [
      { label: 'Products',   to: '/admin/products',   icon: 'inventory_2' },
      { label: 'Categories', to: '/admin/categories', icon: 'category' },
      { label: 'Reviews',    to: '/admin/reviews',    icon: 'rate_review', badge: 'reviews' },
    ],
  },
  {
    id: 'workshop',
    label: 'The Grind',
    icon: 'precision_manufacturing',
    links: [
      { label: 'Inventory', to: '/admin/inventory', icon: 'inventory',  badge: 'inventory' },
      { label: 'Tasks',     to: '/admin/tasks',     icon: 'task_alt',   badge: 'tasks' },
      { label: 'Ideas',     to: '/admin/ideas',     icon: 'lightbulb',  badge: 'ideas' },
    ],
  },
  {
    id: 'money',
    label: 'The Damage',
    icon: 'trending_down',
    links: [
      { label: 'Calculator', to: '/admin/calculator', icon: 'calculate' },
      { label: 'Invoices',   to: '/admin/invoices',   icon: 'receipt' },
      { label: 'Expenses',   to: '/admin/expenses',   icon: 'payments' },
    ],
  },
];

function groupTotal(group, badges) {
  return group.links.reduce((sum, l) => sum + (l.badge ? badges[l.badge] ?? 0 : 0), 0);
}

/* ─── Badge ───────────────────────────────────────────────────────── */

// Zero renders nothing at all: a row of "0" chips is noise pretending to be
// information.
function Badge({ count, tone = 'accent' }) {
  if (!count) return null;
  return (
    <span
      className={`font-technical text-[9px] leading-none px-1.5 py-1 flex-shrink-0 ${
        tone === 'accent'
          ? 'bg-[#ff5500]/20 text-[#ff5500]'
          : 'bg-white/10 text-stone-300'
      }`}
      style={{ fontFamily: "'Space Mono', monospace" }}
      aria-label={`${count} need attention`}
    >
      {count}
    </span>
  );
}

/* ─── Admin manifest ──────────────────────────────────────────────── */

// Admin-only web app manifest: lets the team install the admin to their home
// screen and share links into the Ideas board (public/admin/manifest.webmanifest).
// Added from here rather than index.html so shoppers never get an install prompt.
function useAdminManifest() {
  useEffect(() => {
    const add = (rel, href) => {
      if (document.head.querySelector(`link[rel="${rel}"]`)) return;
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      document.head.appendChild(link);
    };
    add('manifest', '/admin/manifest.webmanifest');
    add('apple-touch-icon', '/admin/icon-192.png');
  }, []);
}

/* ─── Desktop dropdown ────────────────────────────────────────────── */

function GroupMenu({ group, badges, isOpen, onToggle, onHover, onNavigate, activePath }) {
  const total = groupTotal(group, badges);
  const holdsActive = group.links.some((l) => activePath.startsWith(l.to));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        onMouseEnter={onHover}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center gap-2 px-3 py-1.5 border transition-colors ${
          isOpen || holdsActive
            ? 'text-[#ff5500] border-[#ff5500]/40 bg-[#ff5500]/5'
            : 'text-stone-400 hover:text-white border-transparent'
        }`}
      >
        <span
          className="uppercase whitespace-nowrap"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.04em' }}
        >
          {group.label}
        </span>
        <Badge count={total} />
        <span
          className="material-symbols-outlined flex-shrink-0 transition-transform"
          style={{ fontSize: 16, transform: isOpen ? 'rotate(180deg)' : 'none' }}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-60 bg-[#111111] border border-white/10 py-1 z-50"
          style={{ boxShadow: '0 0 20px rgba(255, 85, 0, 0.3)' }}
        >
          <p className="px-4 py-2 font-technical text-[9px] uppercase tracking-widest text-stone-600">
            {GROUP_TAGLINES[group.id]}
          </p>
          {group.links.map(({ label, to, icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  isActive
                    ? 'text-[#ff5500] bg-[#ff5500]/8'
                    : 'text-stone-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span
                className="material-symbols-outlined flex-shrink-0"
                style={{ fontSize: 18, fontVariationSettings: "'FILL' 0" }}
              >
                {icon}
              </span>
              <span className="font-technical text-[11px] uppercase tracking-widest flex-1">
                {label}
              </span>
              <Badge count={badge ? badges[badge] : 0} />
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Navbar ──────────────────────────────────────────────────────── */

export default function AdminNavbar() {
  useAdminManifest();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { member } = useCurrentMember();
  const badges = useAdminBadges();

  const [open, setOpen] = useState(false);          // mobile drawer
  const [openGroup, setOpenGroup] = useState(null); // desktop dropdown
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const drawerRef = useRef(null);
  const navRef = useRef(null);

  const totalWaiting = Object.values(badges).reduce((a, b) => a + b, 0);

  // Close everything on route change
  useEffect(() => {
    setOpen(false);
    setOpenGroup(null);
  }, [location.pathname]);

  // Close drawer on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!openGroup) return;
    const onClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenGroup(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpenGroup(null); };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [openGroup]);

  /* ── ⌘K ─────────────────────────────────────────────────────── */

  // Don't stack the palette on top of a page modal — those own Escape, and one
  // keypress closing two things is worse than the shortcut not firing. Every
  // admin modal is a `fixed inset-0` backdrop, so its presence is the signal.
  const anotherOverlayOpen = useCallback(
    () => !!document.querySelector('.fixed.inset-0'),
    [],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key?.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return;
      if (!paletteOpen && anotherOverlayOpen()) return;
      e.preventDefault();
      setPaletteOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, anotherOverlayOpen]);

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <>
      <header className="bg-[#111111] border-b border-white/10 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3 sticky top-0 z-40">
        {/* Logo */}
        <NavLink to="/admin" end className="flex items-center gap-2.5 flex-shrink-0">
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
        <nav ref={navRef} className="hidden lg:flex items-center gap-1">
          {TOP_LINKS.map(({ label, to, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 font-technical text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                  isActive
                    ? 'text-[#ff5500] border-[#ff5500]/40 bg-[#ff5500]/5'
                    : 'text-stone-400 hover:text-white border-transparent'
                }`
              }
            >
              {label}
              <Badge count={badge ? badges[badge] : 0} />
            </NavLink>
          ))}

          {NAV_GROUPS.map((group) => (
            <GroupMenu
              key={group.id}
              group={group}
              badges={badges}
              activePath={location.pathname}
              isOpen={openGroup === group.id}
              onToggle={() => setOpenGroup((g) => (g === group.id ? null : group.id))}
              // Hover only switches between groups once one is open: opening on
              // hover alone makes a menu this size fire by accident.
              onHover={() => setOpenGroup((g) => (g ? group.id : g))}
              onNavigate={() => setOpenGroup(null)}
            />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* ⌘K hint — a palette nobody knows about is a palette nobody uses */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 border border-white/10
                       text-stone-500 hover:text-[#ff5500] hover:border-[#ff5500]/40 transition-colors"
            aria-label="Open command palette"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>search</span>
            <span className="font-technical text-[10px] tracking-widest">{shortcutLabel('K')}</span>
          </button>

          {/* Desktop user chip (with name) */}
          <div className="hidden lg:flex">
            <UserChip member={member} onClick={() => setAvatarOpen(true)} />
          </div>

          {/* Desktop logout */}
          <button
            onClick={handleLogout}
            className="hidden lg:flex items-center gap-2 font-technical text-xs uppercase tracking-widest
                       text-stone-400 hover:text-[#ff5500] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
            Logout
          </button>

          {/* Mobile user chip (compact, always visible) */}
          <div className="flex lg:hidden">
            <UserChip member={member} compact onClick={() => setAvatarOpen(true)} />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden relative flex items-center justify-center w-9 h-9 text-stone-400 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {open ? 'close' : 'menu'}
            </span>
            {/* One dot is enough on mobile — the drawer carries the numbers */}
            {!open && totalWaiting > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#ff5500]" />
            )}
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
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="uppercase tracking-tight text-white"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem' }}
            >
              Menu
            </span>
            {member && <UserChip member={member} onClick={() => { setOpen(false); setAvatarOpen(true); }} />}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-stone-500 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Drawer links — same groups, all expanded: collapsing eleven items
            behind three taps buys nothing on a screen that already scrolls. */}
        <nav className="flex-1 overflow-y-auto py-2">
          {TOP_LINKS.map((link) => (
            <DrawerLink key={link.to} link={link} badges={badges} />
          ))}

          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="mt-2">
              <div className="px-5 pt-3 pb-1.5 flex items-center justify-between gap-2">
                <span
                  className="uppercase text-stone-500"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '0.08em' }}
                >
                  {group.label}
                </span>
                <Badge count={groupTotal(group, badges)} />
              </div>
              {/* Signature divider, per DESIGN.md */}
              <div
                className="h-px mx-5 mb-1"
                style={{ background: 'linear-gradient(to right, transparent, #ff5500, transparent)', opacity: 0.4 }}
              />
              {group.links.map((link) => (
                <DrawerLink key={link.to} link={link} badges={badges} />
              ))}
            </div>
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

      {/* Mounted only while open, so each ⌘K starts from a clean slate */}
      <AnimatePresence>
        {paletteOpen && (
          <CommandPalette
            onClose={() => setPaletteOpen(false)}
            onAction={(action) => {
              if (action === 'avatar') setAvatarOpen(true);
              if (action === 'logout') handleLogout();
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {avatarOpen && <AvatarPicker onClose={() => setAvatarOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function DrawerLink({ link, badges }) {
  const { label, to, end, icon, badge } = link;
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-5 py-3 font-technical text-sm uppercase tracking-widest transition-colors ${
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
      <span className="flex-1">{label}</span>
      <Badge count={badge ? badges[badge] : 0} />
    </NavLink>
  );
}
