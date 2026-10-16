import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useCurrentMember } from '../../contexts/CurrentMemberContext';
import MemberAvatar from './MemberAvatar';
import { AVATAR_STYLES, AVATAR_SEEDS, avatarUri } from '../../lib/avatars';

/**
 * Lets the signed-in member pick their own avatar. Opened from the navbar
 * user chip. The member's colour stays as the background, so the picker only
 * chooses the character on top of it.
 */

const SHUFFLE_WORDS = [
  'Bolt', 'Raft', 'Brim', 'Purge', 'Hotend', 'Skirt', 'Gantry', 'Spool', 'Layer',
  'Infill', 'Bridge', 'Retract', 'Stringy', 'Warp', 'Klipper', 'Ooze', 'Jerk', 'Bed',
];

function randomSeeds(n) {
  return Array.from({ length: n }, () => {
    const w = SHUFFLE_WORDS[Math.floor(Math.random() * SHUFFLE_WORDS.length)];
    return `${w}${Math.floor(Math.random() * 1000)}`;
  });
}

export default function AvatarPicker({ onClose }) {
  const { member, refresh } = useCurrentMember();
  const current = member?.avatar || null;

  const [styleId, setStyleId] = useState(() => current?.split(':')[0] || AVATAR_STYLES[0].id);
  const [seeds, setSeeds] = useState(AVATAR_SEEDS);
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const options = useMemo(() => seeds.map((seed) => `${styleId}:${seed}`), [seeds, styleId]);

  if (!member) return null;

  const save = async (value) => {
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('members').update({ avatar: value }).eq('id', member.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    await refresh();
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        role="dialog"
        aria-label="Pick your avatar"
        className="w-full max-w-md bg-[#111111] border border-white/10 max-h-[90vh] flex flex-col"
        style={{ boxShadow: '0 0 20px rgba(255, 85, 0, 0.3)' }}
        initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
      >
        {/* Header with live preview */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-white/10">
          <MemberAvatar member={{ ...member, avatar: selected }} size={56} glow />
          <div className="flex-1 min-w-0">
            <p className="font-technical text-[9px] uppercase tracking-widest text-stone-500">Your face, for now</p>
            <p
              className="text-white uppercase truncate"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.04em' }}
            >
              {member.name}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors self-start" aria-label="Close">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Style tabs */}
        <div className="flex border-b border-white/10">
          {AVATAR_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyleId(s.id)}
              className={`flex-1 py-2.5 font-technical text-[10px] uppercase tracking-widest transition-colors border-b-2 ${
                styleId === s.id
                  ? 'text-[#ff5500] border-[#ff5500]'
                  : 'text-stone-500 hover:text-white border-transparent'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="p-4 overflow-y-auto">
          <div className="grid grid-cols-4 gap-2">
            {options.map((value) => {
              const isSel = value === selected;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelected(value)}
                  aria-pressed={isSel}
                  className={`aspect-square p-1 border transition-all ${
                    isSel ? 'border-[#ff5500] bg-[#ff5500]/10 scale-[1.03]' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img
                    src={avatarUri(value, member.color)}
                    alt=""
                    className="w-full h-full block"
                    style={{ borderRadius: 3 }}
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setSeeds(randomSeeds(AVATAR_SEEDS.length))}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 border border-white/10
                       font-technical text-[10px] uppercase tracking-widest text-stone-400
                       hover:text-[#ff5500] hover:border-[#ff5500]/40 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>casino</span>
            Shuffle
          </button>

          {error && <p className="mt-3 font-technical text-[10px] text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
          {current && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save(null)}
              className="font-technical text-[10px] uppercase tracking-widest text-stone-500 hover:text-white transition-colors disabled:opacity-40"
            >
              Back to initials
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 font-technical text-[10px] uppercase tracking-widest text-stone-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !selected || selected === current}
            onClick={() => save(selected)}
            className="px-4 py-2 bg-[#ff5500] text-black font-technical text-[10px] uppercase tracking-widest font-bold
                       hover:bg-[#ff6a1f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Use this'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
