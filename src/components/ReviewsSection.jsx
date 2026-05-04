import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET  = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// ── Helpers ────────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="text-orange-500 transition-transform hover:scale-110"
          aria-label={`${s} star${s !== 1 ? 's' : ''}`}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 28,
              fontVariationSettings: `'FILL' ${s <= (hovered || value) ? 1 : 0}`,
            }}
          >
            star
          </span>
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating, size = 14 }) {
  return (
    <div className="flex gap-0.5 text-orange-500">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className="material-symbols-outlined"
          style={{ fontSize: size, fontVariationSettings: `'FILL' ${s <= rating ? 1 : 0}` }}
        >
          star
        </span>
      ))}
    </div>
  );
}

function avatarInitials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const date = new Date(review.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <article className="border border-white/10 bg-[#141414] p-5">
      <div className="flex items-start justify-between gap-3">
        {/* Reviewer identity */}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-11 h-11 rounded-full bg-[#1e2a3a] border border-white/10 flex items-center justify-center"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              <span className="text-sm font-bold text-blue-300">
                {avatarInitials(review.reviewer_name)}
              </span>
            </div>
            {/* Verified tick */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border border-[#141414]"
            >
              <span className="material-symbols-outlined text-white" style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}>
                check
              </span>
            </span>
          </div>

          {/* Name + badge + date */}
          <div>
            <p className="font-technical text-[11px] uppercase tracking-[0.15em] text-white leading-tight">
              {review.reviewer_name}
            </p>
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40">
              <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              <span className="font-technical text-[9px] uppercase tracking-[0.1em] text-blue-400">
                Verified
              </span>
            </span>
            <p className="font-technical text-[9px] text-stone-600 mt-1">{date}</p>
          </div>
        </div>

        <StarDisplay rating={review.rating} />
      </div>

      {review.body && (
        <div className="mt-3">
          <p className={`text-sm leading-6 text-stone-300 ${!expanded && review.body.length > 240 ? 'line-clamp-3' : ''}`}>
            {review.body}
          </p>
          {review.body.length > 240 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 font-technical text-[10px] uppercase tracking-[0.15em] text-[#ff5500] hover:underline"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {review.image_urls?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {review.image_urls.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(url)}
              className="w-20 h-20 border border-white/10 overflow-hidden hover:border-[#ff5500]/60 transition-colors"
            >
              <img src={url} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Review photo" className="max-h-[85vh] max-w-full object-contain" />
        </div>
      )}
    </article>
  );
}

// ── Submit form ────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', rating: 0, body: '' };

function SubmitForm({ productId, onSubmitted }) {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [files, setFiles]       = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const fileRef = useRef();

  const handleFiles = (selected) => {
    const arr = Array.from(selected).slice(0, 4);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (i) => {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const uploadToCloudinary = async (file) => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('folder', 'reviews');
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: data });
    if (!res.ok) throw new Error('Image upload failed');
    const json = await res.json();
    return json.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (form.rating === 0)  { setError('Please select a star rating.'); return; }

    setUploading(true);
    try {
      const imageUrls = files.length
        ? await Promise.all(files.map(uploadToCloudinary))
        : [];

      const { error: dbErr } = await supabase.from('reviews').insert({
        product_id:    productId,
        reviewer_name: form.name.trim(),
        rating:        form.rating,
        body:          form.body.trim() || null,
        image_urls:    imageUrls,
        status:        'pending',
      });

      if (dbErr) throw dbErr;
      setSuccess(true);
      setForm(EMPTY_FORM);
      setFiles([]);
      setPreviews([]);
      onSubmitted?.();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="border border-green-800/60 bg-green-950/20 p-6 text-center">
        <span className="material-symbols-outlined text-green-400 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
        <p className="mt-3 font-headline text-2xl text-white">Review Submitted!</p>
        <p className="mt-2 font-technical text-[11px] uppercase tracking-[0.2em] text-stone-400">
          Your review is pending approval and will appear shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-white/10 bg-[#141414] p-6 space-y-5">
      <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">
        Write a Review
      </p>

      {/* Name */}
      <div>
        <label className="block font-technical text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1.5">
          Your Name *
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          maxLength={80}
          placeholder="e.g. Raqueed A."
          className="w-full bg-[#1a1a1a] border border-white/10 px-4 py-2.5 text-sm text-white placeholder-stone-600
                     focus:outline-none focus:border-[#ff5500]/60 transition-colors"
        />
      </div>

      {/* Star picker */}
      <div>
        <label className="block font-technical text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1.5">
          Rating *
        </label>
        <StarPicker value={form.rating} onChange={(r) => setForm((f) => ({ ...f, rating: r }))} />
      </div>

      {/* Review text */}
      <div>
        <label className="block font-technical text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1.5">
          Review (optional)
        </label>
        <textarea
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          rows={4}
          maxLength={1000}
          placeholder="Share your experience with this product..."
          className="w-full bg-[#1a1a1a] border border-white/10 px-4 py-2.5 text-sm text-white placeholder-stone-600
                     focus:outline-none focus:border-[#ff5500]/60 transition-colors resize-none"
        />
      </div>

      {/* Image upload */}
      <div>
        <label className="block font-technical text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1.5">
          Photos (optional, up to 4)
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {previews.map((src, i) => (
              <div key={i} className="relative w-20 h-20 border border-white/10 overflow-hidden">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 flex items-center justify-center text-white hover:text-[#ff5500]"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                </button>
              </div>
            ))}
          </div>
        )}
        {files.length < 4 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 border border-white/10 px-4 py-2 font-technical text-[10px]
                       uppercase tracking-[0.2em] text-stone-400 hover:border-white/30 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_photo_alternate</span>
            Add Photos
          </button>
        )}
      </div>

      {error && (
        <p className="font-technical text-[10px] uppercase tracking-[0.15em] text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="clip-parallelogram bg-[#ff5500] px-8 py-3 font-headline text-xl text-white
                   hover:shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export default function ReviewsSection({ productId }) {
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, reviewer_name, rating, body, image_urls, created_at')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    setReviews(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchReviews();
  }, [productId]);

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <section className="border-t border-white/10 bg-[#0e0e0e] p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">
            Customer Reviews
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <h2 className="font-headline text-4xl text-white">
              {loading ? '—' : reviews.length === 0 ? 'No Reviews Yet' : `${reviews.length} Review${reviews.length !== 1 ? 's' : ''}`}
            </h2>
            {avgRating && (
              <div className="flex items-center gap-2 pb-1">
                <StarDisplay rating={Math.round(Number(avgRating))} size={16} />
                <span className="font-technical text-[11px] text-stone-400">{avgRating} / 5</span>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="clip-parallelogram border border-[#ff5500]/50 px-6 py-2.5 font-headline text-lg text-white
                     hover:bg-[#ff5500]/10 transition-colors self-start sm:self-auto"
        >
          {showForm ? 'Cancel' : 'Write a Review'}
        </button>
      </div>

      {/* Submit form */}
      {showForm && (
        <div className="mb-8">
          <SubmitForm
            productId={productId}
            onSubmitted={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <p className="font-technical text-[10px] uppercase tracking-[0.2em] text-stone-600">Loading…</p>
      ) : reviews.length === 0 ? (
        <div className="border border-white/5 bg-[#141414] p-8 text-center">
          <span className="material-symbols-outlined text-stone-700 text-5xl" style={{ fontVariationSettings: "'FILL' 0" }}>
            rate_review
          </span>
          <p className="mt-3 font-technical text-[10px] uppercase tracking-[0.2em] text-stone-600">
            Be the first to review this product
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </section>
  );
}
