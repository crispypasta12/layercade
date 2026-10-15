import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import AdminNavbar from '../../components/admin/AdminNavbar';
import ProductFormModal from '../../components/admin/ProductFormModal';
import IdeaImportModal from '../../components/admin/IdeaImportModal';
import PhoneSaveHelp from '../../components/admin/PhoneSaveHelp';
import { supabase } from '../../lib/supabase';
import { useCurrentMember } from '../../contexts/CurrentMemberContext';
import {
  IDEA_STATUSES, IDEA_SOURCES, detectSource, normaliseUrl, extractUrl, titleFromUrl,
  firstImageFile, uploadIdeaImage, removeIdeaImage, normaliseTag,
} from '../../lib/ideas';

const mono = "'Space Mono', monospace";

// ─── Hooks ────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ─── Helpers ──────────────────────────────────────────────────

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ member, size = 20 }) {
  if (!member) return null;
  return (
    <div
      title={`Added by ${member.name}`}
      style={{
        width: size, height: size, borderRadius: 3, background: member.color || '#555',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: 700, color: '#fff', fontFamily: mono, flexShrink: 0,
      }}
    >
      {initials(member.name)}
    </div>
  );
}

function SourceBadge({ source }) {
  const s = IDEA_SOURCES[source] || IDEA_SOURCES.other;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: 'rgba(0,0,0,0.75)', color: s.color, border: `1px solid ${s.color}50`,
      fontSize: 8, padding: '2px 6px', fontFamily: mono,
      textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{s.icon}</span>
      {s.label}
    </span>
  );
}

function TagChip({ tag, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: 'rgba(255,255,255,0.04)', color: '#888', border: '1px solid rgba(255,255,255,0.08)',
      fontSize: 9, padding: '2px 6px', fontFamily: mono, letterSpacing: '0.04em',
    }}>
      #{tag}
      {onRemove && (
        <button onClick={onRemove} aria-label={`Remove ${tag}`} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>close</span>
        </button>
      )}
    </span>
  );
}

function VoteButton({ voters, myMemberId, membersById, onVote }) {
  const mine = myMemberId && voters.includes(myMemberId);
  const names = voters.map(id => membersById[id]?.name.split(' ')[0]).filter(Boolean);
  return (
    <button
      onClick={e => { e.stopPropagation(); onVote(); }}
      title={names.length ? `Liked by ${names.join(', ')}` : 'Vote for this idea'}
      style={{
        display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px',
        background: mine ? 'rgba(255,85,0,0.12)' : 'none',
        border: `1px solid ${mine ? 'rgba(255,85,0,0.4)' : 'rgba(255,255,255,0.06)'}`,
        color: mine ? '#ff5500' : '#555', cursor: 'pointer', fontFamily: mono, fontSize: 10,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: mine ? "'FILL' 1" : undefined }}>thumb_up</span>
      {voters.length > 0 && voters.length}
    </button>
  );
}

// ─── Idea Card ────────────────────────────────────────────────

