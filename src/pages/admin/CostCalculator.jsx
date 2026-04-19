import { useState, useEffect, useCallback } from 'react';
import AdminNavbar from '../../components/admin/AdminNavbar';

/* ─── Defaults ───────────────────────────────────────────────────── */

const DEFAULT_MATERIALS = [
  { id: 1, material: 'PLA Basic',  price_per_kg: 1700 },
  { id: 2, material: 'PLA Matte',  price_per_kg: 1700 },
  { id: 3, material: 'PLA Galaxy', price_per_kg: 2500 },
  { id: 4, material: 'PETG',       price_per_kg: 2200 },
  { id: 5, material: 'ASA Aero',   price_per_kg: 5000 },
  { id: 6, material: 'ABS',        price_per_kg: 1800 },
  { id: 7, material: 'TPU',        price_per_kg: 3500 },
  { id: 8, material: 'Custom 1',   price_per_kg: 2000 },
];

const DEFAULT_SETTINGS = {
  electricity_rate:           0.12,
  support_material_factor:    15,
  startup_spike_watts:        300,
  startup_duration_mins:      5,
  printing_power_watts:       150,
  setup_labor_rate:           15,
  post_processing_labor_rate: 15,
  design_labor_rate:          25,
  nozzle_wear_rate:           0.05,
  build_plate_adhesive_cost:  0.25,
  cleaning_supplies_cost:     0.15,
  failure_rate:               5,
  markup:                     40,
  price_rounding:             5,
  minimum_price:              5,
  currency:                   'BDT',
};

const DEFAULT_INPUTS = {
  print_hours:          3.5,
  quantity:             1,
  is_batch:             false,
  setup_time_mins:      10,
  post_processing_mins: 15,
  cad_design_mins:      0,
};

const DEFAULT_PRESETS = [
  {
    id: 1,
    name: 'Standard PLA Print',
    materials: [{ materialId: 1, weight_g: 50 }],
    print_hours: 3.5,
    setup_time_mins: 10,
    post_processing_mins: 15,
    cad_design_mins: 0,
  },
  {
    id: 2,
    name: 'High-Detail PETG',
    materials: [{ materialId: 4, weight_g: 80 }],
    print_hours: 6,
    setup_time_mins: 15,
    post_processing_mins: 30,
    cad_design_mins: 0,
  },
  {
    id: 3,
    name: 'TPU Flexible Part',
    materials: [{ materialId: 7, weight_g: 35 }],
    print_hours: 4,
    setup_time_mins: 20,
    post_processing_mins: 10,
    cad_design_mins: 0,
  },
];

/* ─── Storage helpers ────────────────────────────────────────────── */

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ─── Core calculation ───────────────────────────────────────────── */

