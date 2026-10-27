/**
 * The printable invoice — one A4 page per <div data-invoice-page>.
 *
 * Pagination is measured, not guessed. A line can be one line of text or a
 * paragraph with four photos under it, so the only reliable page break comes
 * from asking the browser how tall each row actually rendered: we lay the rows
 * out off-screen at final width, read their heights, then pack them into pages.
 * The export walks the page elements and gives each its own PDF page, which is
 * why rows and totals never get sliced through the middle.
 *
 * `variant` is 'client' for the copy that goes out, or 'internal' for our copy,
 * which adds cost, profit and margin columns and a summary. Those figures exist
 * only in the internal variant — the client template has no access to them.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import {
  filledLines, fmtCurrency, fmtDate, invoiceTotals,
  lineCost, lineProfit, lineRevenue,
} from '../../lib/invoices';

/* A4 at 96 dpi, which is what html2canvas rasterises against. */
const PAGE_W = 794;
const PAGE_H = 1123;
const PAD_X = 56;
const PAD_TOP = 52;
const PAD_BOTTOM = 76;          // room for the footer rule and page count
const CONTENT_H = PAGE_H - PAD_TOP - PAD_BOTTOM;
const CONTENT_W = PAGE_W - PAD_X * 2;

/* Sub-pixel row heights round against us, so keep a few pixels spare rather
   than let a row land flush on the clip edge. */
const PAGE_SLACK = 8;

/* Measured blocks sit in `display: flow-root` wrappers so their own margins
   count towards the height they take, exactly as they do inside a page's
   content box (which clips, and so contains its children's margins too).
   Without it, the last child's bottom margin collapses out of the wrapper and
   every page is measured as roomier than it is. */
const MEASURE_BLOCK = { display: 'flow-root' };

const INK = '#111111';
const MUTED = '#555555';
const FAINT = '#999999';
const RULE = '#e5e7eb';
const ACCENT = '#ff5500';

const SANS = 'Arial, Helvetica, sans-serif';
const HEAVY = '"Arial Black", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const MONO = '"Courier New", monospace';

const STATUS_CHIP = {
  paid:      { bg: '#dcfce7', fg: '#166534', label: 'Paid' },
  sent:      { bg: '#dbeafe', fg: '#1d4ed8', label: 'Sent' },
  draft:     { bg: '#f3f4f6', fg: '#374151', label: 'Draft' },
  cancelled: { bg: '#fee2e2', fg: '#991b1b', label: 'Cancelled' },
};

/* ─── Shared bits ─────────────────────────────────────────────────────────── */

function Eyebrow({ children, color = FAINT }) {
  return (
    <div style={{ fontFamily: SANS, fontWeight: 'bold', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color }}>
      {children}
    </div>
  );
}

function FullHeader({ invoice, business }) {
  const chip = STATUS_CHIP[invoice.status] ?? STATUS_CHIP.draft;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
      <div>
        <div style={{ fontFamily: HEAVY, fontSize: 26, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0a0a0a', lineHeight: 1 }}>
          {business.name}
        </div>
        {business.tagline && (
          <div style={{ fontFamily: SANS, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginTop: 5 }}>
            {business.tagline}
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 10.5, color: MUTED, lineHeight: 1.65 }}>
          {business.address && <div>{business.address}</div>}
          {business.phone && <div>{business.phone}</div>}
          {business.email && <div>{business.email}</div>}
          {business.website && <div>{business.website}</div>}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: HEAVY, fontSize: 34, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: ACCENT, lineHeight: 1 }}>
          Invoice
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#777', marginTop: 7, letterSpacing: '0.06em' }}>
          {invoice.number}
        </div>
        <div style={{ marginTop: 12, fontSize: 10.5, color: MUTED, lineHeight: 1.8 }}>
          <div><span style={{ color: FAINT }}>Date: </span>{fmtDate(invoice.issue_date)}</div>
          {invoice.due_date && <div><span style={{ color: FAINT }}>Due: </span>{fmtDate(invoice.due_date)}</div>}
          <div style={{ marginTop: 4 }}>
            <span style={{
              display: 'inline-block', padding: '2px 8px', background: chip.bg, color: chip.fg,
              fontFamily: SANS, fontWeight: 'bold', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              {chip.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pages after the first only need enough to identify the invoice. */
function RunningHeader({ invoice, business }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      borderBottom: `1px solid ${RULE}`, paddingBottom: 10, marginBottom: 20,
    }}>
      <span style={{ fontFamily: HEAVY, fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0a0a0a' }}>
        {business.name}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#888', letterSpacing: '0.06em' }}>
        {invoice.number} · {fmtDate(invoice.issue_date)}
      </span>
    </div>
  );
}

function BillTo({ invoice }) {
  return (
    <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: 20, marginBottom: 24 }}>
      <div style={{ marginBottom: 7 }}><Eyebrow color={ACCENT}>Bill To</Eyebrow></div>
      <div style={{ fontSize: 14.5, fontWeight: 'bold', color: INK, marginBottom: 3 }}>
        {invoice.client_name || '—'}
      </div>
      <div style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.65 }}>
        {invoice.client_email && <div>{invoice.client_email}</div>}
        {invoice.client_phone && <div>{invoice.client_phone}</div>}
        {invoice.client_address && <div style={{ whiteSpace: 'pre-line' }}>{invoice.client_address}</div>}
      </div>
    </div>
  );
}

