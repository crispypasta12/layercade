import { useState, useEffect, useRef, useMemo } from 'react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import { supabase } from '../../lib/supabase';
import { useCurrentMember } from '../../contexts/CurrentMemberContext';
import { IDEA_STATUSES, IDEA_SOURCES, detectSource, normaliseUrl, extractUrl, titleFromUrl } from '../../lib/ideas';

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

// ─── Idea Card ────────────────────────────────────────────────

function IdeaCard({ idea, member, onClick, onDragStart, isDragTarget, onCardDragOver, onCardDrop }) {
  if (idea.pending) {
    return (
      <div style={{ background: '#161616', border: '1px dashed rgba(255,85,0,0.35)', padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ff5500', fontFamily: mono, fontSize: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, animation: 'spin 1s linear infinite' }}>progress_activity</span>
          Fetching preview…
        </div>
        <div style={{ marginTop: 6, color: '#444', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idea.url}</div>
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
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar member={member} />
          <span style={{ flex: 1, minWidth: 0, color: '#555', fontSize: 10, fontFamily: mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {idea.author ? `by ${idea.author} · ` : ''}{timeAgo(idea.created_at)}
          </span>
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

function IdeaColumn({ column, ideas, membersById, onCardClick, onDragStart, onDrop, fullWidth }) {
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

function IdeaModal({ idea, membersById, onClose, onSave, onDelete }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    title: idea.title || '',
    notes: idea.notes || '',
    status: idea.status || 'inbox',
    author: idea.author || '',
    image_url: idea.image_url || '',
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  const save = () => {
    if (!form.title.trim()) return;
    onSave({ ...idea, ...form, title: form.title.trim(), image_url: form.image_url.trim() || null });
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9998, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: isMobile ? '100%' : 620, maxHeight: isMobile ? '95vh' : '90vh', borderRadius: isMobile ? '12px 12px 0 0' : 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
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
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 18, overflowY: 'auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '220px 1fr', gap: 18 }}>
          <div>
            <div style={{ width: '100%', aspectRatio: isMobile ? '16 / 9' : '4 / 3', maxHeight: isMobile ? 180 : undefined, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {form.image_url ? (
                <img src={form.image_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#2a2a2a' }}>lightbulb</span>
              )}
            </div>
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
              <label style={fieldLabel}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Why it could sell, colours, size, print time…"
                rows={4}
                style={{ ...input, resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={fieldLabel}>Image URL</label>
              <input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="Paste an image link if the preview missed it" style={{ ...input, fontSize: 11 }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#888', padding: '8px 16px', cursor: 'pointer', fontFamily: mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!form.title.trim()}
            style={{ background: '#ff5500', border: 'none', color: '#fff', padding: '8px 18px', cursor: form.title.trim() ? 'pointer' : 'not-allowed', opacity: form.title.trim() ? 1 : 0.4, fontFamily: mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Capture Bar ──────────────────────────────────────────────

function CaptureBar({ onCapture }) {
  const [value, setValue] = useState('');

  const submit = text => {
    const url = extractUrl(text);
    if (!url) return false;
    onCapture(url);
    setValue('');
    return true;
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: '#ff5500', pointerEvents: 'none' }}>add_link</span>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onPaste={e => {
            // Pasting a link saves it straight away — no extra click.
            if (submit(e.clipboardData.getData('text'))) e.preventDefault();
          }}
          onKeyDown={e => { if (e.key === 'Enter') submit(value); }}
          placeholder="Paste a MakerWorld, Instagram or Pinterest link…"
          style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1px solid rgba(255,85,0,0.25)', color: '#e5e2e1', fontSize: 13, padding: '11px 12px 11px 36px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,85,0,0.6)'}
          onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,85,0,0.25)'}
        />
      </div>
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
  const [weekAgo] = useState(() => new Date(Date.now() - 7 * 86400000));
  const dragId = useRef(null);
  const toastTimer = useRef(null);

  const showToast = (message, tone = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  // ── Load ──
  useEffect(() => {
    Promise.all([
      supabase.from('ideas').select('*').order('position').order('created_at', { ascending: false }),
      supabase.from('members').select('id, name, color'),
    ]).then(([i, m]) => {
      if (i.error) showToast(`Couldn't load ideas: ${i.error.message}`, 'error');
      setIdeas(i.data || []);
      setMembers(m.data || []);
      setLoading(false);
    });
  }, []);

  const membersById = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);

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

    setIdeas(is => is.map(i => i.id === tempId ? data : i));
    if (!preview?.title || !preview?.image_url) {
      showToast('Saved — the site hid its preview, so tap the card to add a title or image.');
    }
  };

  // ── CRUD ──
  const handleSave = async idea => {
    const { data, error } = await supabase.from('ideas').update({
      title: idea.title, notes: idea.notes || null, status: idea.status,
      author: idea.author || null, image_url: idea.image_url,
    }).eq('id', idea.id).select().single();
    if (error) { showToast(`Couldn't save: ${error.message}`, 'error'); return; }
    setIdeas(is => is.map(i => i.id === data.id ? data : i));
    setModalIdea(null);
  };

  const handleDelete = async id => {
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) { showToast(`Couldn't delete: ${error.message}`, 'error'); return; }
    // Thumbnails copied by idea-preview live in our bucket; remove them too.
    const image = ideas.find(i => i.id === id)?.image_url;
    const stored = image?.split('/storage/v1/object/public/idea-images/')[1];
    if (stored) supabase.storage.from('idea-images').remove([stored]);
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
    if (!id) return;
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;

    if (idea.status !== newStatus) {
      setIdeas(is => is.map(i => i.id === id ? { ...i, status: newStatus } : i));
      await supabase.from('ideas').update({ status: newStatus }).eq('id', id);
      return;
    }

    if (!targetCardId || targetCardId === id) return;

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
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ideas;
    return ideas.filter(i => i.pending || [i.title, i.notes, i.author, i.url].some(v => v?.toLowerCase().includes(q)));
  }, [ideas, search]);

  const byCol = useMemo(() => {
    const out = Object.fromEntries(IDEA_STATUSES.map(s => [s.id, []]));
    for (const i of filtered) (out[i.status] || out.inbox).push(i);
    return out;
  }, [filtered]);

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
              </p>
            </div>
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
          <CaptureBar onCapture={handleCapture} />
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
          onClose={() => setModalIdea(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

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
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
