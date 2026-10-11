/**
 * Filament inventory — reference lists and the maths behind the Inventory page.
 *
 * Every list and number here comes from "Filament Tracker_1.xlsx" (Lists and
 * Material Guide sheets). The remaining-weight formula mirrors the sheet's
 * "Remaining (g)" column exactly so the two never disagree.
 */

export const STATUSES = [
  { value: 'in_ams', label: 'In AMS', color: '#34d399' },
  { value: 'open',   label: 'Open',   color: '#fbbf24' },
  { value: 'sealed', label: 'Sealed', color: '#60a5fa' },
  { value: 'low',    label: 'Low',    color: '#f87171' },
  { value: 'empty',  label: 'Empty',  color: '#6b7280' },
];

export const STATUS_BY_VALUE = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

export const AMS_SLOTS = ['AMS Slot 1', 'AMS Slot 2', 'AMS Slot 3', 'AMS Slot 4'];

export const LOCATIONS = [...AMS_SLOTS, 'Cargo Box', 'Shelf', 'Dry Box', 'Other'];

export const BRANDS = ['Bambu Lab', 'Sunlu', 'eSUN', 'Polymaker', 'Elegoo', 'Unknown', 'Other'];

export const MATERIALS = ['PLA', 'PETG', 'ASA', 'ABS', 'TPU', 'PLA-CF', 'PETG-CF', 'PC', 'PA', 'Unknown'];

export const FINISHES = ['Basic', 'Matte', 'Silk', 'Wood', 'Aero', 'HF', 'Translucent', 'Glow', 'Marble', 'Sparkle', 'Metal', 'CF', '—'];

/** Empty-spool weight in grams, subtracted from a scale reading. Approximate. */
export const SPOOL_TYPES = [
  { value: 'Bambu reusable',    tare: 250 },
  { value: 'Bambu cardboard',   tare: 145 },
  { value: 'Sunlu plastic',     tare: 180 },
  { value: 'Clear plastic',     tare: 200 },
  { value: 'Refill (no spool)', tare: 0   },
  { value: 'Other',             tare: 200 },
];

export function spoolTare(spoolType) {
  return SPOOL_TYPES.find((t) => t.value === spoolType)?.tare ?? 0;
}

/** Material Guide sheet, verbatim. */
export const MATERIAL_GUIDE = [
  { key: 'PLA Basic / Matte', nozzle: '190–230', bed: '45–65',  dry: '55°C · 8h', enclosure: 'No (door open)', notes: 'From Bambu labels. Matte is a bit more brittle.' },
  { key: 'PLA Wood',          nozzle: '190–240', bed: '45–65',  dry: '55°C · 8h', enclosure: 'No',             notes: 'Wood particles — 0.6 mm / hardened nozzle helps avoid clogs.' },
  { key: 'PLA Silk',          nozzle: '200–230', bed: '45–65',  dry: '55°C · 8h', enclosure: 'No',             notes: 'Slower outer walls for best shine.' },
  { key: 'PETG',              nozzle: '230–260', bed: '70–80',  dry: '65°C · 8h', enclosure: 'Optional',       notes: 'Use glue stick/textured plate; stringier than PLA.' },
  { key: 'ASA Aero',          nozzle: '240–280', bed: '90–100', dry: '80°C · 8h', enclosure: 'Yes',            notes: 'From Bambu label. Lightweight foaming ASA; ventilate.' },
  { key: 'ABS',               nozzle: '240–280', bed: '90–100', dry: '80°C · 8h', enclosure: 'Yes',            notes: 'Ventilate; warps without enclosure.' },
  { key: 'TPU',               nozzle: '220–240', bed: '30–35',  dry: '70°C · 8h', enclosure: 'No',             notes: 'Not AMS-compatible on P1S — feed externally.' },
];

/** Guide entry for a spool's material + finish, or null when unknown. */
export function guideFor(material, finish) {
  const byKey = (k) => MATERIAL_GUIDE.find((g) => g.key === k) ?? null;
  switch (material) {
    case 'PLA':
      if (finish === 'Wood') return byKey('PLA Wood');
      if (finish === 'Silk') return byKey('PLA Silk');
      return byKey('PLA Basic / Matte');
    case 'PETG': return byKey('PETG');
    case 'ASA':  return byKey('ASA Aero');
    case 'ABS':  return byKey('ABS');
    case 'TPU':  return byKey('TPU');
    default:     return null;
  }
}

/**
 * Grams of filament left. Same rule as the spreadsheet:
 * a scale reading minus the empty spool wins; otherwise empty spools are 0
 * and everything else counts as its full net weight.
 */
export function remainingGrams(spool) {
  if (spool.scale_reading_g != null && spool.scale_reading_g !== '') {
    return Math.max(0, Number(spool.scale_reading_g) - spoolTare(spool.spool_type));
  }
  if (spool.status === 'empty') return 0;
  return Number(spool.net_weight_g) || 0;
}

/** 0–1 fraction of the net weight remaining. */
export function fractionLeft(spool) {
  const net = Number(spool.net_weight_g);
  if (!net) return 0;
  return Math.min(1, remainingGrams(spool) / net);
}

export const LOW_THRESHOLD = 0.2;

/** Colour for a fill level — same bands as the sheet's % Left formatting. */
export function levelColor(fraction) {
  if (fraction < LOW_THRESHOLD) return '#f87171';
  if (fraction < 0.5) return '#fbbf24';
  return '#34d399';
}

export function isRunningLow(spool) {
  return spool.status !== 'empty' && fractionLeft(spool) < LOW_THRESHOLD;
}

/** "PLA Matte", "PETG", "Unknown" — material plus finish when it adds anything. */
export function materialLabel(spool) {
  const finish = spool.finish && spool.finish !== '—' ? spool.finish : '';
  return [spool.material || 'Unknown', finish].filter(Boolean).join(' ');
}

/** Next sequential spool code, e.g. F020. */
export function nextCode(spools) {
  const max = spools.reduce((m, s) => {
    const n = Number(String(s.code ?? '').replace(/^F/, ''));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return 'F' + String(max + 1).padStart(3, '0');
}

/** Relative luminance check so white/very light swatches get an outline. */
export function isLightHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 200;
}

export function formatGrams(g) {
  return `${Math.round(g).toLocaleString('en-IN')} g`;
}

export function formatKg(g) {
  return `${(g / 1000).toFixed(1)} kg`;
}