function IdeaCard({ idea, member, voters = [], myMemberId, membersById, onVote, onClick, onDragStart, isDragTarget, onCardDragOver, onCardDrop }) {
  if (idea.pending) {
    return (
      <div style={{ background: '#161616', border: '1px dashed rgba(255,85,0,0.35)', padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ff5500', fontFamily: mono, fontSize: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, animation: 'spin 1s linear infinite' }}>progress_activity</span>
          {idea.pendingLabel || 'Fetching preview…'}
        </div>
        {idea.url && <div style={{ marginTop: 6, color: '#444', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idea.url}</div>}
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, idea.id)}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); onCardDragOver?.(idea.id); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onCardDrop?.(e, idea.id); }}
      onClick={() => onClick(idea)}
      style={{
        background: '#161616',
        border: isDragTarget ? '1px solid rgba(255,85,0,0.4)' : '1px solid rgba(255,255,255,0.06)',
        borderTop: isDragTarget ? '2px solid #ff5500' : undefined,
        cursor: 'grab', overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,85,0,0.3)';
        e.currentTarget.style.boxShadow = '0 0 16px rgba(255,85,0,0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isDragTarget ? 'rgba(255,85,0,0.4)' : 'rgba(255,255,255,0.06)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: '#0d0d0d' }}>
        {idea.image_url ? (
          <img
            src={idea.image_url}
            alt=""
            loading="lazy"
            draggable={false}
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a2a2a' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36 }}>lightbulb</span>
          </div>
        )}
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <SourceBadge source={idea.source} />
        </div>
        {idea.product_id && (
          <span title="Listed as a product" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(34,197,94,0.5)', color: '#22c55e', padding: 3 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>storefront</span>
          </span>
        )}
      </div>

      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ color: '#e5e2e1', fontSize: 13, lineHeight: 1.35, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {idea.title}
        </div>
        {idea.notes && (
          <div style={{ marginTop: 4, color: '#666', fontSize: 11, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {idea.notes}
          </div>
        )}
        {idea.tags?.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {idea.tags.slice(0, 3).map(t => <TagChip key={t} tag={t} />)}
            {idea.tags.length > 3 && <span style={{ color: '#444', fontSize: 9, fontFamily: mono, alignSelf: 'center' }}>+{idea.tags.length - 3}</span>}
          </div>
        )}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar member={member} />
          <span style={{ flex: 1, minWidth: 0, color: '#555', fontSize: 10, fontFamily: mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {idea.author ? `by ${idea.author} · ` : ''}{timeAgo(idea.created_at)}
          </span>
          <VoteButton voters={voters} myMemberId={myMemberId} membersById={membersById} onVote={() => onVote(idea.id)} />
          {idea.url && (
            <a
              href={idea.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title="Open original"
              style={{ color: '#444', display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff5500'}
              onMouseLeave={e => e.currentTarget.style.color = '#444'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────

function IdeaColumn({ column, ideas, membersById, votesByIdea, myMemberId, onVote, onCardClick, onDragStart, onDrop, fullWidth }) {
  const [dragOver, setDragOver] = useState(false);
  const [dragOverCardId, setDragOverCardId] = useState(null);

  return (
    <div
      style={{ width: fullWidth ? '100%' : 260, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); setDragOverCardId(null); }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setDragOver(false);
          setDragOverCardId(null);
        }
      }}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const target = dragOverCardId;
        setDragOverCardId(null);
        onDrop(e, column.id, target);
      }}
    >
      {!fullWidth && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, background: column.color, borderRadius: 2 }} />
          <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {column.label}
          </span>
          <span style={{ fontFamily: mono, fontSize: 10, color: '#333', background: '#1a1a1a', padding: '1px 7px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {ideas.filter(i => !i.pending).length}
          </span>
        </div>
      )}

      <div style={{
        height: dragOver ? 2 : 1,
        background: dragOver ? column.color : 'rgba(255,255,255,0.05)',
        marginBottom: 12, transition: 'all 0.2s',
        boxShadow: dragOver ? `0 0 8px ${column.color}60` : 'none',
      }} />

      <div style={{ display: 'grid', gridTemplateColumns: fullWidth ? 'repeat(auto-fill, minmax(150px, 1fr))' : '1fr', gap: 8 }}>
        {ideas.map(idea => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            member={membersById[idea.added_by]}
            voters={votesByIdea[idea.id]}
            myMemberId={myMemberId}
            membersById={membersById}
            onVote={onVote}
            onClick={onCardClick}
            onDragStart={onDragStart}
            isDragTarget={dragOverCardId === idea.id}
            onCardDragOver={cardId => { setDragOver(false); setDragOverCardId(cardId); }}
            onCardDrop={(e, cardId) => {
              setDragOver(false);
              setDragOverCardId(null);
              onDrop(e, column.id, cardId);
            }}
          />
        ))}
      </div>
      {ideas.length === 0 && (
        <div style={{
          border: `1px dashed ${dragOver ? column.color + '40' : 'rgba(255,255,255,0.05)'}`,
          padding: '24px 16px', textAlign: 'center',
          color: dragOver ? column.color + '80' : '#2a2a2a',
          fontSize: 10, fontFamily: mono, transition: 'all 0.2s',
        }}>
          {dragOver ? 'Release to drop' : 'No ideas'}
        </div>
      )}
    </div>
  );
}

// ─── Idea Modal ───────────────────────────────────────────────

function IdeaModal({ idea, membersById, allTags, product, onClose, onSave, onDelete, onTurnIntoProduct, onEstimate }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    title: idea.title || '',
    notes: idea.notes || '',
    status: idea.status || 'inbox',
    author: idea.author || '',
    url: idea.url || '',
    image_url: idea.image_url || null,
    tags: idea.tags || [],
    est_print_hours: idea.est_print_hours ?? '',
    est_filament_g: idea.est_filament_g ?? '',
    product_id: idea.product_id ?? null,
  });
  const [tagDraft, setTagDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [dropping, setDropping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef(null);
  // Screenshots uploaded while the popup is open; removed again if not saved.
  const uploaded = useRef([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addedBy = membersById[idea.added_by];

  const input = {
    width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', fontSize: 13, padding: '8px 12px',
    outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
  };
  const fieldLabel = {
    fontFamily: mono, fontSize: 9, color: '#555',
    textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 7,
  };

  const attachImage = async file => {
    if (!file) return;
    setUploading(true);
    setImageError(null);
    try {
      const url = await uploadIdeaImage(supabase, file);
      uploaded.current.push(url);
      set('image_url', url);
    } catch (err) {
      setImageError(`Upload failed: ${err.message}`);
    }
    setUploading(false);
  };

  const addTag = raw => {
    const tag = normaliseTag(raw);
    if (tag && !form.tags.includes(tag)) set('tags', [...form.tags, tag]);
    setTagDraft('');
  };

  const close = () => {
    uploaded.current.forEach(url => removeIdeaImage(supabase, url));
    onClose();
  };

  const canSave = form.title.trim() && !uploading;

  // The idea as it should be saved. Also used by the product and calculator
  // actions, which save first so nothing typed in the popup is lost.
  const collect = () => {
    const pendingTag = normaliseTag(tagDraft);
    const tags = pendingTag && !form.tags.includes(pendingTag) ? [...form.tags, pendingTag] : form.tags;
    // Keep only the screenshot that ended up on the idea.
    uploaded.current.filter(url => url !== form.image_url).forEach(url => removeIdeaImage(supabase, url));
    uploaded.current = [];
    const positive = v => (Number(v) > 0 ? Number(v) : null);
    return {
      ...idea, ...form, tags,
      title: form.title.trim(),
      url: extractUrl(form.url) || null,
      est_print_hours: positive(form.est_print_hours),
      est_filament_g: positive(form.est_filament_g) && Math.round(Number(form.est_filament_g)),
    };
  };

  const save = () => { if (canSave) onSave(collect()); };

  const suggestions = allTags.filter(t => !form.tags.includes(t));

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9998, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}
      onClick={close}
    >
      <div
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: isMobile ? '100%' : 640, maxHeight: isMobile ? '95vh' : '90vh', borderRadius: isMobile ? '12px 12px 0 0' : 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
        onPaste={e => {
          const file = firstImageFile(e.clipboardData);
          if (file) { e.preventDefault(); attachImage(file); }
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <SourceBadge source={idea.source} />
            <span style={{ fontFamily: mono, fontSize: 9, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {addedBy ? `${addedBy.name.split(' ')[0]} · ` : ''}{timeAgo(idea.created_at)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => confirmDelete ? onDelete(idea.id) : setConfirmDelete(true)}
              style={{ background: confirmDelete ? 'rgba(239,68,68,0.12)' : 'none', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', cursor: 'pointer', padding: '5px 12px', fontFamily: mono, fontSize: 9, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
              {confirmDelete ? 'Confirm' : 'Delete'}
            </button>
            <button onClick={close} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 18, overflowY: 'auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '230px 1fr', gap: 18 }}>
          <div>
            <div
              onDragOver={e => { e.preventDefault(); setDropping(true); }}
              onDragLeave={() => setDropping(false)}
              onDrop={e => { e.preventDefault(); setDropping(false); attachImage(firstImageFile(e.dataTransfer)); }}
              onClick={() => !form.image_url && fileInput.current?.click()}
              style={{
                position: 'relative', width: '100%', aspectRatio: isMobile ? '16 / 9' : '4 / 3', maxHeight: isMobile ? 180 : undefined,
                background: '#0a0a0a', border: `1px ${dropping ? 'dashed #ff5500' : 'solid rgba(255,255,255,0.06)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                cursor: form.image_url ? 'default' : 'pointer',
              }}
            >
              {form.image_url ? (
                <img src={form.image_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#444', fontFamily: mono, fontSize: 9, lineHeight: 1.6, padding: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 30, color: '#333', display: 'block', marginBottom: 4 }}>add_photo_alternate</span>
                  {isMobile ? 'Tap to add a screenshot' : 'Paste, drop or click to add a screenshot'}
                </div>
              )}
              {uploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff5500' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                </div>
              )}
              {form.image_url && !uploading && (
                <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}>
                  <button onClick={e => { e.stopPropagation(); fileInput.current?.click(); }} title="Replace image" style={imageAction}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>photo_camera</span>
                  </button>
                  <button onClick={e => { e.stopPropagation(); set('image_url', null); }} title="Remove image" style={imageAction}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                  </button>
                </div>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={e => { attachImage(e.target.files?.[0]); e.target.value = ''; }}
            />
            {imageError && <div style={{ marginTop: 6, color: '#ef4444', fontSize: 10, fontFamily: mono }}>{imageError}</div>}
            {idea.url && (
              <a
                href={idea.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', padding: '8px 10px', fontFamily: mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                Open on {(IDEA_SOURCES[idea.source] || IDEA_SOURCES.other).label}
              </a>
            )}

            {/* Next steps: cost it, then list it */}
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => canSave && onEstimate(collect())} disabled={!canSave} style={actionButton}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calculate</span>
                Estimate cost
              </button>
              {form.product_id ? (
                <div style={{ border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)', padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e', fontFamily: mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>storefront</span>
                    Listed as product
                  </div>
                  <div style={{ marginTop: 4, color: '#ccc', fontSize: 12 }}>{product?.name ?? 'Product'}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 10, fontFamily: mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {product?.slug && (
                      <a href={`/${product.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', textDecoration: 'none' }}>View in shop ↗</a>
                    )}
                    <button onClick={() => set('product_id', null)} style={{ background: 'none', border: 'none', padding: 0, color: '#666', cursor: 'pointer', fontFamily: mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Unlink
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => canSave && onTurnIntoProduct(collect())}
                  disabled={!canSave}
                  style={{ ...actionButton, background: 'rgba(255,85,0,0.1)', borderColor: 'rgba(255,85,0,0.45)', color: '#ff5500' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_business</span>
                  Turn into product
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={fieldLabel}>Title *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} style={input} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={fieldLabel}>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                  {IDEA_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Creator</label>
                <input value={form.author} onChange={e => set('author', e.target.value)} placeholder="—" style={input} />
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Tags</label>
              <div style={{ ...input, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', padding: '6px 8px' }}>
                {form.tags.map(t => <TagChip key={t} tag={t} onRemove={() => set('tags', form.tags.filter(x => x !== t))} />)}
                <input
                  value={tagDraft}
                  list="idea-tag-suggestions"
                  onChange={e => {
                    const v = e.target.value;
                    // Picking a suggestion or typing a comma commits the tag.
                    if (v.endsWith(',') || suggestions.includes(v)) addTag(v.replace(/,$/, ''));
                    else setTagDraft(v);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag(tagDraft); }
                    if (e.key === 'Backspace' && !tagDraft && form.tags.length) set('tags', form.tags.slice(0, -1));
                  }}
                  placeholder={form.tags.length ? '' : 'desk, gift, eid…'}
                  style={{ flex: 1, minWidth: 80, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 12, fontFamily: "'DM Sans', sans-serif", padding: '2px 0' }}
                />
                <datalist id="idea-tag-suggestions">
                  {suggestions.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Why it could sell, colours, size, print time…"
                rows={3}
                style={{ ...input, resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={fieldLabel}>Print time (hours)</label>
                <input type="number" min="0" step="0.25" inputMode="decimal" value={form.est_print_hours} onChange={e => set('est_print_hours', e.target.value)} placeholder="e.g. 3.5" style={input} />
              </div>
              <div>
                <label style={fieldLabel}>Filament (grams)</label>
                <input type="number" min="0" step="1" inputMode="numeric" value={form.est_filament_g} onChange={e => set('est_filament_g', e.target.value)} placeholder="e.g. 120" style={input} />
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Link</label>
              <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…" style={{ ...input, fontSize: 11 }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={close} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#888', padding: '8px 16px', cursor: 'pointer', fontFamily: mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            style={{ background: '#ff5500', border: 'none', color: '#fff', padding: '8px 18px', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.4, fontFamily: mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const actionButton = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa',
  padding: '8px 10px', cursor: 'pointer', fontFamily: mono, fontSize: 9,
  textTransform: 'uppercase', letterSpacing: '0.08em',
};

const imageAction = {
  background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.15)', color: '#ddd',
  cursor: 'pointer', padding: 4, display: 'flex',
};

const headerIconButton = {
  display: 'flex', alignItems: 'center', background: 'none', border: '1px solid rgba(255,255,255,0.08)',
  color: '#666', cursor: 'pointer', padding: '7px 9px',
};

const filterSelect = { background: '#111', border: '1px solid rgba(255,255,255,0.07)', color: '#777', fontSize: 10, padding: '6px 8px', outline: 'none', fontFamily: mono, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 };

// ─── Capture Bar ──────────────────────────────────────────────

function CaptureBar({ onCapture, onCaptureImage }) {
  const [value, setValue] = useState('');
  const [dropping, setDropping] = useState(false);
  const fileInput = useRef(null);

  const submit = text => {
    const url = extractUrl(text);
    if (!url) return false;
    onCapture(url);
    setValue('');
    return true;
  };

  return (
    <div
      style={{ display: 'flex', gap: 8 }}
      onDragOver={e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); setDropping(true); } }}
      onDragLeave={() => setDropping(false)}
      onDrop={e => {
        const file = firstImageFile(e.dataTransfer);
        setDropping(false);
        if (file) { e.preventDefault(); onCaptureImage(file); }
      }}
    >
      <div style={{ position: 'relative', flex: 1 }}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: '#ff5500', pointerEvents: 'none' }}>add_link</span>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onPaste={e => {
            // Pasting a link or a screenshot saves it straight away — no extra click.
            const file = firstImageFile(e.clipboardData);
            if (file) { e.preventDefault(); onCaptureImage(file); return; }
            if (submit(e.clipboardData.getData('text'))) e.preventDefault();
          }}
          onKeyDown={e => { if (e.key === 'Enter') submit(value); }}
          placeholder={dropping ? 'Drop the screenshot to save it' : 'Paste a link or a screenshot…'}
          style={{ width: '100%', boxSizing: 'border-box', background: dropping ? 'rgba(255,85,0,0.06)' : '#111', border: `1px ${dropping ? 'dashed' : 'solid'} rgba(255,85,0,${dropping ? 0.7 : 0.25})`, color: '#e5e2e1', fontSize: 13, padding: '11px 12px 11px 36px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,85,0,0.6)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,85,0,0.25)'}
        />
      </div>
      <button
        onClick={() => fileInput.current?.click()}
        title="Add a screenshot"
        style={{ display: 'flex', alignItems: 'center', background: 'none', border: '1px solid rgba(255,85,0,0.25)', color: '#ff5500', padding: '0 12px', cursor: 'pointer' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_photo_alternate</span>
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) onCaptureImage(f); e.target.value = ''; }}
      />
      <button
        onClick={() => submit(value)}
        disabled={!extractUrl(value)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ff5500', border: 'none', color: '#fff', padding: '0 16px', cursor: 'pointer', fontFamily: mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: extractUrl(value) ? 1 : 0.4 }}
      >
        Save
      </button>
    </div>
  );
}

// Swap a "Fetching preview…" placeholder for the saved idea. If the board was
// reloaded in the meantime the placeholder is gone, so add the idea instead.
function replacePending(ideas, tempId, saved) {
  if (ideas.some(i => i.id === tempId)) return ideas.map(i => i.id === tempId ? saved : i);
  return ideas.some(i => i.id === saved.id) ? ideas : [saved, ...ideas];
}

// ─── Page ─────────────────────────────────────────────────────

export default function Ideas() {
  const isMobile = useIsMobile();
  const { member } = useCurrentMember();
  const [ideas,     setIdeas]     = useState([]);
  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modalIdea, setModalIdea] = useState(null);
  const [search,    setSearch]    = useState('');
  const [activeCol, setActiveCol] = useState('inbox');
  const [toast,     setToast]     = useState(null);
  const [votes,     setVotes]     = useState([]);
  const [products,  setProducts]  = useState([]);
  const [productFor, setProductFor] = useState(null); // idea being turned into a product
  const [showImport, setShowImport] = useState(false);
  const [showPhoneHelp, setShowPhoneHelp] = useState(false);
  const [enrich,     setEnrich]     = useState(null); // { done, total } while fetching previews after an import
  const [searchParams, setSearchParams] = useSearchParams();
  const shareHandled = useRef(false);
  const navigate = useNavigate();
  const [filterSource, setFilterSource] = useState('');
  const [filterTag,    setFilterTag]    = useState('');
  const [sortBy,       setSortBy]       = useState('manual');
  const [weekAgo] = useState(() => new Date(Date.now() - 7 * 86400000));
  const dragId = useRef(null);
  const toastTimer = useRef(null);

  const showToast = (message, tone = 'info', action = null) => {
    clearTimeout(toastTimer.current);
    setToast({ message, tone, action });
    toastTimer.current = setTimeout(() => setToast(null), action ? 7000 : 4000);
  };
  const showToastRef = useRef(showToast);

  // ── Load ──
  useEffect(() => {
    // Ignore a superseded load (React dev runs effects twice) so it can't
    // overwrite ideas saved after it started, e.g. a link shared from a phone.
    let stale = false;
    Promise.all([
      supabase.from('ideas').select('*').order('position').order('created_at', { ascending: false }),
      supabase.from('members').select('id, name, color'),
      supabase.from('idea_votes').select('idea_id, member_id'),
      supabase.from('products').select('id, name, slug'),
    ]).then(([i, m, v, p]) => {
      if (stale) return;
      setProducts(p.data || []);
      if (i.error) showToast(`Couldn't load ideas: ${i.error.message}`, 'error');
      setIdeas(i.data || []);
      setMembers(m.data || []);
      setVotes(v.data || []);
      setLoading(false);
    });
    return () => { stale = true; };
  }, []);

  const membersById = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);
  const productsById = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);

  const describeDuplicate = existing => {
    const who = membersById[existing.added_by]?.name.split(' ')[0];
    const col = IDEA_STATUSES.find(s => s.id === existing.status)?.label;
    return `Already saved${who ? ` by ${who}` : ''} ${timeAgo(existing.created_at)} — it's in ${col}.`;
  };

  // ── Capture ──
  const handleCapture = async pastedUrl => {
    const pastedKey = normaliseUrl(pastedUrl);
    const known = ideas.find(i => i.url_key && i.url_key === pastedKey);
    if (known) {
      showToast(describeDuplicate(known));
      setActiveCol(known.status);
      return;
    }

    const tempId = `pending-${Date.now()}`;
    setIdeas(is => [{ id: tempId, pending: true, url: pastedUrl, status: 'inbox' }, ...is]);
    setActiveCol('inbox');

    const { data: preview, error: fnError } = await supabase.functions.invoke('idea-preview', { body: { url: pastedUrl } });
    if (fnError) console.error('[Ideas] preview failed:', fnError);

    const url = preview?.url || pastedUrl;
    const source = preview?.source || detectSource(url);
    const minPos = ideas.filter(i => i.status === 'inbox' && !i.pending).reduce((m, i) => Math.min(m, i.position ?? 0), 0);

    const { data, error } = await supabase.from('ideas').insert({
      url,
      url_key: normaliseUrl(url),
      source,
      title: preview?.title || titleFromUrl(url) || `${(IDEA_SOURCES[source] || IDEA_SOURCES.other).label} idea`,
      author: preview?.author || null,
      notes: null,
      image_url: preview?.image_url || null,
      status: 'inbox',
      position: minPos - 1,
      added_by: member?.id ?? null,
    }).select().single();

    if (error) {
      setIdeas(is => is.filter(i => i.id !== tempId));
      if (error.code === '23505') {
        // Short link resolved to something we already have.
        const { data: existing } = await supabase.from('ideas').select('*').eq('url_key', normaliseUrl(url)).maybeSingle();
        showToast(existing ? describeDuplicate(existing) : 'That idea is already on the board.');
      } else {
        showToast(`Couldn't save: ${error.message}`, 'error');
      }
      return;
    }

    setIdeas(is => replacePending(is, tempId, data));
    if (!preview?.image_url) {
      showToast('Saved, but the site hid its picture.', 'info', { label: 'Add screenshot', run: () => setModalIdea(data) });
    }
  };

  // A screenshot with no link: upload it, save the idea, then open it so the
  // title, tags and link can be filled in while it's fresh.
  const handleCaptureImage = async (file, status = 'inbox') => {
    const tempId = `pending-${Date.now()}`;
    setIdeas(is => [{ id: tempId, pending: true, pendingLabel: 'Uploading screenshot…', status }, ...is]);
    setActiveCol(status);

    let imageUrl;
    try {
      imageUrl = await uploadIdeaImage(supabase, file);
    } catch (err) {
      setIdeas(is => is.filter(i => i.id !== tempId));
      showToast(`Couldn't upload: ${err.message}`, 'error');
      return;
    }

    const minPos = ideas.filter(i => i.status === status && !i.pending).reduce((m, i) => Math.min(m, i.position ?? 0), 0);
    const { data, error } = await supabase.from('ideas').insert({
      source: 'other',
      title: 'Screenshot idea',
      image_url: imageUrl,
      status,
      position: minPos - 1,
      added_by: member?.id ?? null,
    }).select().single();

    if (error) {
      removeIdeaImage(supabase, imageUrl);
      setIdeas(is => is.filter(i => i.id !== tempId));
      showToast(`Couldn't save: ${error.message}`, 'error');
      return;
    }
    setIdeas(is => replacePending(is, tempId, data));
    setModalIdea(data);
  };

  // Paste a screenshot anywhere on the page (outside text fields and the popup).
  const captureImageRef = useRef(handleCaptureImage);
  const captureLinkRef = useRef(handleCapture);
  useEffect(() => { captureImageRef.current = handleCaptureImage; captureLinkRef.current = handleCapture; });

  // Shared from a phone: Android's share target and the iPhone Shortcut both
  // open /admin/ideas?url=… (or ?text=… when the app shares "caption + link").
  // Waits for the board to load so the duplicate check sees existing ideas.
  useEffect(() => {
    if (loading || shareHandled.current) return;
    const values = ['url', 'text', 'title'].map(k => searchParams.get(k)).filter(Boolean);
    if (values.length === 0) return;
    shareHandled.current = true;
    setSearchParams({}, { replace: true });
    const link = values.map(extractUrl).find(Boolean);
    if (link) captureLinkRef.current(link);
    else showToastRef.current('Nothing saved: what you shared didn\'t include a link.', 'error');
  }, [loading, searchParams, setSearchParams]);
  useEffect(() => {
    if (modalIdea) return;
    const onPaste = e => {
      if (e.target.closest?.('input, textarea, [contenteditable]')) return;
      const file = firstImageFile(e.clipboardData);
      if (file) { e.preventDefault(); captureImageRef.current(file); }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [modalIdea]);

  // ── Votes ──
  const handleVote = async ideaId => {
    if (!member) { showToast('Your login isn\'t linked to a team member, so you can\'t vote.', 'error'); return; }
    const mine = votes.some(v => v.idea_id === ideaId && v.member_id === member.id);
    setVotes(vs => mine
      ? vs.filter(v => !(v.idea_id === ideaId && v.member_id === member.id))
      : [...vs, { idea_id: ideaId, member_id: member.id }]);
    const { error } = mine
      ? await supabase.from('idea_votes').delete().eq('idea_id', ideaId).eq('member_id', member.id)
      : await supabase.from('idea_votes').insert({ idea_id: ideaId, member_id: member.id });
    if (error) {
      showToast(`Couldn't save vote: ${error.message}`, 'error');
      setVotes(vs => mine
        ? [...vs, { idea_id: ideaId, member_id: member.id }]
        : vs.filter(v => !(v.idea_id === ideaId && v.member_id === member.id)));
    }
  };

  // ── CRUD ──
  // Returns the saved row, or null if it failed. keepOpen is for actions that
  // save and then move on somewhere else.
  const handleSave = async (idea, { keepOpen = false } = {}) => {
    const before = ideas.find(i => i.id === idea.id);
    const linkChanged = (idea.url || null) !== (before?.url || null);
    const { data, error } = await supabase.from('ideas').update({
      title: idea.title, notes: idea.notes || null, status: idea.status,
      author: idea.author || null, image_url: idea.image_url || null,
      tags: idea.tags,
      est_print_hours: idea.est_print_hours ?? null,
      est_filament_g: idea.est_filament_g ?? null,
      product_id: idea.product_id ?? null,
      ...(linkChanged && {
        url: idea.url,
        url_key: idea.url ? normaliseUrl(idea.url) : null,
        source: idea.url ? detectSource(idea.url) : 'other',
      }),
    }).eq('id', idea.id).select().single();
    if (error) {
      if (error.code === '23505') {
        const existing = ideas.find(i => i.url_key === normaliseUrl(idea.url));
        showToast(existing ? `Another idea already has that link: "${existing.title}".` : 'Another idea already has that link.', 'error');
      } else {
        showToast(`Couldn't save: ${error.message}`, 'error');
      }
      return null;
    }
    if (before?.image_url && before.image_url !== data.image_url) removeIdeaImage(supabase, before.image_url);
    setIdeas(is => is.map(i => i.id === data.id ? data : i));
    if (!keepOpen) setModalIdea(null);
    return data;
  };

  // ── Import ──
  // After an import, fetch thumbnails (and titles for rows that had none) one
  // at a time in the background, the same way a pasted link gets them.
  const enrichIdeas = async (rows, autoTitled) => {
    const todo = rows.filter(r => r.url && !r.image_url);
    if (!todo.length) return;
    setEnrich({ done: 0, total: todo.length });
    for (const [n, idea] of todo.entries()) {
      const { data: preview } = await supabase.functions.invoke('idea-preview', { body: { url: idea.url } });
      const patch = {};
      if (preview?.image_url) patch.image_url = preview.image_url;
      if (preview?.author && !idea.author) patch.author = preview.author;
      if (preview?.title && autoTitled.has(idea.url_key)) patch.title = preview.title;
      if (Object.keys(patch).length) {
        const { data } = await supabase.from('ideas').update(patch).eq('id', idea.id).select().maybeSingle();
        if (data) setIdeas(is => is.map(i => i.id === data.id ? data : i));
        else removeIdeaImage(supabase, patch.image_url); // deleted meanwhile
      }
      setEnrich({ done: n + 1, total: todo.length });
    }
    setEnrich(null);
  };

  const handleImported = (rows, autoTitled) => {
    setShowImport(false);
    setIdeas(is => [...is, ...rows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
    showToast(`Imported ${rows.length} idea${rows.length === 1 ? '' : 's'}.`);
    enrichIdeas(rows, autoTitled);
  };

  // ── Next steps ──
  const handleEstimate = async idea => {
    const saved = await handleSave(idea, { keepOpen: true });
    if (!saved) return;
    navigate('/admin/calculator', {
      state: { idea: { id: saved.id, title: saved.title, print_hours: saved.est_print_hours, filament_g: saved.est_filament_g } },
    });
  };

  const handleTurnIntoProduct = async idea => {
    const saved = await handleSave(idea);
    if (saved) setProductFor(saved);
  };

  const handleProductCreated = async (message, productId) => {
    const idea = productFor;
    const { data: product } = await supabase.from('products').select('id, name, slug').eq('id', productId).single();
    if (product) setProducts(ps => [...ps, product]);
    const { data, error } = await supabase.from('ideas')
      .update({ product_id: productId, status: 'listed' })
      .eq('id', idea.id).select().single();
    if (error) { showToast(`Product saved, but linking the idea failed: ${error.message}`, 'error'); return; }
    setIdeas(is => is.map(i => i.id === data.id ? data : i));
    setActiveCol('listed');
    showToast(`${message} The idea moved to Listed.`);
  };

  const handleDelete = async id => {
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) { showToast(`Couldn't delete: ${error.message}`, 'error'); return; }
    // Thumbnails and screenshots live in our bucket; remove them too.
    removeIdeaImage(supabase, ideas.find(i => i.id === id)?.image_url);
    setVotes(vs => vs.filter(v => v.idea_id !== id));
    setIdeas(is => is.filter(i => i.id !== id));
    setModalIdea(null);
  };

  // ── Drag & Drop ──
  const handleDragStart = (e, id) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, newStatus, targetCardId = null) => {
    const id = dragId.current;
    dragId.current = null;
    if (!id) {
      // A screenshot dragged in from the desktop lands in the column it's dropped on.
      const file = firstImageFile(e.dataTransfer);
      if (file) handleCaptureImage(file, newStatus);
      return;
    }
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;

    if (idea.status !== newStatus) {
      setIdeas(is => is.map(i => i.id === id ? { ...i, status: newStatus } : i));
      await supabase.from('ideas').update({ status: newStatus }).eq('id', id);
      return;
    }

    // Reordering only makes sense in board order; sorted views would just snap back.
    if (!targetCardId || targetCardId === id || sortBy !== 'manual') return;

    const col = ideas.filter(i => i.status === newStatus && !i.pending);
    const fromIdx = col.findIndex(i => i.id === id);
    const toIdx   = col.findIndex(i => i.id === targetCardId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...col];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, col[fromIdx]);
    const positions = Object.fromEntries(reordered.map((i, idx) => [i.id, idx + 1]));

    setIdeas(is => {
      const updated = is.map(i => positions[i.id] ? { ...i, position: positions[i.id] } : i);
      return [...updated].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });
    await Promise.all(
      Object.entries(positions).map(([pid, position]) => supabase.from('ideas').update({ position }).eq('id', pid))
    );
  };

  // ── Derived ──
  const votesByIdea = useMemo(() => {
    const out = {};
    for (const v of votes) (out[v.idea_id] ||= []).push(v.member_id);
    return out;
  }, [votes]);

  // Most-used first, so the suggestions and filter list lead with the house tags.
  const allTags = useMemo(() => {
    const counts = {};
    for (const i of ideas) for (const t of i.tags || []) counts[t] = (counts[t] || 0) + 1;
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  }, [ideas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ideas.filter(i => i.pending || (
      (!filterSource || i.source === filterSource) &&
      (!filterTag || (i.tags || []).includes(filterTag)) &&
      (!q || [i.title, i.notes, i.author, i.url, ...(i.tags || [])].some(v => v?.toLowerCase().includes(q)))
    ));
  }, [ideas, search, filterSource, filterTag]);

  const byCol = useMemo(() => {
    const out = Object.fromEntries(IDEA_STATUSES.map(s => [s.id, []]));
    for (const i of filtered) (out[i.status] || out.inbox).push(i);
    if (sortBy !== 'manual') {
      const score = i => i.pending ? Infinity : sortBy === 'votes' ? (votesByIdea[i.id]?.length || 0) : new Date(i.created_at).getTime();
      for (const col of Object.values(out)) col.sort((a, b) => score(b) - score(a));
    }
    return out;
  }, [filtered, sortBy, votesByIdea]);

  const hasFilters = filterSource || filterTag || search;

  const thisWeek = ideas.filter(i => !i.pending && new Date(i.created_at) > weekAgo).length;
  const total = ideas.filter(i => !i.pending).length;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column' }}>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      <AdminNavbar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 'calc(100vh - 65px)' }}>

        {/* ── Page Header ── */}
        <div style={{ padding: isMobile ? '12px 16px' : '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? '1.4rem' : '1.75rem', color: '#fff', letterSpacing: '0.06em', lineHeight: 1 }}>Ideas</h1>
              <p style={{ margin: '2px 0 0', fontFamily: mono, fontSize: 9, color: '#444' }}>
                {total} saved · {thisWeek} this week
                {enrich && <span style={{ color: '#ff5500' }}> · fetching previews {enrich.done}/{enrich.total}</span>}
              </p>
            </div>
            <button onClick={() => setShowPhoneHelp(true)} title="Save from your phone" style={headerIconButton}>
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>smartphone</span>
            </button>
            <button onClick={() => setShowImport(true)} title="Import from Google Sheets" style={headerIconButton}>
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>upload_file</span>
            </button>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#333', pointerEvents: 'none' }}>search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', color: '#e5e2e1', fontSize: 12, padding: '7px 12px 7px 30px', outline: 'none', fontFamily: "'DM Sans', sans-serif", width: isMobile ? 120 : 190 }}
              />
            </div>
          </div>
          <CaptureBar onCapture={handleCapture} onCaptureImage={file => handleCaptureImage(file)} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ ...filterSelect, color: filterSource ? '#ff5500' : '#777' }}>
              <option value="">All sources</option>
              {Object.entries(IDEA_SOURCES).map(([id, src]) => <option key={id} value={id}>{src.label}</option>)}
            </select>
            <select value={filterTag} onChange={e => setFilterTag(e.target.value)} style={{ ...filterSelect, color: filterTag ? '#ff5500' : '#777' }}>
              <option value="">All tags</option>
              {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={filterSelect}>
              <option value="manual">Sort: board order</option>
              <option value="votes">Sort: most votes</option>
              <option value="newest">Sort: newest</option>
            </select>
            {hasFilters && (
              <button
                onClick={() => { setFilterSource(''); setFilterTag(''); setSearch(''); }}
                style={{ ...filterSelect, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>filter_alt_off</span>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile column tab bar ── */}
        {isMobile && (
          <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, scrollbarWidth: 'none' }}>
            {IDEA_STATUSES.map(col => {
              const count = byCol[col.id]?.filter(i => !i.pending).length ?? 0;
              const active = activeCol === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveCol(col.id)}
                  style={{
                    padding: '10px 14px', border: 'none', background: 'none',
                    color: active ? (col.id === 'archived' ? '#888' : col.color) : '#444',
                    borderBottom: `2px solid ${active ? col.color : 'transparent'}`,
                    fontFamily: mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em',
                    cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                  {count > 0 && <span style={{ marginLeft: 5, fontSize: 9, color: active ? 'inherit' : '#333' }}>{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Board ── */}
        <div style={{ flex: 1, overflowX: isMobile ? 'hidden' : 'auto', overflowY: 'auto', padding: isMobile ? 16 : '20px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#333', fontFamily: mono, fontSize: 11 }}>
              Loading…
            </div>
          ) : isMobile ? (
            <IdeaColumn
              column={IDEA_STATUSES.find(c => c.id === activeCol) || IDEA_STATUSES[0]}
              ideas={byCol[activeCol] || []}
              membersById={membersById}
              votesByIdea={votesByIdea}
              myMemberId={member?.id}
              onVote={handleVote}
              onCardClick={setModalIdea}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              fullWidth
            />
          ) : (
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', minWidth: 'max-content' }}>
              {IDEA_STATUSES.map(col => (
                <IdeaColumn
                  key={col.id}
                  column={col}
                  ideas={byCol[col.id] || []}
                  membersById={membersById}
                  votesByIdea={votesByIdea}
                  myMemberId={member?.id}
                  onVote={handleVote}
                  onCardClick={setModalIdea}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {modalIdea && (
        <IdeaModal
          key={modalIdea.id}
          idea={modalIdea}
          membersById={membersById}
          allTags={allTags}
          product={productsById[modalIdea.product_id]}
          onTurnIntoProduct={handleTurnIntoProduct}
          onEstimate={handleEstimate}
          onClose={() => setModalIdea(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {showImport && (
        <IdeaImportModal
          members={members}
          existingKeys={ideas.map(i => i.url_key).filter(Boolean)}
          startPosition={ideas.reduce((m, i) => Math.max(m, i.position ?? 0), 0) + 1}
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}

      {showPhoneHelp && <PhoneSaveHelp onClose={() => setShowPhoneHelp(false)} />}

      <AnimatePresence>
        {productFor && (
          <ProductFormModal
            product={null}
            prefill={{ name: productFor.title, description: productFor.notes || '' }}
            onClose={() => setProductFor(null)}
            onSuccess={handleProductCreated}
          />
        )}
      </AnimatePresence>

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 9999,
            maxWidth: 'calc(100vw - 32px)', background: '#161616',
            border: `1px solid ${toast.tone === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(255,85,0,0.35)'}`,
            color: toast.tone === 'error' ? '#ef4444' : '#e5e2e1',
            padding: '10px 14px', fontSize: 12, fontFamily: "'DM Sans', sans-serif",
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          {toast.message}
          {toast.action && (
            <button
              onClick={() => { toast.action.run(); setToast(null); }}
              style={{ background: 'none', border: '1px solid rgba(255,85,0,0.5)', color: '#ff5500', cursor: 'pointer', padding: '4px 10px', fontFamily: mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
