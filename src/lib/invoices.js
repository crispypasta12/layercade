/**
 * Invoice data layer — backed by Supabase (see
 * supabase/migrations/20261028000001_invoices.sql).
 *
 * A line carries both what we charge and what the item cost us:
 *
 *   { id, description, qty, unit_price, cost, images: [url, …], productId? }
 *
 * `cost` is per unit, same as `unit_price`, and is ours alone: it feeds the
 * live profit figures in the editor and the internal copy of the PDF. The
 * client-facing template never reads it, and nothing public can read the table.
 */
import { supabase } from './supabase';

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'cancelled'];

export const INVOICE_STATUS_META = {
  draft:     { label: 'Draft',     bg: 'bg-stone-800',    text: 'text-stone-400', border: 'border-stone-700' },
  sent:      { label: 'Sent',      bg: 'bg-blue-500/20',  text: 'text-blue-400',  border: 'border-blue-500/30' },
  paid:      { label: 'Paid',      bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/20',   text: 'text-red-400',   border: 'border-red-500/30' },
};

export const MAX_ITEM_IMAGES = 4;

/* ─── Line items ──────────────────────────────────────────────────────────── */

let lineSeq = 0;
/** Row keys only need to be unique within one invoice, not stable in the DB. */
export function newLineId() {
  lineSeq += 1;
  return `L${Date.now().toString(36)}${lineSeq}`;
}

export function emptyLine() {
  return { id: newLineId(), description: '', qty: 1, unit_price: 0, cost: 0, images: [] };
}

/** Rows come back from jsonb, so nothing about their shape is guaranteed. */
function normaliseLine(raw, idx) {
  const line = raw && typeof raw === 'object' ? raw : {};
  return {
    id:          line.id != null ? String(line.id) : `L${idx}`,
    description: typeof line.description === 'string' ? line.description : '',
    qty:         Number(line.qty) || 0,
    unit_price:  Number(line.unit_price) || 0,
    cost:        Number(line.cost) || 0,
    images:      Array.isArray(line.images)
      ? line.images.filter((url) => typeof url === 'string' && url.trim()).slice(0, MAX_ITEM_IMAGES)
      : [],
    ...(line.productId != null && { productId: line.productId }),
  };
}

/** A line nobody filled in shouldn't reach the PDF or the order. */
export function isBlankLine(line) {
  return !line.description.trim() && !line.unit_price && !line.cost && !line.images.length;
}

export function filledLines(items) {
  return items.filter((line) => !isBlankLine(line));
}

/* ─── Money ───────────────────────────────────────────────────────────────── */

export function lineRevenue(line) { return (Number(line.qty) || 0) * (Number(line.unit_price) || 0); }
export function lineCost(line)    { return (Number(line.qty) || 0) * (Number(line.cost) || 0); }
export function lineProfit(line)  { return lineRevenue(line) - lineCost(line); }

/** Margin as a percentage of revenue, or null when there's no revenue to divide by. */
export function marginPct(revenue, profit) {
  return revenue > 0 ? (profit / revenue) * 100 : null;
}

export function invoiceTotals(items = []) {
  const revenue = items.reduce((sum, line) => sum + lineRevenue(line), 0);
  const cost    = items.reduce((sum, line) => sum + lineCost(line), 0);
  const profit  = revenue - cost;
  return { revenue, cost, profit, margin: marginPct(revenue, profit) };
}

export function fmtCurrency(n, currency = 'BDT') {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  // Whole taka reads better on a bill than trailing .00; keep paisa only when
  // the figure actually has them.
  const body = abs % 1 === 0
    ? abs.toLocaleString(currency === 'BDT' ? 'en-IN' : 'en-US')
    : abs.toLocaleString(currency === 'BDT' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}${currency === 'BDT' ? '৳' : '$'}${body}`;
}

/**
 * Today where the user is, as yyyy-mm-dd.
 *
 * Not `toISOString()`, and not the column's `current_date` default: both are
 * UTC, which in Dhaka dates anything made before 06:00 to yesterday.
 */
export function todayLocal() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Rows ────────────────────────────────────────────────────────────────── */

function fromRow(row) {
  return {
    id:             row.id,
    number:         row.number,
    status:         INVOICE_STATUSES.includes(row.status) ? row.status : 'draft',
    currency:       row.currency === 'USD' ? 'USD' : 'BDT',
    issue_date:     row.issue_date ?? todayLocal(),
    due_date:       row.due_date ?? '',
    client_name:    row.client_name ?? '',
    client_email:   row.client_email ?? '',
    client_phone:   row.client_phone ?? '',
    client_address: row.client_address ?? '',
    notes:          row.notes ?? '',
    items:          (Array.isArray(row.items) ? row.items : []).map(normaliseLine),
    order_id:       row.order_id ?? null,
    completed_at:   row.completed_at ?? null,
    created_at:     row.created_at ?? null,
  };
}

/** Only the columns the editor owns — never number, order_id or completed_at. */
const EDITABLE = [
  'status', 'currency', 'issue_date', 'due_date',
  'client_name', 'client_email', 'client_phone', 'client_address',
  'notes', 'items',
];

function toRow(invoice) {
  const row = {};
  for (const key of EDITABLE) {
    if (key === 'items') {
      row.items = invoice.items.map((line) => ({
        id:          line.id,
        description: line.description,
        qty:         Number(line.qty) || 0,
        unit_price:  Number(line.unit_price) || 0,
        cost:        Number(line.cost) || 0,
        images:      line.images ?? [],
        ...(line.productId != null && { productId: line.productId }),
      }));
    } else if (key === 'due_date') {
      row.due_date = invoice.due_date || null;   // date column rejects ''
    } else {
      row[key] = invoice[key];
    }
  }
  return row;
}

/* ─── Queries ─────────────────────────────────────────────────────────────── */

export async function fetchInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

/** The number comes from a trigger, so the inserted row is the source of truth. */
export async function createInvoice({ memberId = null } = {}) {
  const { data, error } = await supabase
    .from('invoices')
    .insert({ items: [emptyLine()], issue_date: todayLocal(), created_by: memberId })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function saveInvoice(invoice) {
  const { data, error } = await supabase
    .from('invoices')
    .update(toRow(invoice))
    .eq('id', invoice.id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

/** Everything a fresh copy of an invoice should carry over. */
export async function duplicateInvoice(invoice, { memberId = null } = {}) {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      ...toRow({ ...invoice, status: 'draft', issue_date: todayLocal() }),
      created_by: memberId,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

/* ─── Completing an invoice ───────────────────────────────────────────────── */

/**
 * Turn a finished invoice into an order.
 *
 * The order carries each line's description, quantity, charged price, attached
 * photos and our cost, so the Orders page shows the whole job without reading
 * the invoice back. Cost rides along in the items jsonb — orders are
 * back-office rows too, and nothing customer-facing renders it.
 *
 * Idempotent by way of `order_id`: an invoice that already made an order is
 * refused rather than billed twice.
 */
export async function completeInvoice(invoice, { business } = {}) {
  if (invoice.order_id) throw new Error(`Invoice ${invoice.number} is already in Orders as #${invoice.order_id}.`);

  const lines = filledLines(invoice.items);
  if (!lines.length)                 throw new Error('Add at least one line item before completing.');
  if (!invoice.client_name.trim())   throw new Error('A client name is needed — the order stores it as the customer.');
  if (!invoice.client_phone.trim())  throw new Error('A client phone number is needed — the order stores it as the contact.');

  const { revenue } = invoiceTotals(lines);
  const hasAddress = Boolean(invoice.client_address.trim());

  const items = lines.map((line) => ({
    id:       line.id,
    name:     line.description.trim() || 'Unnamed item',
    price:    Number(line.unit_price) || 0,
    quantity: Number(line.qty) || 1,
    cost:     Number(line.cost) || 0,
    image:    line.images[0] ?? '',
    images:   line.images,
    ...(line.productId != null && { productId: line.productId }),
  }));

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name:    invoice.client_name.trim(),
      phone:            invoice.client_phone.trim(),
      email:            invoice.client_email.trim() || null,
      fulfillment_type: hasAddress ? 'delivery' : 'pickup',
      address:          hasAddress ? invoice.client_address.trim() : null,
      area:             null,
      district:         null,
      items,
      total_amount:     revenue,
      delivery_fee:     0,
      status:           invoice.status === 'paid' ? 'delivered' : 'confirmed',
      payment_method:   'invoice',
      notes:            invoice.notes.trim() || null,
      admin_notes:      `From invoice ${invoice.number}${business?.name ? ` · ${business.name}` : ''}`,
      invoice_id:       invoice.id,
    })
    .select()
    .single();
  if (orderError) throw orderError;

  // The invoice is now billed: point it at the order, and move a still-draft
  // one to sent so the list doesn't show a completed job as unfinished.
  const { data: updated, error: invoiceError } = await supabase
    .from('invoices')
    .update({
      order_id:     order.id,
      completed_at: new Date().toISOString(),
      ...(invoice.status === 'draft' && { status: 'sent' }),
    })
    .eq('id', invoice.id)
    .select()
    .single();
  if (invoiceError) throw invoiceError;

  return { invoice: fromRow(updated), order };
}

/* ─── Product costs ───────────────────────────────────────────────────────── */

/**
 * Products for the line-item picker, with cost_price.
 *
 * Deliberately not fetchProducts(): that select feeds the public storefront,
 * and cost_price has no business in a payload the customer's browser receives.
 */
export async function fetchProductCosts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, cost_price, image, images')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id:    row.id,
    name:  row.name,
    price: Number(row.price) || 0,
    cost:  row.cost_price != null ? Number(row.cost_price) : null,
    image: (Array.isArray(row.images) && row.images[0]) || row.image || null,
  }));
}
