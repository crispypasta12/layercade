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

  async function load(uid) {
    if (!uid) {
      setMember(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('auth_user_id', uid)
      .maybeSingle();

    if (error) {
      setError(error);
      setMember(null);
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
      value={{ member, loading, error, refresh: () => load(userId) }}
    >
      {children}
    </CurrentMemberContext.Provider>
  );
}

export function useCurrentMember() {
  return useContext(CurrentMemberContext);
}
