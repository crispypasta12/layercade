import { useState, useEffect, useRef } from 'react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import PageTagline from '../../components/admin/PageTagline';
import DeleteConfirmModal from '../../components/admin/DeleteConfirmModal';
import {
  fetchAllPromos, savePromo, deletePromo, dormantReason,
} from '../../lib/promos';
import {
  CLOUDINARY_UNSIGNED_LIMIT, compressImage, formatBytes, uploadErrorFor, useCompressUploads,
} from '../../lib/imageCompression';
import { emptyQuip } from '../../lib/quips';

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const LAYOUTS = [
  { value: 'full-bleed', label: 'Full bleed', hint: 'Art fills the slide, copy sits over it. Best for key art.' },
  { value: 'split',      label: 'Split',      hint: 'Image one side, copy the other. Best for a product shot.' },
];

/* Wide art often needs re-framing so the subject survives the mobile crop.
 *
 * These strings must appear here verbatim: Tailwind generates utilities by
 * scanning source, so a class that only ever exists in a database row never
 * gets any CSS. Adding an option here is what makes it real. */
const FRAMING = [
  { value: '',                                      label: 'Centre' },
  { value: 'object-[72%_center] md:object-center',  label: 'Favour right on mobile' },
  { value: 'object-[28%_center] md:object-center',  label: 'Favour left on mobile' },
  { value: 'object-[72%_center]',                   label: 'Favour right' },
  { value: 'object-[28%_center]',                   label: 'Favour left' },
  { value: 'object-[center_30%]',                   label: 'Favour top' },
  { value: 'object-[center_75%]',                   label: 'Favour bottom' },
];

const BLANK = {
  title: '', eyebrow: '', badge: '', body: '', footnote: '',
  image_url: '', image_alt: '', image_position: '', layout: 'full-bleed',
  accent: '', cta_label: '', cta_href: '', countdown_to: '',
  published: false, starts_at: '', ends_at: '', sort_order: 0,
};

/* ─── Helpers ──────────────────────────────────────────────────── */

/** timestamptz → value for <input type="datetime-local"> in local time. */
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
const blank = (v) => (v?.trim() ? v.trim() : null);

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—';

/* ─── Field primitives ─────────────────────────────────────────── */

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="font-technical text-[10px] uppercase tracking-[0.2em] text-stone-500">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 font-technical text-[9px] text-stone-600">{hint}</p>}
    </label>
  );
}

const inputCls =
  'w-full bg-[#111111] border-0 border-b border-stone-800 px-3 py-2 text-white font-body text-sm ' +
  'focus:outline-none focus:border-[#ff5500] transition-colors placeholder:text-stone-700';

/* ─── Editor ───────────────────────────────────────────────────── */

