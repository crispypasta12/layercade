import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CurrentMemberProvider, useCurrentMember } from '../contexts/CurrentMemberContext';
import WelcomeGuard from './admin/WelcomeScreen';
import { ACCESS_DENIED, LOADING, quip } from '../lib/quips';

/** The whole-screen wait, with something to read while it happens. */
function AdminLoading() {
  // Picked once per mount: a line that reshuffled mid-wait would be unreadable.
  const [line] = useState(() => quip(LOADING));

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-5">
      <svg className="animate-spin w-8 h-8 text-[#ff5500]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p className="font-technical text-[10px] text-stone-600 uppercase tracking-widest text-center px-8">
        {line}
      </p>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <AdminLoading />;
  }

  if (!session) {
    // Remember where we were going (e.g. a link shared to the Ideas board) so
    // login can come back to it.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return (
    <CurrentMemberProvider session={session}>
      <MemberGuard>
        <WelcomeGuard>
          {children}
        </WelcomeGuard>
      </MemberGuard>
    </CurrentMemberProvider>
  );
}

/**
 * A session alone is not authorization — it only proves someone signed up.
 * The real gate is RLS (see supabase/migrations/*_restrict_admin_to_members),
 * this just stops a non-member loading an admin screen that would fail to
 * fetch anything anyway.
 */
function MemberGuard({ children }) {
  const { member, loading } = useCurrentMember();

  if (loading) {
    return <AdminLoading />;
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-6 px-8 text-center">
        <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest border border-white/10 px-2 py-1">
          Access denied
        </span>
        <p className="font-body text-stone-400 text-sm max-w-sm leading-relaxed">
          This account is not a member of the Layercade team.
        </p>
        <p className="font-technical text-[10px] text-stone-600 tracking-wide italic">
          {quip(ACCESS_DENIED, 'denied')}
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="font-headline text-xl text-[#ff5500] hover:text-white transition-colors"
        >
          SIGN OUT
        </button>
      </div>
    );
  }

  return children;
}