function calculate(inputs, selectedMaterials, allMaterials, settings) {
  const {
    print_hours, quantity, is_batch,
    setup_time_mins, post_processing_mins, cad_design_mins,
  } = inputs;
  const s = settings;

  if (!selectedMaterials.length || !print_hours || !quantity) return null;

  // 1. Material cost
  let rawMaterialCost = 0;
  for (const sm of selectedMaterials) {
    const mat = allMaterials.find((m) => m.id === sm.materialId);
    if (!mat || !sm.weight_g) continue;
    const kg = sm.weight_g / 1000;
    rawMaterialCost += kg * mat.price_per_kg;
  }
  const supportAddon = rawMaterialCost * (s.support_material_factor / 100);
  const materialCost = rawMaterialCost + supportAddon;

  // 2. Electricity cost
  const startupCost = (s.startup_spike_watts * s.startup_duration_mins / 60) / 1000 * s.electricity_rate;
  const printCost   = (s.printing_power_watts * print_hours) / 1000 * s.electricity_rate;
  const electricityCost = startupCost + printCost;

  // 3. Labor cost (print time NOT counted)
  const batchDiv = is_batch ? quantity : 1;
  const setupLaborCost         = (setup_time_mins / 60) / batchDiv * s.setup_labor_rate;
  const postProcessingLaborCost = (post_processing_mins / 60) / batchDiv * s.post_processing_labor_rate;
  const designLaborCost        = (cad_design_mins / 60) / batchDiv * s.design_labor_rate;
  const laborCost = setupLaborCost + postProcessingLaborCost + designLaborCost;

  // 4. Consumables
  const nozzleCost     = print_hours * s.nozzle_wear_rate;
  const adhesiveCost   = s.build_plate_adhesive_cost / batchDiv;
  const cleaningCost   = s.cleaning_supplies_cost / batchDiv;
  const consumablesCost = nozzleCost + adhesiveCost + cleaningCost;

  // 5. Subtotal + failure buffer
  const subtotal   = materialCost + electricityCost + laborCost + consumablesCost;
  const failureAdd = subtotal * (s.failure_rate / 100);
  const totalCost  = subtotal + failureAdd;

  // 6. Cost per piece
  const netCostPerPiece = totalCost / quantity;

  // 7. Pricing
  const rawPrice     = netCostPerPiece * (1 + s.markup / 100);
  const rounded      = Math.ceil(rawPrice / s.price_rounding) * s.price_rounding;
  const finalPricePerPiece = Math.max(rounded, s.minimum_price);

  // 8. Totals & profit
  const totalPrice  = finalPricePerPiece * quantity;
  const totalProfit = (finalPricePerPiece - netCostPerPiece) * quantity;
  const profitMargin = (totalProfit / totalPrice) * 100;

  return {
    rawMaterialCost,
    supportAddon,
    materialCost,
    startupCost,
    printCost,
    electricityCost,
    setupLaborCost,
    postProcessingLaborCost,
    designLaborCost,
    laborCost,
    nozzleCost,
    adhesiveCost,
    cleaningCost,
    consumablesCost,
    subtotal,
    failureAdd,
    totalCost,
    netCostPerPiece,
    rawPrice,
    rounded,
    finalPricePerPiece,
    totalPrice,
    totalProfit,
    profitMargin,
  };
}

/* ─── Currency formatter ─────────────────────────────────────────── */

function useCurrencyFmt(currency) {
  return useCallback((n) => {
    if (typeof n !== 'number' || isNaN(n)) return '—';
    const v = n.toFixed(2);
    return currency === 'BDT' ? `৳${parseFloat(v).toLocaleString('en-IN')}` : `$${v}`;
  }, [currency]);
}

/* ─── Small UI atoms ─────────────────────────────────────────────── */

function Label({ children, tip }) {
  return (
    <span
      className="font-technical text-[10px] text-stone-500 uppercase tracking-widest flex items-center gap-1"
      title={tip}
    >
      {children}
      {tip && (
        <span className="material-symbols-outlined text-stone-700 cursor-help" style={{ fontSize: 12 }}>
          info
        </span>
      )}
    </span>
  );
}

