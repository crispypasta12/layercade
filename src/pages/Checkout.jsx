import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';

const DELIVERY_FEE = 60;

const DISTRICTS = [
  'Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet',
  'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj', 'Comilla',
  "Cox's Bazar", 'Jessore', 'Tangail', 'Bogra', 'Dinajpur', 'Pabna',
  'Faridpur', 'Kushtia', 'Rangamati',
];

const INITIAL_FORM = {
  fullName: '',
  phone:    '',
  address:  '',
  area:     '',
  district: '',
  notes:    '',
};

/* ─── Field wrapper ──────────────────────────────────────────── */

function Field({ label, required, error, hint, children }) {
  return (
    <div className="space-y-2">
      <label className="font-technical text-xs text-stone-400 uppercase tracking-widest block">
        {label}
        {required && <span className="text-[#ff5500] ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="font-technical text-[10px] text-stone-600">{hint}</p>
      )}
      {error && (
        <p className="font-technical text-[10px] text-red-500 uppercase tracking-widest">
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export default function Checkout() {
  const navigate = useNavigate();
  const { items } = useCartStore();

  /* Redirect to home if cart is empty */
  useEffect(() => {
    if (items.length === 0) {
      navigate('/', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal   = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const grandTotal = subtotal + DELIVERY_FEE;

  const [form,        setForm]        = useState(INITIAL_FORM);
  const [errors,      setErrors]      = useState({});
  const [loading,     setLoading]     = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) {
      e.fullName = 'Name is required';
    }
    const cleanPhone = form.phone.replace(/[\s-]/g, '');
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      e.phone = 'Enter a valid BD number (e.g. 01712345678)';
    }
    if (!form.address.trim()) {
      e.address = 'Delivery address is required';
    }
    if (!form.area.trim()) {
      e.area = 'Area / Thana is required';
    }
    if (!form.district) {
      e.district = 'Please select a district';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setLoading(true);

    const cleanPhone = form.phone.replace(/[\s-]/g, '');

    const { data, error } = await supabase
      .from('orders')
      .insert([{
        customer_name:  form.fullName.trim(),
        phone:          cleanPhone,
        address:        form.address.trim(),
        area:           form.area.trim(),
        district:       form.district,
        items:          items,
        total_amount:   grandTotal,
        delivery_fee:   DELIVERY_FEE,
        payment_method: 'cod',
        notes:          form.notes.trim() || null,
      }])
      .select()
      .single();

    setLoading(false);

    if (error) {
      setSubmitError(
        'Something went wrong placing your order. Please check your connection and try again.'
      );
      return;
    }

    navigate('/order-confirmation', {
      state: {
        orderId:      data.id,
        customerName: data.customer_name,
        totalAmount:  data.total_amount,
      },
    });
  };

  const inputClass =
    'w-full bg-[#111111] border-b border-stone-800 text-white p-3 ' +
    'focus:outline-none focus:border-[#ff5500] transition-colors ' +
    'placeholder:text-stone-700 font-body disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <main className="pt-44 pb-20 px-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-16">
        <span className="font-technical text-[#ff5500] text-lg">Checkout</span>
        <h1 className="font-headline text-6xl md:text-8xl tracking-tight text-white mt-1">
          COMPLETE YOUR ORDER
        </h1>
        <div className="signature-divider w-full mt-4" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

        {/* ── Left — Order Summary ──────────────────────────────── */}
        <motion.section
          className="space-y-6"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-headline text-3xl text-white">ORDER SUMMARY</h2>

          {/* Cart items */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex gap-4 bg-[#161616] p-4 border border-white/5"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 bg-stone-900 flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span
                        className="material-symbols-outlined text-stone-600"
                        style={{ fontSize: 24 }}
                      >
                        image
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-body font-medium text-sm leading-tight line-clamp-2">
                    {item.name}
                  </p>
                  <p className="font-technical text-stone-500 text-xs mt-1">
                    Qty: {item.quantity}
                  </p>
                  <p className="font-technical text-stone-600 text-xs mt-0.5">
                    {item.price.toLocaleString('en-IN')}৳ each
                  </p>
                </div>

                {/* Line total */}
                <div className="flex-shrink-0 text-right">
                  <span className="font-headline text-xl text-[#ff5500]">
                    {(item.price * item.quantity).toLocaleString('en-IN')}৳
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Price breakdown */}
          <div className="bg-[#161616] border border-white/5 p-6 space-y-3">
            <div className="flex justify-between font-body text-stone-400 text-sm">
              <span>Subtotal</span>
              <span>{subtotal.toLocaleString('en-IN')}৳</span>
            </div>
            <div className="flex justify-between font-body text-stone-400 text-sm">
              <span>Delivery Fee</span>
              <span className="font-technical">{DELIVERY_FEE}৳</span>
            </div>
            <div className="signature-divider opacity-30" />
            <div className="flex justify-between items-baseline">
              <span className="font-headline text-2xl text-white">TOTAL</span>
              <span className="font-headline text-3xl text-[#ff5500]">
                {grandTotal.toLocaleString('en-IN')}৳
              </span>
            </div>
          </div>

          {/* Payment method */}
          <div className="flex items-center gap-4 bg-[#161616] border border-white/5 p-4">
            <span
              className="material-symbols-outlined text-[#ff5500]"
              style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}
            >
              payments
            </span>
            <div>
              <p className="font-technical text-[10px] text-stone-500 uppercase tracking-widest mb-0.5">
                Payment Method
              </p>
              <p className="text-white font-body font-medium">Cash on Delivery</p>
            </div>
          </div>

          {/* Delivery note */}
          <div className="flex items-start gap-3 px-1">
            <span
              className="material-symbols-outlined text-stone-600 mt-0.5 flex-shrink-0"
              style={{ fontSize: 16 }}
            >
              info
            </span>
            <p className="font-technical text-[10px] text-stone-600 uppercase tracking-wide leading-relaxed">
              Inside Dhaka: flat ৳60. Outside Dhaka: ৳120 (adjusted at delivery).
              We'll call before delivery to confirm.
            </p>
          </div>
        </motion.section>

        {/* ── Right — Customer Form ─────────────────────────────── */}
        <motion.section
          className="bg-[#161616] p-8 md:p-12 border-l-4 border-[#ff5500]"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h2 className="font-headline text-3xl text-white mb-8">DELIVERY DETAILS</h2>

          {/* Submit error banner */}
          {submitError && (
            <div className="mb-6 bg-red-950/40 border border-red-800/60 p-4 flex items-start gap-3">
              <span
                className="material-symbols-outlined text-red-500 flex-shrink-0 mt-0.5"
                style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
              >
                error
              </span>
              <p className="font-body text-red-400 text-sm leading-relaxed">{submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <Field label="Full Name" required error={errors.fullName}>
              <input
                type="text"
                value={form.fullName}
                onChange={setField('fullName')}
                placeholder="Your full name"
                disabled={loading}
                className={inputClass}
              />
            </Field>

            <Field
              label="Phone Number"
              required
              error={errors.phone}
              hint="Bangladesh number — 11 digits starting with 01"
            >
              <input
                type="tel"
                value={form.phone}
                onChange={setField('phone')}
                placeholder="01712345678"
                disabled={loading}
                className={inputClass}
              />
            </Field>

            <Field label="Delivery Address" required error={errors.address}>
              <textarea
                value={form.address}
                onChange={setField('address')}
                placeholder="House / Flat no., Road, Area..."
                rows={3}
                disabled={loading}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field label="Area / Thana" required error={errors.area}>
                <input
                  type="text"
                  value={form.area}
                  onChange={setField('area')}
                  placeholder="e.g. Gulshan"
                  disabled={loading}
                  className={inputClass}
                />
              </Field>

              <Field label="District" required error={errors.district}>
                <select
                  value={form.district}
                  onChange={setField('district')}
                  disabled={loading}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="" className="bg-[#161616]">Select district</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d} className="bg-[#161616]">{d}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Order Notes (optional)">
              <textarea
                value={form.notes}
                onChange={setField('notes')}
                placeholder="Special instructions, preferred delivery time..."
                rows={3}
                disabled={loading}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="w-full bg-[#ff5500] text-white font-headline text-2xl py-5
                         clip-parallelogram hover:shadow-[0_0_20px_rgba(255,85,0,0.3)]
                         transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
                         flex items-center justify-center gap-3 min-h-[64px]"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  PLACING ORDER...
                </>
              ) : (
                'PLACE ORDER →'
              )}
            </button>

            <p className="font-technical text-[10px] text-stone-600 text-center uppercase tracking-widest leading-relaxed">
              Cash on delivery — pay when your order arrives.
              We'll call to confirm before shipping.
            </p>
          </form>
        </motion.section>
      </div>
    </main>
  );
}