/* ─── Items table ─────────────────────────────────────────────────────────── */

const TH = {
  padding: '9px 12px', color: '#fff', fontFamily: SANS, fontWeight: 'bold',
  fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase',
};
const TD = { padding: '10px 12px', fontSize: 11.5, verticalAlign: 'top' };

function columns(variant) {
  const cols = [
    { key: 'idx',   label: '#',          align: 'left',   width: 30 },
    { key: 'desc',  label: 'Description', align: 'left',  width: null },
    { key: 'qty',   label: 'Qty',        align: 'center', width: 46 },
    { key: 'price', label: 'Unit Price', align: 'right',  width: 86 },
  ];
  if (variant === 'internal') {
    cols.push(
      { key: 'cost',   label: 'Unit Cost', align: 'right', width: 80 },
      { key: 'profit', label: 'Profit',    align: 'right', width: 80 },
    );
  }
  cols.push({ key: 'total', label: 'Total', align: 'right', width: 92 });
  return cols;
}

function ItemsHead({ variant }) {
  return (
    <thead>
      <tr style={{ background: '#0a0a0a' }}>
        {columns(variant).map((col) => (
          <th key={col.key} style={{ ...TH, textAlign: col.align, ...(col.width && { width: col.width }) }}>
            {col.key === 'idx' ? '' : col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function ItemRow({ line, index, variant, currency, rowRef }) {
  const revenue = lineRevenue(line);
  const zebra = index % 2 === 0 ? '#ffffff' : '#fafafa';
  const num = (v, bold = false) => (
    <td style={{ ...TD, textAlign: 'right', fontFamily: MONO, color: bold ? INK : MUTED, fontWeight: bold ? 'bold' : 'normal' }}>
      {fmtCurrency(v, currency)}
    </td>
  );

  return (
    <tr ref={rowRef} style={{ background: zebra, borderBottom: `1px solid #f0f0f0` }}>
      <td style={{ ...TD, fontFamily: MONO, fontSize: 10, color: '#aaa' }}>{index + 1}</td>
      <td style={{ ...TD, color: '#222' }}>
        <div style={{ whiteSpace: 'pre-line', lineHeight: 1.45 }}>{line.description || '—'}</div>
        {line.images.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {line.images.map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                crossOrigin="anonymous"
                style={{
                  width: 58, height: 58, objectFit: 'cover',
                  border: `1px solid ${RULE}`, display: 'block', background: '#f4f4f4',
                }}
              />
            ))}
          </div>
        )}
      </td>
      <td style={{ ...TD, textAlign: 'center', fontFamily: MONO, color: MUTED }}>{line.qty}</td>
      {num(line.unit_price)}
      {variant === 'internal' && num(lineCost(line) / (Number(line.qty) || 1))}
      {variant === 'internal' && (
        <td style={{ ...TD, textAlign: 'right', fontFamily: MONO, color: lineProfit(line) < 0 ? '#b91c1c' : '#166534' }}>
          {fmtCurrency(lineProfit(line), currency)}
        </td>
      )}
      {num(revenue, true)}
    </tr>
  );
}

function ItemsTable({ children, variant }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: SERIF, tableLayout: 'fixed' }}>
      <ItemsHead variant={variant} />
      <tbody>{children}</tbody>
    </table>
  );
}

/* ─── Totals & notes ──────────────────────────────────────────────────────── */