function NumInput({ value, onChange, min = 0, step = 1, placeholder, disabled }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-[#0a0a0a] border border-white/10 text-white font-mono text-sm px-3 py-2
                 focus:outline-none focus:border-[#ff5500]/60 transition-colors
                 disabled:opacity-40 placeholder-stone-700"
      style={{ fontFamily: "'Space Mono', monospace" }}
    />
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2
                 focus:outline-none focus:border-[#ff5500]/60 transition-colors placeholder-stone-700"
    />
  );
}

function SectionHeader({ children }) {
  return (
    <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#111111] border border-white/10 p-5 ${className}`}>
      {children}
    </div>
  );
}

function BreakdownRow({ label, value, indent = 0, highlight, fmt }) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${
        indent > 0 ? 'pl-4 border-l border-white/5' : ''
      }`}
    >
      <span className={`font-technical text-[10px] uppercase tracking-widest ${
        indent > 0 ? 'text-stone-600' : 'text-stone-400'
      }`}>
        {label}
      </span>
      <span
        className={`font-mono text-xs ${
          highlight ? 'text-[#ff5500] font-bold' : indent > 0 ? 'text-stone-500' : 'text-stone-300'
        }`}
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        {fmt(value)}
      </span>
    </div>
  );
}

/* ─── Material Library Panel ────────────────────────────────────── */

function MaterialLibrary({ materials, setMaterials, currency }) {
  const [editing, setEditing] = useState(null); // null | id | 'new'
  const [form, setForm] = useState({ material: '', price_per_kg: '' });
  const [deleteId, setDeleteId] = useState(null);
  const fmt = useCurrencyFmt(currency);

  const startEdit = (mat) => {
    setEditing(mat.id);
    setForm({ material: mat.material, price_per_kg: mat.price_per_kg });
  };

  const startNew = () => {
    setEditing('new');
    setForm({ material: '', price_per_kg: '' });
  };

  const cancel = () => { setEditing(null); setForm({ material: '', price_per_kg: '' }); };

  const saveEdit = () => {
    if (!form.material.trim() || !form.price_per_kg) return;
    if (editing === 'new') {
      const newMat = {
        id: Date.now(),
        material: form.material.trim(),
        price_per_kg: parseFloat(form.price_per_kg),
      };
      const updated = [...materials, newMat];
      setMaterials(updated);
      save('calc_materials', updated);
    } else {
      const updated = materials.map((m) =>
        m.id === editing
          ? { ...m, material: form.material.trim(), price_per_kg: parseFloat(form.price_per_kg) }
          : m
      );
      setMaterials(updated);
      save('calc_materials', updated);
    }
    cancel();
  };

  const confirmDelete = (id) => setDeleteId(id);

  const doDelete = () => {
    const updated = materials.filter((m) => m.id !== deleteId);
    setMaterials(updated);
    save('calc_materials', updated);
    setDeleteId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeader>Material Library</SectionHeader>
        <button
          onClick={startNew}
          className="flex items-center gap-1.5 font-technical text-[10px] uppercase tracking-widest
                     text-[#ff5500] hover:text-white transition-colors border border-[#ff5500]/30
                     hover:border-[#ff5500] px-2 py-1"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>add</span>
          Add Material
        </button>
      </div>

      <Card className="!p-0 overflow-hidden">
        {materials.map((mat, idx) => (
          <div
            key={mat.id}
            className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-b-0
                        ${idx % 2 === 0 ? '' : 'bg-[#161616]/40'}`}
          >
            {editing === mat.id ? (
              <div className="flex-1 flex gap-2">
                <TextInput
                  value={form.material}
                  onChange={(v) => setForm((f) => ({ ...f, material: v }))}
                  placeholder="Material name"
                />
                <NumInput
                  value={form.price_per_kg}
                  onChange={(v) => setForm((f) => ({ ...f, price_per_kg: v }))}
                  min={0}
                  step={10}
                  placeholder="Price/kg"
                />
                <button onClick={saveEdit} className="text-green-400 hover:text-green-300 transition-colors px-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                </button>
                <button onClick={cancel} className="text-stone-500 hover:text-white transition-colors px-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-white text-sm font-body">{mat.material}</p>
                  <p className="font-mono text-[11px] text-stone-500" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {fmt(mat.price_per_kg)}/kg
                  </p>
                </div>
                <button
                  onClick={() => startEdit(mat)}
                  className="text-stone-600 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
                </button>
                <button
                  onClick={() => confirmDelete(mat.id)}
                  className="text-stone-600 hover:text-red-400 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                </button>
              </>
            )}
          </div>
        ))}

        {editing === 'new' && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[#ff5500]/20 bg-[#ff5500]/5">
            <TextInput
              value={form.material}
              onChange={(v) => setForm((f) => ({ ...f, material: v }))}
              placeholder="Material name"
            />
            <NumInput
              value={form.price_per_kg}
              onChange={(v) => setForm((f) => ({ ...f, price_per_kg: v }))}
              min={0}
              step={10}
              placeholder="Price/kg"
            />
            <button onClick={saveEdit} className="text-green-400 hover:text-green-300 transition-colors px-1">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
            </button>
            <button onClick={cancel} className="text-stone-500 hover:text-white transition-colors px-1">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>
        )}
      </Card>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#111111] border border-white/10 p-6 w-80 space-y-4">
            <p className="font-technical text-xs text-white uppercase tracking-widest">Delete material?</p>
            <p className="text-stone-400 text-sm">
              This will remove <strong className="text-white">
                {materials.find((m) => m.id === deleteId)?.material}
              </strong> from the library.
            </p>
            <div className="flex gap-3">
              <button
                onClick={doDelete}
                className="flex-1 py-2 bg-red-600/20 border border-red-600/40 text-red-400
                           font-technical text-xs uppercase tracking-widest hover:bg-red-600/30 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 bg-white/5 border border-white/10 text-stone-400
                           font-technical text-xs uppercase tracking-widest hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Settings Panel ─────────────────────────────────────────────── */

