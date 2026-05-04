import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminNavbar from '../../components/admin/AdminNavbar';

function avatarInitials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5 text-orange-500">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className="material-symbols-outlined"
          style={{ fontSize: 14, fontVariationSettings: `'FILL' ${s <= rating ? 1 : 0}` }}
        >
          star
        </span>
      ))}
    </div>
  );
}

const STATUS_TABS = [
  { key: 'pending',  label: 'Pending',  color: 'text-[#ff5500]',  border: 'border-[#ff5500]' },
  { key: 'approved', label: 'Approved', color: 'text-green-400',  border: 'border-green-500' },
  { key: 'rejected', label: 'Rejected', color: 'text-red-400',    border: 'border-red-500' },
];

export default function AdminReviews() {
  const [tab, setTab]         = useState('pending');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts]   = useState({ pending: 0, approved: 0, rejected: 0 });
  const [lightbox, setLightbox] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reviews')
      .select('id, product_id, reviewer_name, rating, body, image_urls, status, created_at, products(name, slug)')
      .eq('status', tab)
      .order('created_at', { ascending: false });
    setReviews(data ?? []);
    setLoading(false);
  };

  const fetchCounts = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('status');
    if (!data) return;
    const c = { pending: 0, approved: 0, rejected: 0 };
    data.forEach((r) => { if (c[r.status] !== undefined) c[r.status]++; });
    setCounts(c);
  };

  useEffect(() => {
    fetchReviews();
  }, [tab]);

  useEffect(() => {
    fetchCounts();
  }, [reviews]);

  const updateStatus = async (id, newStatus) => {
    await supabase.from('reviews').update({ status: newStatus }).eq('id', id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    fetchCounts();
  };

  const deleteReview = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    await supabase.from('reviews').delete().eq('id', id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    fetchCounts();
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#080808]">
      <AdminNavbar />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* Page header */}
        <div className="mb-6">
          <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">Admin</p>
          <h1 className="mt-1 font-headline text-5xl text-white">Reviews</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {STATUS_TABS.map(({ key, label, color, border }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative px-4 py-2 font-technical text-[11px] uppercase tracking-[0.2em] transition-colors
                          ${tab === key ? `${color}` : 'text-stone-500 hover:text-stone-300'}`}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[9px] rounded-full
                                  ${key === 'pending' ? 'bg-[#ff5500]/20 text-[#ff5500]' : 'bg-white/10 text-stone-400'}`}>
                  {counts[key]}
                </span>
              )}
              {tab === key && (
                <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${border.replace('border-', 'bg-')}`} />
              )}
            </button>
          ))}
        </div>

        {/* Review list */}
        {loading ? (
          <p className="font-technical text-[10px] uppercase tracking-[0.2em] text-stone-600">Loading…</p>
        ) : reviews.length === 0 ? (
          <div className="border border-white/5 bg-[#111] p-10 text-center">
            <span className="material-symbols-outlined text-stone-700 text-5xl" style={{ fontVariationSettings: "'FILL' 0" }}>
              rate_review
            </span>
            <p className="mt-3 font-technical text-[10px] uppercase tracking-[0.2em] text-stone-600">
              No {tab} reviews
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <article key={review.id} className="border border-white/10 bg-[#111111] p-5">
                {/* Meta row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full bg-[#1e2a3a] border border-white/10 flex items-center justify-center"
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        <span className="text-sm font-bold text-blue-300">
                          {avatarInitials(review.reviewer_name)}
                        </span>
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border border-[#111111]">
                        <span className="material-symbols-outlined text-white" style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}>check</span>
                      </span>
                    </div>
                    <div>
                      <p className="font-technical text-[11px] uppercase tracking-[0.15em] text-white leading-tight">
                        {review.reviewer_name}
                      </p>
                      <p className="font-technical text-[9px] text-stone-600 mt-0.5">{formatDate(review.created_at)}</p>
                      {review.products && (
                        <a
                          href={`/products/${review.products.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 font-technical text-[10px] uppercase tracking-[0.15em] text-[#ff5500] hover:underline"
                        >
                          {review.products.name}
                        </a>
                      )}
                    </div>
                  </div>
                  <StarDisplay rating={review.rating} />
                </div>

                {/* Body */}
                {review.body && (
                  <p className="mt-3 text-sm leading-6 text-stone-300">{review.body}</p>
                )}

                {/* Images */}
                {review.image_urls?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {review.image_urls.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightbox(url)}
                        className="w-20 h-20 border border-white/10 overflow-hidden hover:border-[#ff5500]/60 transition-colors"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                  {tab !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(review.id, 'approved')}
                      className="flex items-center gap-1.5 border border-green-800/50 bg-green-950/20 px-4 py-1.5
                                 font-technical text-[10px] uppercase tracking-[0.15em] text-green-400
                                 hover:bg-green-950/40 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                      Approve
                    </button>
                  )}
                  {tab !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(review.id, 'rejected')}
                      className="flex items-center gap-1.5 border border-yellow-800/50 bg-yellow-950/20 px-4 py-1.5
                                 font-technical text-[10px] uppercase tracking-[0.15em] text-yellow-400
                                 hover:bg-yellow-950/40 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>block</span>
                      Reject
                    </button>
                  )}
                  {tab === 'approved' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(review.id, 'pending')}
                      className="flex items-center gap-1.5 border border-white/10 px-4 py-1.5
                                 font-technical text-[10px] uppercase tracking-[0.15em] text-stone-400
                                 hover:text-white hover:border-white/30 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>undo</span>
                      Unpublish
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteReview(review.id)}
                    className="ml-auto flex items-center gap-1.5 border border-red-900/40 bg-red-950/10 px-4 py-1.5
                               font-technical text-[10px] uppercase tracking-[0.15em] text-red-500
                               hover:bg-red-950/30 transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Review photo" className="max-h-[85vh] max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
