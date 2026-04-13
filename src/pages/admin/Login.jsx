import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError('Invalid credentials. Please try again.');
      return;
    }

    navigate('/admin/orders', { replace: true });
  };

  const inputClass =
    'w-full bg-[#080808] border-b border-stone-800 text-white p-3 ' +
    'focus:outline-none focus:border-[#ff5500] transition-colors ' +
    'placeholder:text-stone-700 font-body';

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo / heading */}
        <div className="mb-10 text-center">
          <p className="font-technical text-[#ff5500] text-xs uppercase tracking-widest mb-2">
            Admin Panel
          </p>
          <h1
            className="text-white uppercase tracking-tight"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', lineHeight: 1 }}
          >
            Layercade
          </h1>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-white/10 p-8">
          <h2
            className="text-white uppercase mb-8"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem' }}
          >
            Sign In
          </h2>

          {error && (
            <div className="mb-6 bg-red-950/40 border border-red-800/60 p-3 flex items-center gap-3">
              <span
                className="material-symbols-outlined text-red-500 flex-shrink-0"
                style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
              >
                error
              </span>
              <p className="font-body text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-2">
              <label className="font-technical text-xs text-stone-400 uppercase tracking-widest block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@layercade.com"
                disabled={loading}
                required
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label className="font-technical text-xs text-stone-400 uppercase tracking-widest block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                required
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff5500] text-white py-4 mt-2
                         clip-parallelogram hover:shadow-[0_0_20px_rgba(255,85,0,0.3)]
                         transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
                         flex items-center justify-center gap-3"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.05em' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  SIGNING IN...
                </>
              ) : (
                'SIGN IN →'
              )}
            </button>
          </form>
        </div>

        <p className="font-technical text-[10px] text-stone-700 text-center uppercase tracking-widest mt-6">
          Layercade Admin — Restricted Access
        </p>
      </motion.div>
    </div>
  );
}
