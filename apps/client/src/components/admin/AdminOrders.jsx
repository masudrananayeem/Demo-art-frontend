import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Trash2, PackageCheck, Clock3, Truck, CircleCheck, Ban } from "lucide-react";
import { api } from "../../lib/api";
import { formatBDT } from "../../lib/money";

const STATUSES = ["placed", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const STATUS_META = {
  placed: { label: "Pending", icon: Clock3 },
  confirmed: { label: "Confirmed", icon: PackageCheck },
  processing: { label: "Processing", icon: PackageCheck },
  shipped: { label: "Shipped / In transit", icon: Truck },
  delivered: { label: "Delivered", icon: CircleCheck },
  cancelled: { label: "Cancelled", icon: Ban },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const [deleting, setDeleting] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setError("");
    try {
      const data = await api.allOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setOrders([]);
      setError(e.message || "Could not load orders.");
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.allOrders();
        if (alive) setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) {
          setOrders([]);
          setError(e.message || "Could not load orders.");
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  const counts = useMemo(() => {
    const base = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const order of orders || []) {
      const status = STATUSES.includes(order.status) ? order.status : "placed";
      base[status] += 1;
    }
    return base;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const list = orders || [];
    if (filter === "all") return list;
    return list.filter((o) => (STATUSES.includes(o.status) ? o.status : "placed") === filter);
  }, [orders, filter]);

  const updateStatus = async (order, status) => {
    if (status === order.status) return;
    if (status === "cancelled" && !confirm(`Cancel order ${order.id}? Stock will be restored.`)) return;
    setUpdating(order.id);
    setError("");
    try {
      const saved = await api.updateOrderStatus(order.id, status);
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
        <button type="button" onClick={load} className="px-3 py-1.5 rounded-full border border-current/15 text-[10px] font-semibold uppercase">Refresh</button>
      </div>

      {error && <p className="text-xs text-[#A8431E] border border-[#A8431E]/20 rounded-lg px-3 py-2">{error}</p>}

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {STATUSES.map((status) => {
          const MetaIcon = STATUS_META[status].icon;
          const active = filter === status;
          return (
            <button key={status} type="button" onClick={() => setFilter(active ? "all" : status)} className={`text-left rounded-xl border p-3 transition ${active ? "border-current/50 bg-current/5" : "border-current/10"}`}>
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
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-xs capitalize">
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
                      <td className="px-4 py-4"><p className="font-mono font-semibold">#{String(order.id).slice(0, 10)}</p><p className="opacity-40 mt-1">{String(order.id).length > 10 ? "…" : ""}</p></td>
                      <td className="px-4 py-4"><p className="font-medium">{address.fullName || order.customerName || "Customer"}</p><p className="opacity-45 mt-1">{order.email || "No email"}</p></td>
                      <td className="px-4 py-4">{(order.items || []).reduce((n, i) => n + Number(i?.qty || 0), 0)} item(s)</td>
                      <td className="px-4 py-4 font-mono font-semibold">{formatBDT(order.total)}</td>
                      <td className="px-4 py-4"><span className="inline-flex px-2 py-1 rounded-full bg-current/5 capitalize">{STATUS_META[status].label}</span><p className="text-[9px] uppercase opacity-40 mt-2">{status === "shipped" ? "In transit" : status === "delivered" ? "Delivered" : status === "cancelled" ? "Closed" : "Needs attention"}</p></td>
                      <td className="px-4 py-4 opacity-55 whitespace-nowrap">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-4"><button type="button" onClick={() => setExpanded(isOpen ? null : order.id)} className="w-8 h-8 rounded-full border border-current/15 flex items-center justify-center" title="View order details"><ChevronDown size={13} className={isOpen ? "rotate-180" : ""}/></button></td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-current/10"><td colSpan={7} className="px-4 pb-5 pt-1">
                        <div className="rounded-xl border border-current/10 p-4 grid md:grid-cols-3 gap-5">
                          <div><p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Delivery</p><p>{address.fullName || "—"}</p><p className="opacity-60">{address.line1 || "—"}</p>{address.line2 && <p className="opacity-60">{address.line2}</p>}<p className="opacity-60">{[address.city, address.state, address.zip, address.country].filter(Boolean).join(", ") || "—"}</p><p className="opacity-60 mt-1">{address.phone || order.phone || "—"}</p></div>
                          <div><p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Payment</p><p className="capitalize">{order.paymentMethod === "cod" ? "Cash on delivery" : order.paymentMethod || "—"}</p>{order.paymentRef && <p className="opacity-60 mt-1">Reference: {order.paymentRef}</p>}<div className="mt-3"><p className="text-[9px] uppercase tracking-widest opacity-40 mb-1">Update status</p><select value={status} disabled={updating === order.id || deleting === order.id} onChange={(e) => updateStatus(order, e.target.value)} className="px-3 py-2 rounded-lg border border-current/15 bg-transparent text-xs capitalize w-full">{STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}</select></div></div>
                          <div><p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Items</p><div className="space-y-2">{(order.items || []).map((item, i) => { const original = Number(item?.originalPrice ?? item?.price ?? 0); const current = Number(item?.price ?? 0); const off = item?.offerActive && original > current ? Math.max(1, Math.round(((original - current) / original) * 100)) : 0; return <div key={`${order.id}-${i}`} className="rounded-lg border border-current/8 p-2.5"><div className="flex justify-between gap-3"><div><span>{item?.name || "Item"} × {Number(item?.qty || 0)}</span><div className="text-[9px] opacity-50 mt-1 flex flex-wrap gap-x-2">{item?.size && <span>Size: {item.size}</span>}{item?.productCode && <span>Code: {item.productCode}</span>}{off > 0 && <span className="text-[#A8431E] font-semibold">{off}% OFF</span>}</div></div><span className="font-mono">{formatBDT(current * Number(item?.qty || 0))}</span></div></div>})}</div><div className="mt-3 pt-3 border-t border-current/10"><p className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Status history</p>{(order.statusHistory || []).map((h, i) => <div key={`${h.status}-${i}`} className="flex justify-between gap-3 py-0.5"><span className="capitalize">{h.status}</span><span className="opacity-45">{h.at ? new Date(h.at).toLocaleString() : "—"}</span></div>)}</div></div>
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
        </div>
      </div>
    </div>
  );
}
