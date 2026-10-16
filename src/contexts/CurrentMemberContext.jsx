import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const CurrentMemberContext = createContext({
  member: null,
  loading: true,
  error: null,
  refresh: () => {},
});

export function CurrentMemberProvider({ session, children }) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = session?.user?.id ?? null;

  // `quiet` re-fetches without flipping `loading`: ProtectedRoute swaps the
  // whole page for a spinner while loading, which a profile edit must not do.
  async function load(uid, { quiet = false } = {}) {
    if (!uid) {
      setMember(null);
      setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('auth_user_id', uid)
      .maybeSingle();

    if (error) {
      setError(error);
      if (!quiet) setMember(null);
    } else {
      setError(null);
      setMember(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    load(userId);
  }, [userId]);

  return (
    <CurrentMemberContext.Provider
      value={{ member, loading, error, refresh: () => load(userId, { quiet: true }) }}
    >
      {children}
    </CurrentMemberContext.Provider>
  );
}

export function useCurrentMember() {
  return useContext(CurrentMemberContext);
}
