import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Trash2, PackageCheck, Clock3, Truck, CircleCheck, Ban } from "lucide-react";
import { api } from "@/lib/art-api";

const STATUSES = ["placed", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const STATUS_META = {
  placed: { label: "Pending", icon: Clock3, dot: "bg-amber-500", badge: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25" },
  confirmed: { label: "Confirmed", icon: PackageCheck, dot: "bg-blue-500", badge: "text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/25" },
  processing: { label: "Processing", icon: PackageCheck, dot: "bg-violet-500", badge: "text-violet-700 dark:text-violet-300 bg-violet-500/10 border-violet-500/25" },
  shipped: { label: "Shipped / In transit", icon: Truck, dot: "bg-orange-500", badge: "text-orange-700 dark:text-orange-300 bg-orange-500/10 border-orange-500/25" },
  delivered: { label: "Delivered", icon: CircleCheck, dot: "bg-emerald-500", badge: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25" },
  cancelled: { label: "Cancelled", icon: Ban, dot: "bg-red-500", badge: "text-red-700 dark:text-red-300 bg-red-500/10 border-red-500/25" },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const [deleting, setDeleting] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all");
  const [serverCounts, setServerCounts] = useState({});
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState("");
  const [history, setHistory] = useState([]);
  const PAGE_SIZE = 25;

  const load = async () => {
    setError("");
    try {
      const data = await api.ordersPage(PAGE_SIZE, filter, cursor);
      setOrders(Array.isArray(data?.items) ? data.items : []);
      setServerCounts(Object.fromEntries((data?.statusCounts || []).map((x) => [x.status, Number(x.count || 0)])));
      setNextCursor(data?.nextCursor || null);
    } catch (e) {
      setOrders([]);
      setError(e.message || "Could not load orders.");
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.ordersPage(PAGE_SIZE, filter, cursor);
        if (!alive) return;
        setOrders(Array.isArray(data?.items) ? data.items : []);
        setServerCounts(Object.fromEntries((data?.statusCounts || []).map((x) => [x.status, Number(x.count || 0)])));
        setNextCursor(data?.nextCursor || null);
      } catch (e) {
        if (alive) { setOrders([]); setError(e.message || "Could not load orders."); }
      }
    })();
    return () => { alive = false; };
  }, [filter, cursor]);

  const counts = useMemo(() => {
    const base = Object.fromEntries(STATUSES.map((s) => [s, Number(serverCounts[s] || 0)]));
    return base;
  }, [serverCounts]);

  const visibleOrders = orders || [];

  const updateStatus = async (order, status) => {
    if (status === order.status) return;
    let reason = "";
    if (status === "cancelled") {
      if (order.status === "delivered") return;
      reason = prompt("Cancellation reason (the customer will see this):", "Order cancelled by ArtCanvas before delivery.");
      if (reason === null) return;
      reason = reason.trim();
    }
    setUpdating(order.id);
    setError("");
    try {
      const saved = await api.updateOrderStatus(order.id, status, reason);
      setOrders((current) => (current || []).map((item) => item.id === order.id ? saved : item));
    } catch (e) {
      setError(e.message || "Could not update order.");
    } finally {
      setUpdating("");
    }
  };

  const remove = async (order) => {
    if (!["delivered", "cancelled"].includes(order.status)) return;
    if (!confirm(`Delete order #${order.id}? This cannot be undone.`)) return;
    setDeleting(order.id);
    try {
      await api.deleteOrder(order.id);
      setOrders((current) => (current || []).filter((item) => item.id !== order.id));
      if (expanded === order.id) setExpanded(null);
    } catch (e) {
      setError(e.message || "Could not delete order.");
    } finally {
      setDeleting("");
    }
  };

  if (orders === null) return <p className="text-xs opacity-60 mt-6">Loading orders…</p>;

  return (
    <div className="mt-2 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display italic text-lg font-bold">Order control</h3>
          <p className="text-xs opacity-50">Track every order by delivery stage.</p>
        </div>
        <button type="button" onClick={() => { setCursor(""); setHistory([]); load(); }} className="px-3 py-1.5 rounded-full border border-current/15 text-[10px] font-semibold uppercase">Refresh</button>
      </div>

      {error && <p className="text-xs text-[#A8431E] border border-[#A8431E]/20 rounded-lg px-3 py-2">{error}</p>}

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {STATUSES.map((status) => {
          const MetaIcon = STATUS_META[status].icon;
          const active = filter === status;
          return (
            <button key={status} type="button" onClick={() => { setFilter(active ? "all" : status); setCursor(""); setHistory([]); }} className={`text-left rounded-xl border p-3 transition ${active ? "border-current/50 bg-current/5" : "border-current/10"}`}>
              <div className="flex items-center justify-between gap-2"><MetaIcon size={14} className="opacity-60" /><span className="text-xl font-semibold leading-none">{counts[status]}</span></div>
              <p className="text-[9px] uppercase tracking-wider opacity-50 mt-2">{STATUS_META[status].label}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-current/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-current/10 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] opacity-50">Order summary</p>
            <p className="text-xs opacity-60 mt-1">{visibleOrders.length} of {orders.length} orders shown</p>
            <div className="flex flex-wrap gap-1.5 mt-3">{STATUSES.map((s) => <span key={s} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-medium ${STATUS_META[s].badge}`}><span className={`size-1.5 rounded-full ${STATUS_META[s].dot}`} />{STATUS_META[s].label}</span>)}</div>
          </div>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setCursor(""); setHistory([]); }} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-xs capitalize">
            <option value="all">All orders</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="border-b border-current/10 bg-current/[.025]">
              <tr className="text-left uppercase tracking-wider text-[9px] opacity-45">
                <th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status / Track</th><th className="px-4 py-3">Date</th><th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => {
                const status = STATUSES.includes(order.status) ? order.status : "placed";
                const address = order.shipping || {};
                const isOpen = expanded === order.id;
                return (
                  <React.Fragment key={order.id}>
                    <tr className="border-b border-current/10 align-top">
                      <td className="px-4 py-4"><p className="font-mono font-semibold">Order #{String(order.id).slice(-8)}</p><p className="opacity-40 mt-1" title={String(order.id)}>Full ID: {String(order.id)}</p></td>
                      <td className="px-4 py-4"><p className="font-medium">{address.fullName || order.customerName || "Customer"}</p><p className="opacity-45 mt-1">{order.email || "No email"}</p></td>
                      <td className="px-4 py-4">{(order.items || []).reduce((n, i) => n + Number(i?.qty || 0), 0)} item(s)</td>
                      <td className="px-4 py-4 font-mono font-semibold">৳{Number(order.total || 0).toLocaleString()}</td>
                      <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold capitalize ${STATUS_META[status].badge}`}><span className={`size-1.5 rounded-full ${STATUS_META[status].dot}`} />{STATUS_META[status].label}</span><p className="text-[9px] uppercase opacity-40 mt-2">{status === "shipped" ? "In transit" : status === "delivered" ? "Delivered" : status === "cancelled" ? "Closed" : "Needs attention"}</p></td>
                      <td className="px-4 py-4 opacity-55 whitespace-nowrap">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-4"><button type="button" onClick={() => setExpanded(isOpen ? null : order.id)} className="w-8 h-8 rounded-full border border-current/15 flex items-center justify-center" title="View order details"><ChevronDown size={13} className={isOpen ? "rotate-180" : ""}/></button></td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-current/10"><td colSpan={7} className="px-4 pb-5 pt-1">
                        <div className="rounded-xl border border-current/10 p-4 grid md:grid-cols-3 gap-5">
                          <div><p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Delivery</p><p className="font-semibold">{order.deliveryZone === "inside_dhaka" ? "Inside Dhaka" : order.deliveryZone === "outside_dhaka" ? "Outside Dhaka" : "Delivery area not set"}</p><p className="opacity-60">Charge: ৳{Number(order.deliveryCharge || 0).toLocaleString()}{order.deliveryFree ? " · Free delivery" : ""}</p><p className="mt-2">{address.fullName || "—"}</p><p className="opacity-60">{address.line1 || "—"}</p>{address.line2 && <p className="opacity-60">{address.line2}</p>}<p className="opacity-60">{[address.city, address.state, address.zip, address.country].filter(Boolean).join(", ") || "—"}</p><p className="opacity-60 mt-1">{address.phone || order.phone || "—"}</p></div>
                          <div><p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Payment</p><p className="capitalize">{order.paymentMethod === "cod" ? "Cash on delivery" : order.paymentMethod || "—"}</p>{order.paymentRef && <p className="opacity-60 mt-1">Reference: {order.paymentRef}</p>}<div className="mt-3"><p className="text-[9px] uppercase tracking-widest opacity-40 mb-1">Update status</p><select value={status} disabled={updating === order.id || deleting === order.id || status === "delivered" || status === "cancelled"} onChange={(e) => updateStatus(order, e.target.value)} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-xs capitalize w-full">{STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}</select></div></div>
                          <div><p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Items</p><div className="space-y-2">{(order.items || []).map((item, i) => <div key={`${order.id}-${i}`} className="flex justify-between gap-3"><div><p>{item?.name || "Item"} × {Number(item?.qty || 0)}</p><p className="text-[10px] opacity-50 mt-0.5">{item?.size ? `Size: ${item.size}` : "Size: —"}{item?.productCode ? ` · Code: ${item.productCode}` : ""}</p></div><span className="font-mono">৳{(Number(item?.price || 0) * Number(item?.qty || 0)).toLocaleString()}</span></div>)}</div><div className="mt-3 pt-3 border-t border-current/10"><p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Status history</p>{(order.statusHistory || []).map((h, i) => <div key={`${h.status}-${i}`} className="flex justify-between gap-3 py-0.5"><span className="capitalize">{h.status}</span><span className="opacity-45">{h.at ? new Date(h.at).toLocaleString() : "—"}</span></div>)}</div></div>
                          {['delivered','cancelled'].includes(status) && <div className="md:col-span-3 pt-3 border-t border-current/10 flex justify-end"><button type="button" onClick={() => remove(order)} disabled={deleting === order.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[#A8431E]/25 text-[#A8431E] text-[10px] uppercase font-semibold">{deleting === order.id ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>} Delete completed order</button></div>}
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {visibleOrders.length === 0 && <p className="px-4 py-8 text-xs opacity-50">No orders in this stage.</p>}
          {(history.length > 0 || nextCursor) && <div className="px-4 py-3 border-t border-current/10 flex items-center justify-between gap-3 text-xs"><button type="button" disabled={!history.length} onClick={() => { const previous = history[history.length - 1] || ""; setHistory((h) => h.slice(0, -1)); setCursor(previous); }} className="px-3 py-1.5 rounded-full border border-current/15 disabled:opacity-30">Previous</button><span className="opacity-50">Showing up to {PAGE_SIZE} orders</span><button type="button" disabled={!nextCursor} onClick={() => { setHistory((h) => [...h, cursor]); setCursor(nextCursor || ""); }} className="px-3 py-1.5 rounded-full border border-current/15 disabled:opacity-30">Next</button></div>}
        </div>
      </div>
    </div>
  );
}
