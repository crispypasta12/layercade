/**
 * One definition of "search orders by this text", shared by the Orders page and
 * the command palette so the two cannot drift apart.
 *
 * Matches customer name, phone, and the numeric order id — with an `ORD-`
 * prefix stripped, since that is how order numbers are shown to customers.
 */
export function orderSearchFilter(term) {
  const cleaned = (term ?? '').trim().toLowerCase().replace(/^ord-/i, '');
  if (!cleaned) return null;

  const parts = [
    `customer_name.ilike.%${cleaned}%`,
    `phone.ilike.%${cleaned}%`,
  ];
  const idNum = parseInt(cleaned, 10);
  if (!isNaN(idNum)) parts.push(`id.eq.${idNum}`);

  return parts.join(',');
}