function Editor({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...BLANK,
    ...initial,
    countdown_to: toLocalInput(initial?.countdown_to),
    starts_at:    toLocalInput(initial?.starts_at),
    ends_at:      toLocalInput(initial?.ends_at),
    accent:       initial?.accent ?? '',
  }));
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [compressUploads] = useCompressUploads();
  const fileRef = useRef(null);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const upload = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadError('That is not an image.'); return; }
    if (file.size > MAX_FILE_SIZE)       { setUploadError('File must be under 50 MB.'); return; }

    setUploadError(null);
    setUploading(true);
    setUploadPct(0);

    const send = async () => {
      let out = file;
      if (compressUploads) {
        setCompressing(true);
        try { out = await compressImage(file); }
        catch {
          setUploading(false); setCompressing(false);
          setUploadError('Could not read that image. Try a different file.');
          return;
        }
        setCompressing(false);
      }

      const fd = new FormData();
      fd.append('file', out);
      fd.append('upload_preset', UPLOAD_PRESET);
      fd.append('folder', 'layercade/promos');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
      xhr.upload.addEventListener('progress', (evt) => {
        if (evt.lengthComputable) setUploadPct(Math.round((evt.loaded / evt.total) * 100));
      });
      xhr.onload = () => {
        setUploading(false); setCompressing(false);
        if (xhr.status === 200) {
          setForm((f) => ({ ...f, image_url: JSON.parse(xhr.responseText).secure_url }));
        } else {
          setUploadError(uploadErrorFor(xhr, out, compressUploads));
        }
      };
      xhr.onerror = () => {
        setUploading(false); setCompressing(false);
        setUploadError('Network error during upload. Please try again.');
      };
      xhr.send(fd);
    };

    send();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('A title is required.'); return; }
    if (form.accent && !/^#[0-9a-fA-F]{6}$/.test(form.accent)) {
      setError('Accent must be a 6-digit hex colour, e.g. #b388ff.'); return;
    }
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setError('The end time must be after the start time.'); return;
    }

    setSaving(true);
    setError(null);
    try {
      await savePromo(initial?.id, {
        title:          form.title.trim(),
        eyebrow:        blank(form.eyebrow),
        badge:          blank(form.badge),
        body:           blank(form.body),
        footnote:       blank(form.footnote),
        image_url:      blank(form.image_url),
        image_alt:      blank(form.image_alt),
        image_position: blank(form.image_position),
        layout:         form.layout,
        accent:         blank(form.accent),
        cta_label:      blank(form.cta_label),
        cta_href:       blank(form.cta_href),
        countdown_to:   fromLocalInput(form.countdown_to),
        starts_at:      fromLocalInput(form.starts_at),
        ends_at:        fromLocalInput(form.ends_at),
        published:      form.published,
        sort_order:     Number(form.sort_order) || 0,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const busy = uploading || compressing;

  return (
    <form onSubmit={submit} className="bg-[#161616] border border-white/5 p-6 md:p-8 space-y-7">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-headline text-3xl text-white">
          {initial?.id ? 'Edit slide' : 'New slide'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="font-technical text-[10px] uppercase tracking-[0.2em] text-stone-500 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* ── Art ── */}
      <section className="space-y-4">
        <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">Art</p>

        {form.image_url ? (
          <div className="relative w-full h-48 overflow-hidden bg-[#111111] border border-white/5">
            <img src={form.image_url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
              className="absolute top-2 right-2 bg-black/80 text-white w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
              aria-label="Remove image"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full h-48 border border-dashed border-stone-800 hover:border-[#ff5500] transition-colors
                       flex flex-col items-center justify-center gap-2 text-stone-600 hover:text-stone-400 disabled:opacity-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>add_photo_alternate</span>
            <span className="font-technical text-[10px] uppercase tracking-[0.2em]">
              {compressing ? 'Compressing…' : uploading ? `Uploading ${uploadPct}%` : 'Upload art'}
            </span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }}
        />

        {uploadError && <p className="font-technical text-[10px] text-red-400">{uploadError}</p>}
        <p className="font-technical text-[9px] text-stone-600">
          Wide, landscape art works best — roughly 16:9.{' '}
          {compressUploads
            ? 'Compressed before upload.'
            : `Uploaded untouched — Cloudinary refuses unsigned files over ${formatBytes(CLOUDINARY_UNSIGNED_LIMIT)}.`}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Layout" hint={LAYOUTS.find((l) => l.value === form.layout)?.hint}>
            <select value={form.layout} onChange={set('layout')} className={inputCls}>
              {LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>

          <Field label="Framing" hint="Which part of the art survives the mobile crop.">
            <select value={form.image_position} onChange={set('image_position')} className={inputCls}>
              {/* A value set outside this list (by hand, or by an older preset)
                  would otherwise silently coerce to Centre and be wiped on save. */}
              {!FRAMING.some((f) => f.value === form.image_position) && (
                <option value={form.image_position}>Custom ({form.image_position})</option>
              )}
              {FRAMING.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Image description" hint="Read aloud by screen readers. Describe the scene, not the brand.">
          <input value={form.image_alt} onChange={set('image_alt')} className={inputCls}
                 placeholder="Vice City inspired scene" />
        </Field>
      </section>

      {/* ── Copy ── */}
      <section className="space-y-5">
        <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">Copy</p>

        <Field label="Title *">
          <input value={form.title} onChange={set('title')} required className={inputCls}
                 placeholder="PRINTS FOR VICE CITY" />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Eyebrow" hint="The small badge above the title.">
            <input value={form.eyebrow} onChange={set('eyebrow')} className={inputCls} placeholder="Limited drop" />
          </Field>
          <Field label="Badge" hint="Dim text beside the eyebrow.">
            <input value={form.badge} onChange={set('badge')} className={inputCls} placeholder="Pre-launch" />
          </Field>
        </div>

        <Field label="Body">
          <textarea value={form.body} onChange={set('body')} rows={2} className={inputCls}
                    placeholder="What's in the collection, and when it ships." />
        </Field>

        <Field label="Footnote" hint="Small print under the button. Disclaimers go here.">
          <input value={form.footnote} onChange={set('footnote')} className={inputCls}
                 placeholder="Fan-made prints. Not affiliated with…" />
        </Field>
      </section>

      {/* ── Action ── */}
      <section className="space-y-5">
        <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">Action</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Button label">
            <input value={form.cta_label} onChange={set('cta_label')} className={inputCls} placeholder="Shop the Drop" />
          </Field>
          <Field label="Button link" hint="A path on the site, e.g. /shop/gta-vi">
            <input value={form.cta_href} onChange={set('cta_href')} className={inputCls} placeholder="/shop/gta-vi" />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Accent colour" hint="Tints the eyebrow and dot. The button stays orange.">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(form.accent) ? form.accent : '#ff5500'}
                onChange={set('accent')}
                className="w-10 h-10 bg-transparent border border-stone-800 cursor-pointer"
                aria-label="Pick accent colour"
              />
              <input value={form.accent} onChange={set('accent')} className={inputCls} placeholder="#ff5500" />
              {form.accent && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, accent: '' }))}
                        className="font-technical text-[9px] uppercase text-stone-600 hover:text-white">
                  Clear
                </button>
              )}
            </div>
          </Field>

          <Field label="Countdown to" hint="Shows a live countdown. Leave empty for none.">
            <input type="datetime-local" value={form.countdown_to} onChange={set('countdown_to')} className={inputCls} />
          </Field>
        </div>
      </section>

      {/* ── Schedule ── */}
      <section className="space-y-5">
        <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">Schedule</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Goes live" hint="Empty = as soon as published.">
            <input type="datetime-local" value={form.starts_at} onChange={set('starts_at')} className={inputCls} />
          </Field>
          <Field label="Comes down" hint="Empty = stays until unpublished.">
            <input type="datetime-local" value={form.ends_at} onChange={set('ends_at')} className={inputCls} />
          </Field>
          <Field label="Order" hint="Lower numbers come first, after the brand slide.">
            <input type="number" value={form.sort_order} onChange={set('sort_order')} className={inputCls} />
          </Field>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.published} onChange={set('published')}
                 className="w-4 h-4 accent-[#ff5500]" />
          <span className="font-technical text-[11px] uppercase tracking-[0.15em] text-stone-300">
            Published
          </span>
          <span className="font-technical text-[9px] text-stone-600">
            Unpublished slides never reach the storefront.
          </span>
        </label>
      </section>

      {error && (
        <p className="font-technical text-[11px] text-red-400 border-l-2 border-red-500 pl-3">{error}</p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={saving || busy}
          className="clip-parallelogram bg-[#ff5500] text-white px-8 py-2.5 font-headline text-xl
                     hover:shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial?.id ? 'Save slide' : 'Create slide'}
        </button>
        <button type="button" onClick={onCancel}
                className="font-technical text-[10px] uppercase tracking-[0.2em] text-stone-500 hover:text-white transition-colors">
          Discard
        </button>
      </div>
    </form>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default function AdminPromos() {
  const [promos, setPromos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // promo object, or {} for new
  const [deleting, setDeleting] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    fetchAllPromos().then((rows) => {
      if (!active) return;
      setPromos(rows);
      setLoading(false);
    });
    return () => { active = false; };
  }, [reloadKey]);

  const togglePublished = async (promo) => {
    const next = !promo.published;
    setPromos((p) => p.map((x) => (x.id === promo.id ? { ...x, published: next } : x)));
    try {
      await savePromo(promo.id, { published: next });
    } catch {
      load(); // put it back the way the database sees it
    }
  };

  const confirmDelete = async () => {
    const id = deleting.id;
    setDeleting(null);
    await deletePromo(id);
    setPromos((p) => p.filter((x) => x.id !== id));
  };

  const liveCount = promos.filter((p) => !dormantReason(p)).length;

  return (
    <div className="min-h-screen bg-[#080808]">
      <AdminNavbar />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-technical text-[10px] uppercase tracking-[0.3em] text-[#ff5500]">Admin</p>
            <h1 className="mt-1 font-headline text-5xl text-white">Hero Slides</h1>
            <p className="font-technical text-[11px] text-stone-500 mt-1">
              {liveCount} live on the storefront · {promos.length} total
            </p>
            <PageTagline />
          </div>

          {!editing && (
            <button
              onClick={() => setEditing({})}
              className="clip-parallelogram bg-[#ff5500] text-white px-7 py-2.5 font-headline text-xl
                         hover:shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all"
            >
              New Slide
            </button>
          )}
        </div>

        <p className="mb-6 font-technical text-[10px] text-stone-600 border-l-2 border-stone-800 pl-3 leading-relaxed">
          The brand slide always runs first and is not listed here — it lives in code so it can&apos;t be
          removed by accident. These slides follow it, in order.
        </p>

        {editing ? (
          <Editor
            initial={editing.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); load(); }}
          />
        ) : loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-28 bg-[#161616] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : promos.length === 0 ? (
          <div className="bg-[#161616] border border-white/5 py-16 text-center">
            <p className="font-headline text-2xl text-stone-500">No slides yet</p>
            <p className="font-technical text-[11px] text-stone-600 mt-2">{emptyQuip()}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promos.map((promo) => {
              const dormant = dormantReason(promo);
              return (
                <div key={promo.id}
                     className="bg-[#161616] border border-white/5 hover-glow transition-all flex flex-col sm:flex-row">
                  <div className="w-full sm:w-44 h-28 flex-shrink-0 bg-[#111111] overflow-hidden">
                    {promo.image_url ? (
                      <img src={promo.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-700">
                        <span className="material-symbols-outlined">image_not_supported</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-technical text-[9px] uppercase tracking-[0.15em] px-2 py-0.5"
                          style={{
                            backgroundColor: dormant ? 'rgba(255,255,255,0.08)' : (promo.accent ?? '#ff5500'),
                            color: dormant ? '#8a8a8a' : '#000',
                          }}
                        >
                          {dormant ?? 'Live'}
                        </span>
                        {promo.eyebrow && (
                          <span className="font-technical text-[9px] uppercase tracking-[0.15em] text-stone-600">
                            {promo.eyebrow}
                          </span>
                        )}
                      </div>

                      <h3 className="font-headline text-2xl text-white mt-1.5 truncate">{promo.title}</h3>

                      <p className="font-technical text-[9px] uppercase tracking-[0.1em] text-stone-600 mt-1">
                        #{promo.sort_order} · {promo.layout}
                        {promo.ends_at && ` · ends ${fmtDate(promo.ends_at)}`}
                        {!promo.ends_at && promo.starts_at && ` · from ${fmtDate(promo.starts_at)}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => togglePublished(promo)}
                        title={promo.published ? 'Unpublish' : 'Publish'}
                        aria-label={promo.published ? 'Unpublish slide' : 'Publish slide'}
                        className={`w-9 h-9 flex items-center justify-center transition-colors
                                    ${promo.published ? 'text-[#ff5500] hover:text-white' : 'text-stone-600 hover:text-white'}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                          {promo.published ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                      <button
                        onClick={() => setEditing(promo)}
                        aria-label="Edit slide"
                        className="w-9 h-9 flex items-center justify-center text-stone-500 hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                      </button>
                      <button
                        onClick={() => setDeleting(promo)}
                        aria-label="Delete slide"
                        className="w-9 h-9 flex items-center justify-center text-stone-600 hover:text-red-400 transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <DeleteConfirmModal
        open={!!deleting}
        title="Delete slide?"
        name={deleting?.title}
        confirmLabel="Delete slide"
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