function SettingsPanel({ settings, setSettings }) {
  const update = (key, val) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    save('calc_settings', next);
  };

  const fields = [
    { key: 'currency',                  label: 'Currency',               tip: 'BDT or USD', isSelect: true, options: ['BDT', 'USD'] },
    { key: 'electricity_rate',          label: 'Electricity Rate ($/kWh)', tip: 'Cost of electricity per kilowatt-hour', step: 0.01, min: 0 },
    { key: 'support_material_factor',   label: 'Support Material (%)',     tip: 'Extra material used for supports', step: 1, min: 0 },
    { key: 'startup_spike_watts',       label: 'Startup Spike (W)',        tip: 'Wattage during printer startup', step: 10, min: 0 },
    { key: 'startup_duration_mins',     label: 'Startup Duration (min)',   tip: 'How long the startup spike lasts', step: 1, min: 0 },
    { key: 'printing_power_watts',      label: 'Printing Power (W)',       tip: 'Typical wattage during printing', step: 10, min: 0 },
    { key: 'setup_labor_rate',          label: 'Setup Labor ($/hr)',       tip: 'Hourly rate for printer setup', step: 0.5, min: 0 },
    { key: 'post_processing_labor_rate',label: 'Post-Processing Labor ($/hr)', tip: 'Hourly rate for post-processing', step: 0.5, min: 0 },
    { key: 'design_labor_rate',         label: 'Design Labor ($/hr)',      tip: 'Hourly rate for CAD/design work', step: 0.5, min: 0 },
    { key: 'nozzle_wear_rate',          label: 'Nozzle Wear ($/hr)',       tip: '$2 nozzle lasting ~40 hours = $0.05/hr', step: 0.01, min: 0 },
    { key: 'build_plate_adhesive_cost', label: 'Adhesive Cost ($/print)',  tip: 'Glue stick, hairspray, etc.', step: 0.05, min: 0 },
    { key: 'cleaning_supplies_cost',    label: 'Cleaning Supplies ($/print)', tip: 'IPA, paper towels, etc.', step: 0.05, min: 0 },
    { key: 'failure_rate',              label: 'Failure Buffer (%)',        tip: 'Buffer for failed prints', step: 1, min: 0 },
    { key: 'markup',                    label: 'Markup (%)',               tip: 'Profit markup on top of cost', step: 5, min: 0 },
    { key: 'price_rounding',            label: 'Price Rounding ($)',       tip: 'Round final price to nearest X', step: 1, min: 1 },
    { key: 'minimum_price',             label: 'Minimum Price ($)',        tip: 'Floor price per piece', step: 1, min: 0 },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label tip={f.tip}>{f.label}</Label>
            {f.isSelect ? (
              <select
                value={settings[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2
                           focus:outline-none focus:border-[#ff5500]/60 transition-colors"
              >
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <NumInput
                value={settings[f.key]}
                onChange={(v) => update(f.key, v)}
                min={f.min}
                step={f.step}
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          setSettings(DEFAULT_SETTINGS);
          save('calc_settings', DEFAULT_SETTINGS);
        }}
        className="font-technical text-[10px] uppercase tracking-widest text-stone-600
                   hover:text-red-400 transition-colors flex items-center gap-1"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>restart_alt</span>
        Reset to Defaults
      </button>
    </div>
  );
}

/* ─── Presets Panel ──────────────────────────────────────────────── */

function PresetsPanel({ presets, setPresets, onLoad, materials }) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  const deletePreset = (id) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    save('calc_presets', updated);
  };

  const savePreset = (currentState) => {
    if (!name.trim()) return;
    const preset = { ...currentState, id: Date.now(), name: name.trim() };
    const updated = [...presets, preset];
    setPresets(updated);
    save('calc_presets', updated);
    setName('');
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeader>Quick Presets</SectionHeader>
        <button
          onClick={() => setSaving((v) => !v)}
          className="flex items-center gap-1.5 font-technical text-[10px] uppercase tracking-widest
                     text-[#ff5500] hover:text-white transition-colors border border-[#ff5500]/30
                     hover:border-[#ff5500] px-2 py-1"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>bookmark_add</span>
          Save Current
        </button>
      </div>

      {saving && (
        <div className="flex gap-2 mb-3">
          <TextInput value={name} onChange={setName} placeholder="Preset name…" />
          <button
            onClick={() => onLoad('save', savePreset)}
            className="px-3 py-2 bg-[#ff5500]/10 border border-[#ff5500]/40 text-[#ff5500]
                       font-technical text-xs uppercase tracking-widest hover:bg-[#ff5500]/20 transition-colors whitespace-nowrap"
          >
            Save
          </button>
          <button
            onClick={() => { setSaving(false); setName(''); }}
            className="px-2 py-2 border border-white/10 text-stone-500 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
          </button>
        </div>
      )}

      <div className="space-y-2">
        {presets.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 px-4 py-3 bg-[#111111] border border-white/10
                       hover:border-white/20 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-body truncate">{p.name}</p>
              <p className="font-technical text-[10px] text-stone-600 uppercase tracking-widest">
                {p.materials?.map((sm) => {
                  const mat = materials.find((m) => m.id === sm.materialId);
                  return mat ? `${mat.material} ${sm.weight_g}g` : '';
                }).filter(Boolean).join(', ')} · {p.print_hours}h
              </p>
            </div>
            <button
              onClick={() => onLoad('load', p)}
              className="font-technical text-[10px] uppercase tracking-widest text-stone-400
                         hover:text-[#ff5500] transition-colors"
            >
              Load
            </button>
            <button
              onClick={() => deletePreset(p.id)}
              className="text-stone-600 hover:text-red-400 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
            </button>
          </div>
        ))}
        {presets.length === 0 && (
          <p className="font-technical text-[10px] text-stone-700 uppercase tracking-widest py-4 text-center">
            No presets saved yet
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Breakdown Display ──────────────────────────────────────────── */

function CostBreakdown({ result, inputs, settings }) {
  const fmt = useCurrencyFmt(settings.currency);
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="material-symbols-outlined text-stone-800 mb-3" style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>
          calculate
        </span>
        <p className="font-technical text-[10px] text-stone-700 uppercase tracking-widest">
          Fill in the inputs to see your cost breakdown
        </p>
      </div>
    );
  }

  const profitColor = result.profitMargin >= 30 ? 'text-green-400'
    : result.profitMargin >= 15 ? 'text-yellow-400'
    : 'text-red-400';

  return (
    <div className="space-y-1">
      {/* Material */}
      <div className="pb-1 mb-1 border-b border-white/5">
        <BreakdownRow label="Material Cost" value={result.materialCost} fmt={fmt} />
        <BreakdownRow label={`Raw Material`} value={result.rawMaterialCost} fmt={fmt} indent={1} />
        <BreakdownRow label={`Support Factor (${settings.support_material_factor}%)`} value={result.supportAddon} fmt={fmt} indent={1} />
      </div>

      {/* Electricity */}
      <div className="pb-1 mb-1 border-b border-white/5">
        <BreakdownRow label="Electricity Cost" value={result.electricityCost} fmt={fmt} />
        <BreakdownRow label="Startup" value={result.startupCost} fmt={fmt} indent={1} />
        <BreakdownRow label="Printing" value={result.printCost} fmt={fmt} indent={1} />
      </div>

      {/* Labor */}
      <div className="pb-1 mb-1 border-b border-white/5">
        <BreakdownRow label="Labor Cost" value={result.laborCost} fmt={fmt} />
        <BreakdownRow label="Setup" value={result.setupLaborCost} fmt={fmt} indent={1} />
        <BreakdownRow label="Post-Processing" value={result.postProcessingLaborCost} fmt={fmt} indent={1} />
        <BreakdownRow label="Design / CAD" value={result.designLaborCost} fmt={fmt} indent={1} />
      </div>

      {/* Consumables */}
      <div className="pb-1 mb-1 border-b border-white/5">
        <BreakdownRow label="Consumables" value={result.consumablesCost} fmt={fmt} />
        <BreakdownRow label="Nozzle Wear" value={result.nozzleCost} fmt={fmt} indent={1} />
        <BreakdownRow label="Adhesive" value={result.adhesiveCost} fmt={fmt} indent={1} />
        <BreakdownRow label="Cleaning" value={result.cleaningCost} fmt={fmt} indent={1} />
      </div>

      {/* Subtotal */}
      <div className="pb-1 mb-1 border-b border-white/5">
        <BreakdownRow label="Subtotal" value={result.subtotal} fmt={fmt} />
        <BreakdownRow label={`Failure Buffer (${settings.failure_rate}%)`} value={result.failureAdd} fmt={fmt} indent={1} />
      </div>

      {/* Total cost */}
      <div className="py-2 mb-2 border-b border-[#ff5500]/20">
        <div className="flex items-center justify-between">
          <span className="font-technical text-xs text-[#ff5500] uppercase tracking-widest font-bold">Total Cost</span>
          <span className="font-mono text-sm text-[#ff5500] font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>
            {fmt(result.totalCost)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="font-technical text-[10px] text-stone-500 uppercase tracking-widest">
            Cost / piece (qty {inputs.quantity})
          </span>
          <span className="font-mono text-xs text-stone-300" style={{ fontFamily: "'Space Mono', monospace" }}>
            {fmt(result.netCostPerPiece)}
          </span>
        </div>
      </div>

      {/* Pricing */}
      <div className="pb-1 mb-1 border-b border-white/5">
        <div className="flex items-center justify-between py-1">
          <span className="font-technical text-[10px] text-stone-400 uppercase tracking-widest">Pricing</span>
        </div>
        <BreakdownRow label={`Base Price (+${settings.markup}% markup)`} value={result.rawPrice} fmt={fmt} indent={1} />
        <BreakdownRow label={`Rounded (nearest ${fmt(settings.price_rounding)})`} value={result.rounded} fmt={fmt} indent={1} />
        <div className="flex items-center justify-between py-1.5 pl-4 border-l border-[#ff5500]/20">
          <span className="font-technical text-[10px] text-white uppercase tracking-widest">Final Price / Piece</span>
          <span className="font-mono text-sm text-white font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>
            {fmt(result.finalPricePerPiece)}
          </span>
        </div>
      </div>

      {/* Totals */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-technical text-[10px] text-stone-400 uppercase tracking-widest">
            Total Price (×{inputs.quantity})
          </span>
          <span className="font-mono text-sm text-white font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>
            {fmt(result.totalPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-technical text-[10px] text-stone-400 uppercase tracking-widest">Total Profit</span>
          <span className="font-mono text-xs text-green-400" style={{ fontFamily: "'Space Mono', monospace" }}>
            {fmt(result.totalProfit)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-technical text-[10px] text-stone-400 uppercase tracking-widest">Profit Margin</span>
          <span className={`font-mono text-sm font-bold ${profitColor}`} style={{ fontFamily: "'Space Mono', monospace" }}>
            {result.profitMargin.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */

export default function CostCalculator() {
  const [materials,      setMaterials]      = useState(() => load('calc_materials', DEFAULT_MATERIALS));
  const [settings,       setSettings]       = useState(() => load('calc_settings',  DEFAULT_SETTINGS));
  const [presets,        setPresets]        = useState(() => load('calc_presets',   DEFAULT_PRESETS));
  const [inputs,         setInputs]         = useState(DEFAULT_INPUTS);
  const [selectedMats,   setSelectedMats]   = useState([{ materialId: 1, weight_g: 50 }]);
  const [showSettings,   setShowSettings]   = useState(false);
  const [activeTab,      setActiveTab]      = useState('calculator'); // 'calculator' | 'library' | 'presets'

  const fmt = useCurrencyFmt(settings.currency);

  const result = calculate(inputs, selectedMats, materials, settings);

  /* ── Input helpers ─────────────────────────────────────────────── */
  const updateInput = (key, val) => setInputs((prev) => ({ ...prev, [key]: val }));

  const addMaterial = () =>
    setSelectedMats((prev) => [...prev, { materialId: materials[0]?.id ?? 1, weight_g: 0 }]);

  const removeMaterial = (idx) =>
    setSelectedMats((prev) => prev.filter((_, i) => i !== idx));

  const updateMaterial = (idx, key, val) =>
    setSelectedMats((prev) => prev.map((m, i) => i === idx ? { ...m, [key]: val } : m));

  /* ── Preset handler ────────────────────────────────────────────── */
  const handlePreset = (action, payload) => {
    if (action === 'load') {
      setSelectedMats(payload.materials ?? [{ materialId: materials[0]?.id, weight_g: 50 }]);
      setInputs((prev) => ({
        ...prev,
        print_hours:          payload.print_hours          ?? prev.print_hours,
        setup_time_mins:      payload.setup_time_mins      ?? prev.setup_time_mins,
        post_processing_mins: payload.post_processing_mins ?? prev.post_processing_mins,
        cad_design_mins:      payload.cad_design_mins      ?? prev.cad_design_mins,
      }));
    } else if (action === 'save') {
      // payload is the savePreset fn from PresetsPanel
      payload({
        materials: selectedMats,
        print_hours:          inputs.print_hours,
        setup_time_mins:      inputs.setup_time_mins,
        post_processing_mins: inputs.post_processing_mins,
        cad_design_mins:      inputs.cad_design_mins,
      });
    }
  };

  const tabs = [
    { key: 'calculator', label: 'Calculator',       icon: 'calculate' },
    { key: 'library',    label: 'Material Library', icon: 'inventory_2' },
    { key: 'presets',    label: 'Presets',          icon: 'bookmark' },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <AdminNavbar />

      <div className="px-6 py-8 max-w-screen-2xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="uppercase tracking-tight text-white"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', lineHeight: 1 }}
            >
              Cost Calculator
            </h1>
            <p className="font-technical text-xs text-stone-500 uppercase tracking-widest mt-1">
              Pricing & profitability tool
            </p>
          </div>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 border font-technical text-xs uppercase tracking-widest transition-colors ${
              showSettings
                ? 'bg-[#ff5500]/10 border-[#ff5500]/40 text-[#ff5500]'
                : 'bg-[#111111] border-white/10 text-stone-400 hover:text-white hover:border-white/20'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>tune</span>
            Settings
          </button>
        </div>

        {/* ── Settings panel (collapsible) ────────────────────────── */}
        {showSettings && (
          <div className="bg-[#111111] border border-white/10 p-5">
            <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-4">
              Calculator Settings
            </p>
            <SettingsPanel settings={settings} setSettings={setSettings} />
          </div>
        )}

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-white/10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 font-technical text-xs uppercase tracking-widest
                          transition-colors border-b-2 -mb-px ${
                            activeTab === t.key
                              ? 'border-[#ff5500] text-[#ff5500]'
                              : 'border-transparent text-stone-500 hover:text-stone-300'
                          }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Calculator Tab ─────────────────────────────────────── */}
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Inputs — left column (3/5) */}
            <div className="lg:col-span-3 space-y-5">

              {/* Materials */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader>Materials</SectionHeader>
                  <button
                    onClick={addMaterial}
                    className="flex items-center gap-1 font-technical text-[10px] uppercase tracking-widest
                               text-[#ff5500] hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add</span>
                    Add Material
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedMats.map((sm, idx) => (
                    <div key={idx} className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1.5">
                        <Label>Material</Label>
                        <select
                          value={sm.materialId}
                          onChange={(e) => updateMaterial(idx, 'materialId', parseInt(e.target.value))}
                          className="w-full bg-[#0a0a0a] border border-white/10 text-white text-sm px-3 py-2
                                     focus:outline-none focus:border-[#ff5500]/60 transition-colors"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>{m.material} — {fmt(m.price_per_kg)}/kg</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32 space-y-1.5">
                        <Label tip="Weight used in grams">Weight (g)</Label>
                        <NumInput
                          value={sm.weight_g}
                          onChange={(v) => updateMaterial(idx, 'weight_g', v)}
                          min={0}
                          step={1}
                        />
                      </div>
                      {selectedMats.length > 1 && (
                        <button
                          onClick={() => removeMaterial(idx)}
                          className="pb-2 text-stone-600 hover:text-red-400 transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>remove_circle</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Print details */}
              <Card>
                <SectionHeader>Print Details</SectionHeader>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label tip="Total print time in hours (e.g. 3.5)">Print Hours</Label>
                    <NumInput value={inputs.print_hours} onChange={(v) => updateInput('print_hours', v)} min={0} step={0.5} />
                  </div>
                  <div className="space-y-1.5">
                    <Label tip="Number of pieces to produce">Quantity</Label>
                    <NumInput value={inputs.quantity} onChange={(v) => updateInput('quantity', Math.max(1, Math.round(v)))} min={1} step={1} />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label tip="When enabled, setup & consumables are split across all pieces">Batch Mode</Label>
                    <label className="flex items-center gap-3 h-[38px] cursor-pointer">
                      <div
                        onClick={() => updateInput('is_batch', !inputs.is_batch)}
                        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                          inputs.is_batch ? 'bg-[#ff5500]' : 'bg-stone-700'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          inputs.is_batch ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </div>
                      <span className="font-technical text-[10px] text-stone-400 uppercase tracking-widest">
                        {inputs.is_batch ? 'Batch' : 'Per Piece'}
                      </span>
                    </label>
                  </div>
                </div>
              </Card>

              {/* Labor */}
              <Card>
                <SectionHeader>Labor Time</SectionHeader>
                <p className="font-technical text-[10px] text-stone-700 uppercase tracking-widest mb-3">
                  Print time is not counted — machine runs unattended
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label tip="Time spent preparing the printer, slicing, and loading">Setup Time (min)</Label>
                    <NumInput value={inputs.setup_time_mins} onChange={(v) => updateInput('setup_time_mins', v)} min={0} step={5} />
                  </div>
                  <div className="space-y-1.5">
                    <Label tip="Time for removing supports, sanding, painting">Post-Processing (min)</Label>
                    <NumInput value={inputs.post_processing_mins} onChange={(v) => updateInput('post_processing_mins', v)} min={0} step={5} />
                  </div>
                  <div className="space-y-1.5">
                    <Label tip="Time spent on CAD design/modeling (if billable)">CAD / Design (min)</Label>
                    <NumInput value={inputs.cad_design_mins} onChange={(v) => updateInput('cad_design_mins', v)} min={0} step={5} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Output — right column (2/5) */}
            <div className="lg:col-span-2">
              <div className="sticky top-24">
                <SectionHeader>Cost Breakdown</SectionHeader>
                <Card>
                  <CostBreakdown result={result} inputs={inputs} settings={settings} />
                </Card>

                {/* Quick stat pills */}
                {result && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-[#111111] border border-white/10 p-3 text-center">
                      <p className="font-technical text-[9px] text-stone-600 uppercase tracking-widest mb-1">Final Price</p>
                      <p className="font-mono font-bold text-[#ff5500]" style={{ fontFamily: "'Space Mono', monospace" }}>
                        {fmt(result.finalPricePerPiece)}
                      </p>
                      <p className="font-technical text-[9px] text-stone-700 uppercase tracking-widest">per piece</p>
                    </div>
                    <div className="bg-[#111111] border border-white/10 p-3 text-center">
                      <p className="font-technical text-[9px] text-stone-600 uppercase tracking-widest mb-1">Margin</p>
                      <p
                        className={`font-mono font-bold ${
                          result.profitMargin >= 30 ? 'text-green-400'
                          : result.profitMargin >= 15 ? 'text-yellow-400'
                          : 'text-red-400'
                        }`}
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {result.profitMargin.toFixed(1)}%
                      </p>
                      <p className="font-technical text-[9px] text-stone-700 uppercase tracking-widest">profit</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Library Tab ────────────────────────────────────────── */}
        {activeTab === 'library' && (
          <div className="max-w-xl">
            <MaterialLibrary
              materials={materials}
              setMaterials={setMaterials}
              currency={settings.currency}
            />
          </div>
        )}

        {/* ── Presets Tab ────────────────────────────────────────── */}
        {activeTab === 'presets' && (
          <div className="max-w-xl">
            <PresetsPanel
              presets={presets}
              setPresets={setPresets}
              onLoad={handlePreset}
              materials={materials}
            />
          </div>
        )}

      </div>
    </div>
  );
}
