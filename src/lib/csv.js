// Minimal RFC 4180 CSV parser — enough for a Google Sheets "Download → CSV":
// quoted fields, escaped quotes (""), commas and newlines inside quotes, and
// a leading BOM. Returns { headers, rows } with rows as objects keyed by header.

export function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, '');
  const records = [];
  let record = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      record.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      record.push(field); field = '';
      records.push(record); record = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || record.length) { record.push(field); records.push(record); }

  const nonEmpty = records.filter(r => r.some(v => v.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  // Blank or repeated headers get a column letter so every column stays selectable.
  const seen = {};
  const headers = nonEmpty[0].map((h, i) => {
    let name = h.trim() || `Column ${String.fromCharCode(65 + (i % 26))}`;
    if (seen[name]) name = `${name} (${++seen[name]})`; else seen[name] = 1;
    return name;
  });
  const rows = nonEmpty.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
  return { headers, rows };
}
