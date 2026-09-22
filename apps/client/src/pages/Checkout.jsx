import React, { useState, useEffect, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, Truck, Wallet, CreditCard, MapPin } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { img } from "../data/products";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatBDT, getOriginalPrice, hasActiveOffer } from "../lib/money";

const PAYMENT_METHODS = [
  { id: "cod", name: "Cash on Delivery", desc: "Pay in cash when your order arrives.", icon: Truck },
  { id: "bkash", name: "bKash", desc: "Send Money to the studio number shown below, then enter the Transaction ID.", icon: Wallet },
  { id: "nagad", name: "Nagad", desc: "Send Money to the studio number shown below, then enter the Transaction ID.", icon: Wallet },
  { id: "card", name: "Credit / Debit Card", desc: "Secure card gateway coming soon. No card details are collected yet.", icon: CreditCard, comingSoon: true },
];

const DELIVERY_ZONES = [
  { id: "inside_dhaka", label: "Inside Dhaka", description: "Dhaka City delivery" },
  { id: "outside_dhaka", label: "Outside Dhaka", description: "Delivery anywhere else in Bangladesh" },
];

export default function Checkout() {
  const { dark, cart, subtotal, user, checkout } = useStore();

  const [form, setForm] = useState({
    fullName: user?.name || "",
    phone: user?.phone || "",
    line1: user?.address?.line1 || "",
    line2: user?.address?.line2 || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    zip: user?.address?.zip || "",
    country: user?.address?.country || "Bangladesh",
    deliveryZone: user?.address?.deliveryZone || "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentRef, setPaymentRef] = useState("");
  const [payerName, setPayerName] = useState(user?.name || "");
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [membership, setMembership] = useState(null);
  const [useCoins, setUseCoins] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!paymentSettings) api.getPaymentSettings().then(setPaymentSettings).catch(() => setPaymentSettings(null));
    if (user) api.myMembership().then(setMembership).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (synced || !user) return;
    if (user.name || user.phone || user.address) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || user.name || "",
        phone: f.phone || user.phone || "",
        line1: f.line1 || user.address?.line1 || "",
        line2: f.line2 || user.address?.line2 || "",
        city: f.city || user.address?.city || "",
        state: f.state || user.address?.state || "",
        zip: f.zip || user.address?.zip || "",
        country: user.address?.country || f.country,
        deliveryZone: user.address?.deliveryZone || f.deliveryZone || "",
      }));
      setSynced(true);
    }
  }, [user, synced]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const deliveryCharge = useMemo(() => {
    if (!paymentSettings || !form.deliveryZone) return 0;
    if (paymentSettings.freeDeliveryActive) return 0;
    return form.deliveryZone === "inside_dhaka"
      ? Number(paymentSettings.insideDhakaCharge ?? 75)
      : Number(paymentSettings.outsideDhakaCharge ?? 150);
  }, [paymentSettings, form.deliveryZone]);

  const estimatedTotal = Math.max(0, subtotal + deliveryCharge);

  if (!user) return <Navigate to="/account?next=/checkout" replace />;
  if (cart.length === 0 && !order) return <Navigate to="/shop" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.fullName.trim() || !form.phone.trim() || !form.line1.trim() || !form.city.trim()) {
      setError("Please fill in your name, phone, address and city.");
      return;
    }
    if (!form.deliveryZone) {
      setError("Please select Inside Dhaka or Outside Dhaka for delivery.");
      return;
    }
    if (paymentMethod === "card") {
      setError("Credit / Debit Card checkout is coming soon. Please choose Cash on Delivery, bKash or Nagad for now.");
      return;
    }
    if (paymentMethod !== "cod" && !paymentRef.trim()) {
      setError(`Please enter your ${paymentMethod === "bkash" ? "bKash" : "Nagad"} transaction ID.`);
      return;
    }
    setPlacing(true);
    try {
      const placed = await checkout(
        form,
        paymentMethod,
        paymentRef.trim(),
        { payerName: payerName.trim(), productCodes: cart.map((x) => x.productCode || x.id), useCoins }
      );
      setOrder(placed);
    } catch (e) {
      setError(e.message);
    } finally {
      setPlacing(false);
    }
  };

  if (order) {
    return (
      <PageTransition>
        <main className="px-6 py-24 max-w-lg mx-auto text-center">
          <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-600" />
          <h1 className="font-display italic text-3xl font-bold mb-2">Order placed.</h1>
          <p className="text-sm opacity-60 mb-6">
            Thank you, {form.fullName.split(" ")[0]}. Your order total is{" "}
            <span className="font-mono font-semibold">{formatBDT(order.total)}</span>, to be paid via{" "}
            {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod === "bkash" ? "bKash" : order.paymentMethod === "nagad" ? "Nagad" : "Credit / Debit Card"}.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/account" className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase bg-black text-white">
              View order history
            </Link>
            <Link to="/shop" className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase border border-current/15">
              Keep shopping
            </Link>
          </div>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="px-6 pt-10 pb-24">
        <div className="max-w-4xl mx-auto grid lg:grid-cols-[1fr_360px] gap-10">
          <div>
            <p className="section-kicker">ARTCANVAS / CHECKOUT</p>
            <h1 className="font-display italic text-3xl font-bold mb-6">Shipping & payment</h1>

            {membership?.status === "active" && (
              <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs">
                ArtCanvas Member · reward coins can be used at checkout. Your coin balance is private.
              </div>
            )}

            {paymentSettings?.freeDeliveryActive && (
              <div className="mb-5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-xs flex items-center gap-2">
                <Truck size={15} className="text-emerald-600 shrink-0" />
                <span><strong>Free delivery is active right now.</strong> Your delivery charge is ৳0.</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-6">
              <div>
                <h3 className="text-xs tracking-widest uppercase opacity-50 mb-3">Deliver to</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                    <span className="opacity-60">Full name</span>
                    <input value={form.fullName} onChange={set("fullName")} required className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="opacity-60">Phone</span>
                    <input value={form.phone} onChange={set("phone")} required className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" placeholder="01XXXXXXXXX" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="opacity-60">Country</span>
                    <input value={form.country} onChange={set("country")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                    <span className="opacity-60">Address line 1</span>
                    <input value={form.line1} onChange={set("line1")} required className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" placeholder="House, road, area" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                    <span className="opacity-60">Address line 2 (optional)</span>
                    <input value={form.line2} onChange={set("line2")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="opacity-60">City</span>
                    <input value={form.city} onChange={set("city")} required className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="opacity-60">District / State</span>
                    <input value={form.state} onChange={set("state")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="opacity-60">ZIP / Postal code</span>
                    <input value={form.zip} onChange={set("zip")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} />
                  <h3 className="text-xs tracking-widest uppercase opacity-50">Delivery area</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {DELIVERY_ZONES.map((zone) => {
                    const selected = form.deliveryZone === zone.id;
                    const charge = zone.id === "inside_dhaka"
                      ? Number(paymentSettings?.insideDhakaCharge ?? 75)
                      : Number(paymentSettings?.outsideDhakaCharge ?? 150);
                    return (
                      <label
                        key={zone.id}
                        className={`rounded-xl border p-4 cursor-pointer transition ${selected ? (dark ? "border-[#EDE7D9] bg-white/5" : "border-black bg-black/5") : "border-current/15"}`}
                      >
                        <input
                          type="radio"
                          name="deliveryZone"
                          value={zone.id}
                          checked={selected}
                          onChange={() => setForm((f) => ({ ...f, deliveryZone: zone.id }))}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">{zone.label}</span>
                          <span className={`font-mono text-sm ${paymentSettings?.freeDeliveryActive ? "line-through opacity-40" : ""}`}>{formatBDT(charge)}</span>
                        </div>
                        <p className="text-[10px] opacity-50 mt-1">{zone.description}</p>
                        {paymentSettings?.freeDeliveryActive && <p className="text-[10px] text-emerald-600 font-semibold mt-2">FREE DELIVERY</p>}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xs tracking-widest uppercase opacity-50 mb-3">Payment method</h3>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border transition ${m.comingSoon ? "opacity-55 cursor-not-allowed" : "cursor-pointer"} ${
                          paymentMethod === m.id ? (dark ? "border-[#EDE7D9] bg-white/5" : "border-black bg-black/5") : "border-current/15"
                        }`}
                      >
                        <input type="radio" name="paymentMethod" value={m.id} checked={paymentMethod === m.id} disabled={m.comingSoon || (m.id === "cod" && paymentSettings?.cashOnDelivery === false) || ((m.id === "bkash" || m.id === "nagad") && paymentSettings?.onlinePaymentEnabled === false)} onChange={() => setPaymentMethod(m.id)} className="mt-1" />
                        <Icon size={16} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{m.name} {m.comingSoon && <span className="ml-1 text-[9px] uppercase tracking-wider opacity-60">Coming soon</span>}</p>
                          <p className="text-xs opacity-60">{m.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {paymentMethod !== "cod" && (
                  <div className="mt-3 space-y-3 rounded-xl border border-current/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="opacity-60">Send payment to</span>
                      <strong>{paymentSettings?.[paymentMethod]?.number || "01820050464"}</strong>
                    </div>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="opacity-60">Payer name</span>
                      <input value={payerName} onChange={(e) => setPayerName(e.target.value)} required className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" placeholder="Name used for the payment" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="opacity-60">Transaction ID</span>
                      <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} required className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" placeholder="e.g. 8N7A6QZK2L" />
                    </label>
                    <p className="text-[10px] opacity-50">Your order code(s): {cart.map((x) => x.productCode || x.id).join(", ")}</p>
                  </div>
                )}
              </div>

              {membership?.status === "active" && (
                <label className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer ${dark ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-black/[.02]"}`}>
                  <input type="checkbox" checked={useCoins} onChange={e => setUseCoins(e.target.checked)} className="mt-1" />
                  <span>
                    <strong className="text-sm">Use my ArtCanvas reward coins</strong>
                    <span className="block text-xs opacity-55 mt-1">The backend will securely use eligible coins and calculate the final discount. Your balance is never displayed.</span>
                  </span>
                </label>
              )}

              {error && <p className="text-xs text-[#A8431E]">{error}</p>}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={placing}
                className={`w-full h-12 rounded-full text-xs tracking-[0.2em] uppercase font-semibold flex items-center justify-center gap-2 disabled:opacity-50 ${dark ? "bg-[#EDE7D9] text-black" : "bg-black text-white"}`}
              >
                {placing && <Loader2 size={14} className="animate-spin" />}
                {placing ? "Placing order…" : `Place order — ${formatBDT(estimatedTotal)}`}
              </motion.button>
            </form>
          </div>

          <aside className="border border-current/10 rounded-2xl p-5 h-fit">
            <h3 className="text-xs tracking-widest uppercase opacity-50 mb-4">Order summary</h3>
            <div className="space-y-3 mb-4">
              {cart.map((i) => (
                <div key={i.cartKey || i.id} className="flex gap-3">
                  <img src={i.image || img(i.seed, 100, 130)} alt={i.name} className="w-12 h-14 object-cover rounded-md shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{i.name}</p>
                    <p className="text-xs opacity-50">Qty {i.qty}{i.size ? ` · Size ${i.size}` : ""}</p>
                    {hasActiveOffer(i) && <p className="text-[10px] text-[#A8431E]"><span className="line-through opacity-50 mr-1">{formatBDT(getOriginalPrice(i))}</span> Offer price applied</p>}
                  </div>
                  <span className="font-mono text-sm">{formatBDT(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-3 border-t border-current/10 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{formatBDT(subtotal)}</span></div>
              {useCoins && membership?.status === "active" && <div className="flex justify-between text-emerald-600"><span>Reward coin discount</span><span>Applied securely at checkout</span></div>}
              <div className="flex justify-between">
                <span>Delivery ({form.deliveryZone === "inside_dhaka" ? "Inside Dhaka" : form.deliveryZone === "outside_dhaka" ? "Outside Dhaka" : "Select area"})</span>
                <span className={`font-mono ${paymentSettings?.freeDeliveryActive ? "text-emerald-600 font-semibold" : ""}`}>
                  {paymentSettings?.freeDeliveryActive ? "FREE" : formatBDT(deliveryCharge)}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-2"><span>Total</span><span className="font-mono">{formatBDT(estimatedTotal)}</span></div>
            </div>
            <p className="text-[11px] opacity-50 mt-2">Final total and any reward-coin discount are calculated securely by the ArtCanvas backend.</p>
          </aside>
        </div>
      </main>
    </PageTransition>
  );
}
