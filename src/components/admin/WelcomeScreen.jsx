import { useEffect, useRef, useState } from 'react';
import { useCurrentMember } from '../../contexts/CurrentMemberContext';
import { WELCOME, quip } from '../../lib/quips';
import MemberAvatar from './MemberAvatar';

export default function WelcomeGuard({ children }) {
  const { member, loading } = useCurrentMember();
  const [phase, setPhase] = useState('loading'); // 'loading' | 'greet' | 'fade' | 'done'
  const started = useRef(false);

  // Chosen once per session so it cannot change during the fade.
  const [greeting] = useState(() => quip(WELCOME));

  useEffect(() => {
    if (loading || started.current) return;

    const shouldShow = sessionStorage.getItem('show_welcome') === '1';
    if (!shouldShow || !member) {
      setPhase('done');
      return;
    }

    // Mark as started so no re-run can restart or clear the timers
    started.current = true;
    sessionStorage.removeItem('show_welcome');
    setPhase('greet');
    // No cleanup returned — timers must run to full duration uninterrupted
    setTimeout(() => setPhase('fade'), 5000);
    setTimeout(() => setPhase('done'), 5700);
  }, [loading, member]);

  if (phase === 'done') return children;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#080808] flex flex-col items-center justify-center gap-6"
      style={{ transition: 'opacity 0.6s ease', opacity: phase === 'fade' ? 0 : 1 }}
    >
      <div className="flex flex-col items-center gap-3">
        <span
          className="uppercase tracking-tight text-white"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', letterSpacing: '0.05em' }}
        >
          Layercade
        </span>
        <span className="font-technical text-[9px] text-stone-500 uppercase tracking-widest border border-white/10 px-2 py-1">
          Admin
        </span>
      </div>

      {phase === 'loading' && (
        <svg className="animate-spin w-6 h-6 text-[#ff5500]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}

      {(phase === 'greet' || phase === 'fade') && member && (
        <div className="flex flex-col items-center gap-4">
          <MemberAvatar member={member} size={64} glow />
          <div className="text-center">
            <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-1">
              {greeting}
            </p>
            <p
              className="text-white uppercase"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.05em' }}
            >
              {member.name}
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <div className="w-8 h-[2px] bg-[#ff5500] opacity-60" />
      </div>
    </div>
  );
}