function Totals({ invoice, variant }) {
  const lines = filledLines(invoice.items);
  const { revenue, cost, profit, margin } = invoiceTotals(lines);
  const c = invoice.currency;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 268 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${RULE}` }}>
            <span style={{ fontFamily: SANS, fontSize: 10.5, color: '#888' }}>Subtotal</span>
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: INK, fontWeight: 'bold' }}>{fmtCurrency(revenue, c)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#0a0a0a', marginTop: 4 }}>
            <span style={{ fontFamily: SANS, fontSize: 10.5, color: '#ccc', fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Total Due
            </span>
            <span style={{ fontFamily: MONO, fontSize: 15, color: ACCENT, fontWeight: 'bold' }}>{fmtCurrency(revenue, c)}</span>
          </div>
        </div>
      </div>

      {variant === 'internal' && (
        <div style={{ marginTop: 20, border: `1px solid ${RULE}`, background: '#fafafa', padding: '14px 16px' }}>
          <div style={{ marginBottom: 10 }}><Eyebrow>Internal summary — not for the client</Eyebrow></div>
          <div style={{ display: 'flex', gap: 28 }}>
            {[
              ['Billed', fmtCurrency(revenue, c), INK],
              ['Cost', fmtCurrency(cost, c), MUTED],
              ['Profit', fmtCurrency(profit, c), profit < 0 ? '#b91c1c' : '#166534'],
              ['Margin', margin == null ? '—' : `${margin.toFixed(1)}%`, profit < 0 ? '#b91c1c' : '#166534'],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div style={{ fontFamily: SANS, fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: FAINT }}>{label}</div>
                <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 'bold', color, marginTop: 3 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Notes({ invoice }) {
  if (!invoice.notes.trim()) return null;
  return (
    <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: 18, marginTop: 24 }}>
      <div style={{ marginBottom: 7 }}><Eyebrow>Notes</Eyebrow></div>
      <div style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{invoice.notes}</div>
    </div>
  );
}

/* ─── Page frame ──────────────────────────────────────────────────────────── */

function Page({ children, pageNumber, pageCount, business, variant }) {
  return (
    <div
      data-invoice-page={pageNumber}
      style={{
        width: PAGE_W, height: PAGE_H, background: '#ffffff', color: INK,
        fontFamily: SERIF, padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`,
        boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: ACCENT }} />
      {variant === 'internal' && (
        <div style={{
          position: 'absolute', top: 6, left: 0, right: 0, padding: '3px 0', background: '#0a0a0a',
          fontFamily: SANS, fontWeight: 'bold', fontSize: 8, letterSpacing: '0.24em',
          textTransform: 'uppercase', color: ACCENT, textAlign: 'center',
        }}>
          Internal copy · costs &amp; profit
        </div>
      )}

      <div style={{ height: CONTENT_H, overflow: 'hidden', marginTop: variant === 'internal' ? 14 : 0 }}>
        {children}
      </div>

      <div style={{
        position: 'absolute', bottom: 30, left: PAD_X, right: PAD_X,
        borderTop: `1px solid ${RULE}`, paddingTop: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: SANS, fontSize: 9.5, color: '#bbb', letterSpacing: '0.06em' }}>
          {business.name}
          {business.website || business.email || business.phone ? ` · ${business.website || business.email || business.phone}` : ''}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: '#bbb', letterSpacing: '0.08em' }}>
          Page {pageNumber} of {pageCount}
        </span>
        {pageNumber === pageCount && (
          <span style={{
            fontFamily: HEAVY, fontSize: 9.5, fontWeight: 900, color: ACCENT,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginLeft: 12,
          }}>
            Thank you
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Pagination ──────────────────────────────────────────────────────────── */

/**
 * Pack measured row heights into pages.
 *
 * The first page gives up space to the letterhead and Bill To; later pages only
 * carry the running header. The totals block has to land under the last row it
 * belongs to, so when it won't fit we start a fresh page for it rather than let
 * it collide with the footer.
 */
function paginate({ rowHeights, firstOverhead, runningOverhead, headHeight, tailHeight }) {
  const pages = [];
  let current = [];
  let used = 0;
  let capacity = CONTENT_H - PAGE_SLACK - firstOverhead - headHeight;

  const flush = () => {
    pages.push(current);
    current = [];
    used = 0;
    capacity = CONTENT_H - PAGE_SLACK - runningOverhead - headHeight;
  };

  rowHeights.forEach((height, idx) => {
    // A row taller than a whole page can't be split, so it gets a page of its
    // own and overflows invisibly rather than pushing the footer off.
    if (current.length && used + height > capacity) flush();
    current.push(idx);
    used += height;
  });

  pages.push(current);

  // The tail (totals, and notes when there are any) follows the final row.
  const lastCapacity = CONTENT_H - PAGE_SLACK - headHeight
    - (pages.length === 1 ? firstOverhead : runningOverhead);
  const lastUsed = pages[pages.length - 1].reduce((sum, idx) => sum + rowHeights[idx], 0);

  const tailOnOwnPage = lastUsed + tailHeight > lastCapacity;
  if (tailOnOwnPage) pages.push([]);

  return { pages, tailPage: pages.length - 1 };
}

/* ─── The document ────────────────────────────────────────────────────────── */

export default function InvoiceDocument({ invoice, business, variant = 'client', onReady }) {
  const lines = filledLines(invoice.items);
  // A layout is only good for the content it was measured against, so it
  // carries the signature it came from; anything else makes it stale and sends
  // the document back through a measuring pass.
  const [measured, setMeasured] = useState(null);
  const [pass, setPass] = useState(0);

  const rowRefs = useRef([]);
  const firstOverheadRef = useRef(null);
  const runningOverheadRef = useRef(null);
  const headRef = useRef(null);
  const totalsRef = useRef(null);
  const notesRef = useRef(null);

  // Re-measure whenever anything that changes a height changes. Images load
  // after layout, so each one nudges the signature and re-runs the pass.
  const signature = JSON.stringify([
    variant,
    invoice.currency,
    invoice.notes,
    invoice.client_name, invoice.client_email, invoice.client_phone, invoice.client_address,
    business,
    lines.map((l) => [l.description, l.qty, l.unit_price, l.cost, l.images]),
  ]);

  const layout = measured && measured.signature === signature && measured.pass === pass ? measured : null;

  useLayoutEffect(() => {
    if (layout) return;
    const rows = rowRefs.current.slice(0, lines.length);
    if (rows.some((node) => !node)) return;

    setMeasured({
      signature,
      pass,
      ...paginate({
        rowHeights:      rows.map((node) => node.offsetHeight),
        firstOverhead:   firstOverheadRef.current?.offsetHeight ?? 0,
        runningOverhead: runningOverheadRef.current?.offsetHeight ?? 0,
        headHeight:      headRef.current?.offsetHeight ?? 0,
        tailHeight:      (totalsRef.current?.offsetHeight ?? 0) + (notesRef.current?.offsetHeight ?? 0),
      }),
    });
  }, [layout, lines.length, signature, pass]);

  // Photos change row heights, and they arrive after the first measuring pass.
  // Only the measuring tree matters here; once pages are laid out the refs
  // point at unmounted nodes.
  useLayoutEffect(() => {
    if (layout) return;
    const imgs = rowRefs.current.flatMap((node) => (node ? [...node.querySelectorAll('img')] : []));
    const pending = imgs.filter((img) => !img.complete);
    if (!pending.length) return;
    const remeasure = () => setPass((n) => n + 1);
    pending.forEach((img) => {
      img.addEventListener('load', remeasure, { once: true });
      img.addEventListener('error', remeasure, { once: true });
    });
    return () => pending.forEach((img) => {
      img.removeEventListener('load', remeasure);
      img.removeEventListener('error', remeasure);
    });
  }, [layout, signature]);

  const ready = Boolean(layout);
  useLayoutEffect(() => { if (ready) onReady?.(); }, [ready, onReady]);

  /* Measuring pass: everything laid out once, off-screen, at final width. */
  if (!layout) {
    return (
      <div aria-hidden style={{ position: 'absolute', left: -99999, top: 0, width: PAGE_W, pointerEvents: 'none' }}>
        <div style={{ width: CONTENT_W, fontFamily: SERIF, color: INK, background: '#fff' }}>
          <div ref={firstOverheadRef} style={MEASURE_BLOCK}>
            <FullHeader invoice={invoice} business={business} />
            <BillTo invoice={invoice} />
          </div>
          <div ref={runningOverheadRef} style={MEASURE_BLOCK}>
            <RunningHeader invoice={invoice} business={business} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead ref={headRef}><tr style={{ background: '#0a0a0a' }}>
              {columns(variant).map((col) => (
                <th key={col.key} style={{ ...TH, textAlign: col.align, ...(col.width && { width: col.width }) }}>
                  {col.key === 'idx' ? '' : col.label}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {lines.map((line, idx) => (
                <ItemRow
                  key={line.id}
                  line={line}
                  index={idx}
                  variant={variant}
                  currency={invoice.currency}
                  rowRef={(node) => { rowRefs.current[idx] = node; }}
                />
              ))}
            </tbody>
          </table>
          <div ref={totalsRef} style={MEASURE_BLOCK}>
            <Totals invoice={invoice} variant={variant} />
          </div>
          <div ref={notesRef} style={MEASURE_BLOCK}>
            <Notes invoice={invoice} />
          </div>
        </div>
      </div>
    );
  }

  const { pages, tailPage } = layout;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {pages.map((rowIdxs, pageIdx) => (
        <Page
          key={pageIdx}
          pageNumber={pageIdx + 1}
          pageCount={pages.length}
          business={business}
          variant={variant}
        >
          {pageIdx === 0
            ? <><FullHeader invoice={invoice} business={business} /><BillTo invoice={invoice} /></>
            : <RunningHeader invoice={invoice} business={business} />}

          {rowIdxs.length > 0 && (
            <ItemsTable variant={variant}>
              {rowIdxs.map((idx) => (
                <ItemRow
                  key={lines[idx].id}
                  line={lines[idx]}
                  index={idx}
                  variant={variant}
                  currency={invoice.currency}
                />
              ))}
            </ItemsTable>
          )}

          {pageIdx === tailPage && (
            <>
              <Totals invoice={invoice} variant={variant} />
              <Notes invoice={invoice} />
            </>
          )}
        </Page>
      ))}
    </div>
  );
}
