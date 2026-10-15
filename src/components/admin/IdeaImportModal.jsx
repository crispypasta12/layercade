import { useState, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { parseCsv } from '../../lib/csv';
import { IDEA_SOURCES, detectSource, normaliseUrl, extractUrl, titleFromUrl, normaliseTag } from '../../lib/ideas';

const mono = "'Space Mono', monospace";

// Ideas fields a sheet column can feed, with header patterns used to guess the mapping.
const FIELDS = [
  { id: 'url',      label: 'Link',     guess: /link|url|source|makerworld|insta|pinterest/i },
  { id: 'title',    label: 'Title',    guess: /title|name|idea|product|item|what/i },
  { id: 'notes',    label: 'Notes',    guess: /note|comment|desc|why|remark|detail/i },
  { id: 'tags',     label: 'Tags',     guess: /tag|categor|type|theme|occasion/i },
  { id: 'status',   label: 'Status',   guess: /status|stage|state|progress|decision/i },
  { id: 'added_by', label: 'Added by', guess: /added.?by|^by$|who|person|member|owner|found/i },
  { id: 'date',     label: 'Date',     guess: /date|added on|created|when|time/i },
];

function guessMapping(headers, rows) {
  const used = new Set();
  const mapping = {};
  for (const f of FIELDS) {
    const h = headers.find(x => !used.has(x) && f.guess.test(x));
    if (h) { mapping[f.id] = h; used.add(h); }
  }
  // No obvious link header: pick the column that most often contains a URL.
  if (!mapping.url) {
    const best = headers
      .filter(h => !used.has(h))
      .map(h => [h, rows.filter(r => /https?:\/\//i.test(r[h])).length])
      .sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] > 0) mapping.url = best[0];
  }
  return mapping;
}

// Free-text sheet statuses → board columns.
function mapStatus(value) {
  const v = (value || '').toLowerCase();
  if (!v) return 'inbox';
  // Order matters: "shortlisted" contains "list", "test printed" contains "print".
  if (/archiv|reject|no\b|skip|drop|nope/.test(v)) return 'archived';
  if (/short|maybe|yes|like|good|consider/.test(v)) return 'shortlisted';
  if (/test|print|sample|prototype/.test(v)) return 'test_print';
  if (/list|live|done|sell|selling|launched|added to (site|shop)/.test(v)) return 'listed';
  return 'inbox';
}

// Sheets exports dates as displayed. In Bangladesh that's day/month, so read
// a/b/yyyy as day/month unless b can't be a month. Ignores nonsense dates.
function parseSheetDate(value) {
  const v = (value || '').trim();
  if (!v) return null;
  let date;
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    let [a, b, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (y < 100) y += 2000;
    const [day, month] = b > 12 ? [b, a] : [a, b];
    date = new Date(y, month - 1, day, 12);
  } else {
    date = new Date(v);
  }
  if (isNaN(date) || date.getFullYear() < 2015 || date > new Date()) return null;
  return date;
}

function matchMember(value, members) {
  const v = (value || '').trim().toLowerCase();
  if (!v) return null;
  return members.find(m => m.name.toLowerCase() === v)
    || members.find(m => m.name.toLowerCase().split(' ')[0] === v.split(' ')[0])
    || null;
}

export default function IdeaImportModal({ members, existingKeys, startPosition, onClose, onImported }) {
  const [fileName, setFileName] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef(null);

  const readFile = async file => {
    if (!file) return;
    setError(null);
    try {
      const result = parseCsv(await file.text());
      if (result.rows.length === 0) { setError('That file has no rows under the header.'); return; }
      setFileName(file.name);
      setParsed(result);
      setMapping(guessMapping(result.headers, result.rows));
    } catch (err) {
      setError(`Couldn't read that file: ${err.message}`);
    }
  };

  // Rows as they'd be saved, plus why any are skipped.
  const plan = useMemo(() => {
    if (!parsed) return null;
    const keys = new Set(existingKeys);
    const out = { create: [], duplicates: 0, empty: 0 };
    for (const row of parsed.rows) {
      const url = mapping.url ? extractUrl(row[mapping.url]) : null;
      const title = mapping.title ? row[mapping.title] : '';
      if (!url && !title) { out.empty++; continue; }
      const key = url ? normaliseUrl(url) : null;
      if (key && keys.has(key)) { out.duplicates++; continue; }
      if (key) keys.add(key);

      const source = url ? detectSource(url) : 'other';
      const date = mapping.date ? parseSheetDate(row[mapping.date]) : null;
      const tags = mapping.tags
        ? [...new Set(row[mapping.tags].split(/[,;|#]/).map(normaliseTag).filter(Boolean))]
        : [];
      out.create.push({
        url,
        url_key: key,
        source,
        title: (title || titleFromUrl(url) || `${IDEA_SOURCES[source].label} idea`).slice(0, 200),
        notes: (mapping.notes && row[mapping.notes]) || null,
        tags,
        status: mapStatus(mapping.status && row[mapping.status]),
        added_by: matchMember(mapping.added_by && row[mapping.added_by], members)?.id ?? null,
        ...(date && { created_at: date.toISOString() }),
        // Remember which rows had no title in the sheet, so the preview pass can fill one in.
        _autoTitle: !title,
      });
    }
    return out;
  }, [parsed, mapping, existingKeys, members]);

  const runImport = async () => {
    if (!plan?.create.length) return;
    setImporting(true);
    setError(null);
    const inserted = [];
    const autoTitled = new Set();
    const rows = plan.create.map(({ _autoTitle, ...r }, i) => {
      if (_autoTitle && r.url_key) autoTitled.add(r.url_key);
      return { ...r, position: startPosition + i };
    });
    for (let i = 0; i < rows.length; i += 200) {
      // Links already on the board (e.g. someone added one while this was open) are skipped.
      const { data, error: err } = await supabase.from('ideas')
        // defaultToNull: false → rows without a date get created_at's default, not null.
        .upsert(rows.slice(i, i + 200), { onConflict: 'url_key', ignoreDuplicates: true, defaultToNull: false })
        .select();
      if (err) {
        setError(`Stopped after ${inserted.length} ideas: ${err.message}`);
        setImporting(false);
        if (inserted.length) onImported(inserted, autoTitled);
        return;
      }
      inserted.push(...data);
    }
    onImported(inserted, autoTitled);
  };

  const select = {
    width: '100%', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
    fontSize: 12, padding: '7px 8px', outline: 'none', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
  };
  const label = { fontFamily: mono, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 5 };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => !importing && onClose()}
    >
      <div
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: mono, fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Import from Google Sheets</span>
          <button onClick={onClose} disabled={importing} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!parsed ? (
            <>
              <p style={{ margin: 0, color: '#aaa', fontSize: 13, lineHeight: 1.6 }}>
                In Google Sheets choose <b style={{ color: '#fff' }}>File → Download → Comma-separated values (.csv)</b>, then pick the file here.
                Each row becomes an idea; links already on the board are skipped.
              </p>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); readFile(e.dataTransfer.files?.[0]); }}
                onClick={() => fileInput.current?.click()}
                style={{ border: '1px dashed rgba(255,85,0,0.4)', padding: '32px 16px', textAlign: 'center', cursor: 'pointer', color: '#888', fontFamily: mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 30, color: '#ff5500', display: 'block', marginBottom: 6 }}>upload_file</span>
                Drop the .csv here or click to choose
              </div>
              <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={e => readFile(e.target.files?.[0])} />
            </>
          ) : (
            <>
              <div style={{ fontFamily: mono, fontSize: 10, color: '#666' }}>
                {fileName} · {parsed.rows.length} rows ·{' '}
                <button onClick={() => { setParsed(null); setFileName(null); }} disabled={importing} style={{ background: 'none', border: 'none', color: '#ff5500', cursor: 'pointer', fontFamily: mono, fontSize: 10, padding: 0 }}>
                  choose another file
                </button>
              </div>

              <div>
                <span style={{ ...label, marginBottom: 10 }}>Which column is which?</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
                  {FIELDS.map(f => (
                    <div key={f.id}>
                      <label style={label}>{f.label}</label>
                      <select value={mapping[f.id] || ''} onChange={e => setMapping(m => ({ ...m, [f.id]: e.target.value || undefined }))} style={select}>
                        <option value="">— not in sheet —</option>
                        {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {plan && (
                <>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <span style={{ color: '#22c55e' }}>{plan.create.length} to import</span>
                    {plan.duplicates > 0 && <span style={{ color: '#eab308' }}>{plan.duplicates} already on board / repeated</span>}
                    {plan.empty > 0 && <span style={{ color: '#666' }}>{plan.empty} skipped (no link or title)</span>}
                  </div>

                  {plan.create.length > 0 && (
                    <div style={{ border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#bbb' }}>
                        <thead>
                          <tr style={{ fontFamily: mono, fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                            {['Title', 'Source', 'Status', 'Tags', 'By'].map(h => <th key={h} style={{ padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 400 }}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {plan.create.slice(0, 6).map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '7px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                              <td style={{ padding: '7px 10px', color: IDEA_SOURCES[r.source].color }}>{IDEA_SOURCES[r.source].label}</td>
                              <td style={{ padding: '7px 10px' }}>{r.status.replace('_', ' ')}</td>
                              <td style={{ padding: '7px 10px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tags.map(t => `#${t}`).join(' ')}</td>
                              <td style={{ padding: '7px 10px' }}>{members.find(m => m.id === r.added_by)?.name.split(' ')[0] ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {plan.create.length > 6 && (
                        <div style={{ padding: '6px 10px', fontFamily: mono, fontSize: 9, color: '#444' }}>…and {plan.create.length - 6} more</div>
                      )}
                    </div>
                  )}
                  <p style={{ margin: 0, color: '#666', fontSize: 11, lineHeight: 1.5 }}>
                    After importing, thumbnails are fetched in the background for rows with a link. You can keep working meanwhile.
                  </p>
                </>
              )}
            </>
          )}
          {error && <div style={{ color: '#ef4444', fontSize: 11, fontFamily: mono }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={importing} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#888', padding: '8px 16px', cursor: 'pointer', fontFamily: mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Cancel
          </button>
          <button
            onClick={runImport}
            disabled={!plan?.create.length || importing}
            style={{ background: '#ff5500', border: 'none', color: '#fff', padding: '8px 18px', cursor: plan?.create.length && !importing ? 'pointer' : 'not-allowed', opacity: plan?.create.length && !importing ? 1 : 0.4, fontFamily: mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            {importing ? 'Importing…' : `Import ${plan?.create.length ?? ''} ideas`}
          </button>
        </div>
      </div>
    </div>
  );
}
