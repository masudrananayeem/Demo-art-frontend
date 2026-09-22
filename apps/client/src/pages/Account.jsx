import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Mail, Lock, UserRound, Eye, EyeOff, ShieldCheck, Camera, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import { useStore } from "../context/StoreContext";
import { formatBDT } from "../lib/money";
import { api, uploadProfileImage } from "../lib/api";

const ORDER_STEPS = ["placed", "confirmed", "processing", "shipped", "delivered"];

function OrderCard({ o, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const currentIndex = ORDER_STEPS.indexOf(o.status);
  const cancelled = o.status === "cancelled";
  const history = Array.isArray(o.statusHistory) && o.statusHistory.length
    ? o.statusHistory
    : [{ status: o.status, at: o.createdAt }];
  const itemCount = (o.items || []).reduce((sum, item) => sum + Number(item?.qty || 0), 0);

  return (
    <article className={`account-order-card ${expanded ? "is-expanded" : ""} ${compact ? "account-order-card--compact" : ""}`}>
      <button
        type="button"
        className="account-order-summary"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="account-order-thumb-stack">
          {(o.items || []).slice(0, 3).map((it, i) => (
            <img key={`${o.id}-thumb-${i}`} src={it?.image || "https://picsum.photos/seed/" + (it?.seed || i) + "/80/80"} alt="" />
          ))}
        </div>
        <div className="account-order-summary-main">
          <div className="flex items-center gap-2 flex-wrap">
            <strong>Order #{String(o.id).slice(-8)}</strong>
            <span className={`account-status account-status--${o.status || "placed"}`}>{o.status || "placed"}</span>
          </div>
          <p>{itemCount} item{itemCount !== 1 ? "s" : ""} · {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</p>
        </div>
        <div className="account-order-summary-total">
          <strong>{formatBDT(o.total)}</strong>
          <span>{expanded ? "Hide details" : compact ? "View order" : "Track order"}</span>
        </div>
      </button>

      {expanded && (
        <div className="account-order-details">
          {!compact && (
            <div className="account-tracking-block">
              <div className="account-detail-heading">
                <div>
                  <p className="section-kicker">TRACK ORDER</p>
                  <h4>{cancelled ? "Order cancelled" : `Currently ${o.status || "placed"}`}</h4>
                </div>
                <span className="text-[10px] opacity-45">{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</span>
              </div>

              {!cancelled ? (
                <div className="account-tracker">
                  {ORDER_STEPS.map((step, i) => {
                    const reached = currentIndex >= i;
                    return (
                      <div key={step} className={`account-tracker-step ${reached ? "reached" : ""}`}>
                        <div className="account-tracker-dot" />
                        <span>{step}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#A8431E] mt-3">This order was cancelled.</p>
              )}
            </div>
          )}

          {(o.customerNotice || o.cancellationReason || o.paymentStatus === "rejected") && (
            <div className={`mb-4 rounded-xl border p-4 ${o.paymentStatus === "rejected" ? "border-red-500/25 bg-red-500/5" : "border-amber-500/25 bg-amber-500/5"}`}>
              <p className="text-[10px] uppercase tracking-widest font-semibold">{o.paymentStatus === "rejected" ? "Payment / order notice" : "Order notice"}</p>
              <p className="text-xs mt-2 leading-5">{o.customerNotice || o.cancellationReason || "This order was cancelled by the studio."}</p>
              {o.paymentStatus === "rejected" && <p className="text-[10px] opacity-65 mt-2">If your account was charged, please contact ArtCanvas support so the payment can be checked and a refund/return can be arranged where applicable.</p>}
            </div>
          )}

          <div className="account-detail-grid">
            <div className="account-detail-card">
              <p className="account-detail-label">ITEMS</p>
              <div className="space-y-2 mt-3">
                {(o.items || []).map((it, i) => {
                  const original = Number(it?.originalPrice ?? it?.price ?? 0);
                  const current = Number(it?.price ?? 0);
                  const offerPercent = it?.offerActive && original > current ? Math.max(1, Math.round(((original - current) / original) * 100)) : 0;
                  return (
                    <div key={`${o.id}-${i}`} className="rounded-lg border border-current/8 p-3">
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium">{it?.name || "Item"} × {it?.qty || 0}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] opacity-55">
                            {it?.size && <span>Size: <strong className="opacity-90">{it.size}</strong></span>}
                            {it?.productCode && <span>Code: {it.productCode}</span>}
                            {offerPercent > 0 && <span className="font-semibold text-[#A8431E] opacity-100">{offerPercent}% OFF</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {offerPercent > 0 && <span className="block text-[10px] line-through opacity-40">{formatBDT(original * Number(it?.qty || 0))}</span>}
                          <span className="font-mono">{formatBDT(current * Number(it?.qty || 0))}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="account-detail-card">
              <p className="account-detail-label">DELIVERY</p>
              <div className="mt-3 text-xs leading-5">
                <p className="font-semibold">Delivery area: {o.deliveryZone === "inside_dhaka" ? "Inside Dhaka" : o.deliveryZone === "outside_dhaka" ? "Outside Dhaka" : "—"}</p>
                <p className="opacity-60">Delivery charge: {formatBDT(o.deliveryCharge || 0)}{o.deliveryFree ? " · Free delivery" : ""}</p>
                <p className="opacity-80 mt-2">{o.shipping?.fullName || "—"}</p>
                <p className="opacity-55">{o.shipping?.line1 || ""}{o.shipping?.line2 ? `, ${o.shipping.line2}` : ""}</p>
                <p className="opacity-55">{[o.shipping?.city, o.shipping?.state, o.shipping?.zip, o.shipping?.country].filter(Boolean).join(", ")}</p>
                <p className="opacity-55">{o.shipping?.phone || ""}</p>
              </div>
            </div>

            <div className="account-detail-card">
              <p className="account-detail-label">PAYMENT</p>
              <div className="mt-3 text-xs leading-5">
                <p className="capitalize opacity-75">{o.paymentMethod === "cod" ? "Cash on delivery" : o.paymentMethod || "—"}</p>
                {o.paymentRef && <p className="opacity-55 break-all">Transaction: {o.paymentRef}</p>}
                <p className={`mt-1 font-semibold ${o.paymentStatus === "rejected" ? "text-red-600 dark:text-red-400" : o.paymentStatus === "verified" ? "text-green-600 dark:text-green-400" : ""}`}>Payment status: {o.paymentStatus || "—"}</p>
                {o.paymentNote && <p className="opacity-55 mt-1">Admin note: {o.paymentNote}</p>}
                <p className="font-semibold font-mono mt-1">Total {formatBDT(o.total)}</p>
              </div>
            </div>
          </div>

          <details className="account-status-history">
            <summary>Status history</summary>
            <div className="mt-3 space-y-2">
              {history.map((h, i) => (
                <div key={`${h.status}-${i}`} className="flex justify-between gap-3 text-xs">
                  <span className="capitalize">{h.status}</span>
                  <span className="opacity-50">{h.at ? new Date(h.at).toLocaleString() : "—"}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </article>
  );
}

function OrderHistory({ dark = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.myOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Could not load your orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.myOrders();
        if (alive) setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setError(e.message || "Could not load your orders.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <section className="account-section"><p className="section-kicker">MY ORDERS</p><p className="text-xs opacity-60 mt-3">Loading your orders…</p></section>;
  if (error) return <section className="account-section"><div className="flex items-center justify-between gap-3"><p className="section-kicker">MY ORDERS</p><button type="button" onClick={load} className="text-[10px] uppercase opacity-55 hover:opacity-100">Try again</button></div><p className="text-xs text-[#A8431E] mt-3">{error}</p></section>;

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const purchaseHistory = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className={`account-orders-stack ${dark ? "account-orders-stack--dark" : ""}`}>
      <section className="account-section account-orders-section account-current-orders">
        <div className="account-section-heading">
          <div>
            <p className="section-kicker">MY ORDERS</p>
            <h3>Active orders</h3>
            <p>{activeOrders.length ? `${activeOrders.length} order${activeOrders.length !== 1 ? "s" : ""} currently in progress.` : "No active orders right now."}</p>
          </div>
          <button type="button" onClick={load} className="account-refresh">Refresh</button>
        </div>

        {activeOrders.length ? (
          <div className="account-order-list">
            {activeOrders.map((o) => <OrderCard key={o.id} o={o} />)}
          </div>
        ) : (
          <div className="account-empty-order">
            <p>Your current orders will appear here with live tracking.</p>
            <Link to="/shop" className="account-section-link">Explore products <ArrowUpRight size={13} /></Link>
          </div>
        )}
      </section>

      <section className="account-section account-history-section">
        <div className="account-section-heading">
          <div>
            <p className="section-kicker">PURCHASE HISTORY</p>
            <h3>Past orders</h3>
            <p>{purchaseHistory.length} completed or cancelled order{purchaseHistory.length !== 1 ? "s" : ""}.</p>
          </div>
        </div>

        {purchaseHistory.length ? (
          <div className="account-order-list">
            {purchaseHistory.map((o) => <OrderCard key={o.id} o={o} compact />)}
          </div>
        ) : (
          <div className="account-empty-order">
            <p>No previous purchases yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileEditor() {
  const { user, updateMyProfile } = useStore();
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    line1: user?.address?.line1 || "",
    line2: user?.address?.line2 || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    zip: user?.address?.zip || "",
    country: user?.address?.country || "Bangladesh",
  });
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [synced, setSynced] = useState(false);

  // Profile fields load asynchronously right after sign-in, so the form may
  // mount before they arrive — sync once when they do (but only once, so we
  // don't clobber text the person is actively editing).
  useEffect(() => {
    if (synced || !user) return;
    if (user.name || user.phone || user.address || user.photoURL) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        line1: user.address?.line1 || "",
        line2: user.address?.line2 || "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        zip: user.address?.zip || "",
        country: user.address?.country || "Bangladesh",
      });
      setPhotoURL(user.photoURL || "");
      setSynced(true);
    }
  }, [user, synced]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadProfileImage(file);
      setPhotoURL(uploaded.url);
      await updateMyProfile({ photoURL: uploaded.url });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateMyProfile({
        name: form.name,
        phone: form.phone,
        address: { fullName: form.name, phone: form.phone, line1: form.line1, line2: form.line2, city: form.city, state: form.state, zip: form.zip, country: form.country },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="account-section account-profile-section">
    <form onSubmit={save} className="space-y-4">
      <p className="section-kicker">PROFILE</p>

      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          {photoURL ? (
            <img src={photoURL} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-current/10 flex items-center justify-center">
              <UserRound size={22} className="opacity-50" />
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center cursor-pointer">
            {uploadingPhoto ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
            <input type="file" accept="image/*" className="hidden" onChange={pickPhoto} disabled={uploadingPhoto} />
          </label>
        </div>
        <p className="text-xs opacity-50">Click the camera icon to change your profile photo.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-60">Name</span>
          <input value={form.name} onChange={set("name")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-60">Phone</span>
          <input value={form.phone} onChange={set("phone")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" placeholder="01XXXXXXXXX" />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="opacity-60">Address line 1</span>
          <input value={form.line1} onChange={set("line1")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" placeholder="House, road, area" />
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          <span className="opacity-60">Address line 2</span>
          <input value={form.line2} onChange={set("line2")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-60">City</span>
          <input value={form.city} onChange={set("city")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-60">District / State</span>
          <input value={form.state} onChange={set("state")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-60">ZIP / Postal code</span>
          <input value={form.zip} onChange={set("zip")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="opacity-60">Country</span>
          <input value={form.country} onChange={set("country")} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-sm" />
        </label>
      </div>

      {error && <p className="text-xs text-[#A8431E]">{error}</p>}

      <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase bg-black text-white disabled:opacity-50">
        {saving ? "Saving…" : "Save profile"}
      </button>
      {saved && <span className="text-xs text-emerald-600 ml-3">Saved.</span>}
    </form>
    </section>
  );
}

export default function Account() {
  const { dark, user, isAdmin, authLoading, authError, clearAuthError, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } = useStore();
  const [circulation, setCirculation] = useState([]);
  useEffect(() => { if (user) api.myCirculation().then(setCirculation).catch(() => {}); else setCirculation([]); }, [user]);
  const [mode, setMode] = useState("signin");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = params.get("next");

  useEffect(() => {
    if (user && next) navigate(next, { replace: true });
  }, [user, next, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSubmitting(true);
    if (mode === "signin") {
      await signInWithEmail(f.get("email"), f.get("password"));
    } else {
      await signUpWithEmail(f.get("name"), f.get("email"), f.get("password"));
    }
    setSubmitting(false);
  };

  const google = async () => {
    setSubmitting(true);
    await signInWithGoogle();
    setSubmitting(false);
  };

  return (
    <PageTransition>
      <main className="account-page">
        <div className="account-wrap">
          <section className="account-intro">
            <p className="section-kicker">ARTCANVAS / MEMBER SPACE</p>
            <h1>
              Keep your
              <br />
              <em>point of view.</em>
            </h1>
            <p>Save pieces, follow new collections, track your orders and message the studio from one quiet space.</p>
            <Link to="/shop" className="account-link">
              Explore the collection <ArrowUpRight size={14} />
            </Link>
          </section>

          {authLoading ? (
            <motion.section layout className={`account-panel ${dark ? "account-panel--dark" : ""}`}>
              <p className="text-sm opacity-60">Loading…</p>
            </motion.section>
          ) : user ? (
            <div className="account-member-column">
              <motion.section layout className={`account-panel account-panel--member ${dark ? "account-panel--dark" : ""}`}>
                <div className="account-welcome">
                  <p className="section-kicker">MEMBER</p>
                  <h2>Welcome, {user.name}.</h2>
                  <p>You are signed in as {user.email}.</p>
                  {isAdmin && (
                    <Link to="/admin" className="account-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                      <ShieldCheck size={14} /> Go to admin dashboard
                    </Link>
                  )}
                  <Link to="/" className="account-primary">
                    Continue exploring
                  </Link>
                  <button onClick={signOut} className="account-secondary">
                    Sign out
                  </button>
                  <ProfileEditor />
                </div>
              </motion.section>

              <OrderHistory dark={dark} />
              {circulation.length > 0 && <section className="account-section account-history-section mt-6"><div className="account-section-heading"><div><p className="section-kicker">CIRCULATION</p><h3>Loans & returns</h3><p>Loan, due date and shipment status.</p></div></div><div className="account-order-list">{circulation.map(r=><article key={r.id} className="account-order-card"><div className="account-order-summary"><div className="account-order-summary-main"><strong>{r.productName}</strong><p>{r.productCode||r.productId} · {r.status}</p><p>Loan {r.loanDate||"—"} · Due {r.dueDate||"—"} · Return {r.returnedDate||"—"}</p>{r.trackingNumber&&<p>Shipment {r.shipmentStatus||"—"} · {r.trackingNumber}</p>}</div></div></article>)}</div></section>}
            </div>
          ) : (
            <motion.section layout className={`account-panel ${dark ? "account-panel--dark" : ""}`}>
              <>
                <div className="account-tabs">
                  <button
                    onClick={() => {
                      setMode("signin");
                      clearAuthError();
                    }}
                    className={mode === "signin" ? "active" : ""}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => {
                      setMode("signup");
                      clearAuthError();
                    }}
                    className={mode === "signup" ? "active" : ""}
                  >
                    Sign up
                  </button>
                </div>
                <div className="account-title">
                  <p>{mode === "signin" ? "Welcome back." : "Make it yours."}</p>
                  <span>{mode === "signin" ? "Enter your details to continue." : "Create an account and join the studio."}</span>
                </div>
                <button type="button" className="google-btn" onClick={google} disabled={submitting}>
                  <span className="google-g">G</span>Continue with Google
                </button>
                <div className="account-or">
                  <span>or continue with email</span>
                </div>
                <form onSubmit={submit} className="account-form">
                  {mode === "signup" && (
                    <label>
                      <span>Name</span>
                      <div className="input-wrap">
                        <UserRound size={15} />
                        <input name="name" required placeholder="Your full name" />
                      </div>
                    </label>
                  )}
                  <label>
                    <span>Email</span>
                    <div className="input-wrap">
                      <Mail size={15} />
                      <input name="email" required type="email" placeholder="you@example.com" />
                    </div>
                  </label>
                  <label>
                    <span>Password</span>
                    <div className="input-wrap">
                      <Lock size={15} />
                      <input name="password" required minLength={6} type={show ? "text" : "password"} placeholder="At least 6 characters" />
                      <button type="button" onClick={() => setShow((v) => !v)}>
                        {show ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </label>
                  <button className="account-primary" type="submit" disabled={submitting}>
                    {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                  </button>
                </form>
                {authError && <div className="account-success" style={{ color: "#A8431E" }}>{authError}</div>}
                <p className="account-terms">By continuing, you agree to ArtCanvas terms & privacy.</p>
              </>
            </motion.section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
