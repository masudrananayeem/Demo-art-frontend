"use client"
import {useEffect,useMemo,useState} from "react"
import {Check,Clock3,X,RefreshCw,Search,Receipt,Save,Trash2} from "lucide-react"
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {artApi} from "@/lib/art-api"
import {useAdminAuth} from "@/contexts/admin-auth-context"
const toLocalDateTimeInput=(value:any)=>{
  if(!value) return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return value;
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}
const toStoredDateTime=(value:any)=>{
  if(!value) return "";
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
export default function PaymentsPage(){const{hasPermission,admin}=useAdminAuth();const[orders,setOrders]=useState<any[]>([]),[filter,setFilter]=useState("pending"),[q,setQ]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[settings,setSettings]=useState<any>({
  bkash:{number:"01820050464"},nagad:{number:"01820050464"},
  cashOnDelivery:true,onlinePaymentEnabled:true,
  insideDhakaCharge:75,outsideDhakaCharge:150,returnCharge:0,
  freeDeliveryEnabled:false,freeDeliveryStartAt:"",freeDeliveryEndAt:""
}),[savingSettings,setSavingSettings]=useState(false);const load=async()=>{setLoading(true);try{setOrders(await artApi.orders());const s=await artApi.paymentSettings();setSettings({...s,freeDeliveryStartAt:toLocalDateTimeInput(s.freeDeliveryStartAt),freeDeliveryEndAt:toLocalDateTimeInput(s.freeDeliveryEndAt)})}catch(e:any){setError(e.message||"Could not load finance data")}finally{setLoading(false)}};useEffect(()=>{load()},[]);const list=useMemo(()=>orders.filter(o=>{const ps=o.paymentStatus||((o.paymentMethod&&o.paymentMethod!=="cod")?"pending":"not_required");return (filter==="all"||ps===filter)&&`${o.id} ${o.email||""} ${o.customerName||""} ${o.paymentRef||""} ${(o.paymentProductCodes||[]).join(" ")}`.toLowerCase().includes(q.toLowerCase())}),[orders,filter,q]);const verify=async(o,status)=>{let note="";if(status==="rejected"){note=window.prompt("Reason for rejection (the client will see this):", "Transaction ID does not match our records.") ?? "";if(!note.trim())return;}setBusy(o.id+status);try{const saved=await artApi.updatePaymentStatus(o.id,status,{verifiedBy:admin?.uid||admin?.email||"admin",verifiedByName:admin?.name||admin?.email||"Admin",note});setOrders(xs=>xs.map(x=>x.id===o.id?saved:x))}catch(e:any){setError(e.message)}finally{setBusy("")}};
const deletePayment=async(o)=>{if(!confirm(`Delete transaction data for Order #${String(o.id).slice(-8)}? The order itself will remain, but the transaction ID/payer/rejection note will be cleared.`))return;setBusy(o.id+"delete");try{const saved=await artApi.deletePaymentRecord(o.id);setOrders(xs=>xs.map(x=>x.id===o.id?saved:x))}catch(e:any){setError(e.message)}finally{setBusy("")}};const saveSettings=async()=>{
  setSavingSettings(true);
  try{
    await artApi.updatePaymentSettings({
      ...settings,
      freeDeliveryStartAt:toStoredDateTime(settings.freeDeliveryStartAt),
      freeDeliveryEndAt:toStoredDateTime(settings.freeDeliveryEndAt)
    });
    setError("");
  }catch(e:any){setError(e.message)}finally{setSavingSettings(false)}
};if(!hasPermission("managePayments"))return <div className="px-4 lg:px-6"><Card><CardHeader><CardTitle>Finance</CardTitle><CardDescription>No permission.</CardDescription></CardHeader></Card></div>;return <div className="px-4 lg:px-6 space-y-6"><div className="flex justify-between gap-4 flex-wrap"><div><p className="text-xs uppercase tracking-[.18em] text-primary">Finance / Payments</p><h1 className="text-3xl font-semibold mt-1">Finance & payment verification</h1><p className="text-sm text-muted-foreground mt-2">Payment methods, receiving numbers, transaction verification and approval.</p></div><Button variant="outline" onClick={load}><RefreshCw className="size-4 mr-2"/>Refresh</Button></div>{error&&<div className="text-sm text-destructive">{error}</div>}<Card>
  <CardHeader>
    <CardTitle>Payment & delivery settings</CardTitle>
    <CardDescription>All storefront prices are shown in Bangladeshi Taka (৳). Set bKash/Nagad receiving numbers, delivery charges and a scheduled free-delivery window.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    <div className="grid md:grid-cols-2 gap-4">
      <label className="text-sm space-y-2"><span>bKash number</span><Input value={settings.bkash?.number||""} onChange={e=>setSettings({...settings,bkash:{...settings.bkash,number:e.target.value}})}/></label>
      <label className="text-sm space-y-2"><span>Nagad number</span><Input value={settings.nagad?.number||""} onChange={e=>setSettings({...settings,nagad:{...settings.nagad,number:e.target.value}})}/></label>
      <label className="text-sm space-y-2"><span>Inside Dhaka delivery (৳)</span><Input type="number" min="0" value={settings.insideDhakaCharge??75} onChange={e=>setSettings({...settings,insideDhakaCharge:e.target.value})}/><small className="text-xs text-muted-foreground">Default: ৳75</small></label>
      <label className="text-sm space-y-2"><span>Outside Dhaka delivery (৳)</span><Input type="number" min="0" value={settings.outsideDhakaCharge??150} onChange={e=>setSettings({...settings,outsideDhakaCharge:e.target.value})}/><small className="text-xs text-muted-foreground">Default: ৳150</small></label>
      <label className="text-sm space-y-2"><span>Return charge (৳)</span><Input type="number" min="0" value={settings.returnCharge||0} onChange={e=>setSettings({...settings,returnCharge:e.target.value})}/></label>
    </div>

    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><p className="font-medium">Free delivery schedule</p><p className="text-xs text-muted-foreground mt-1">Enable free delivery for a specific date/time range. Leave a start or end empty for an open-ended window.</p></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.freeDeliveryEnabled===true} onChange={e=>setSettings({...settings,freeDeliveryEnabled:e.target.checked})}/> Enable free delivery</label>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm space-y-2"><span>Free delivery starts</span><Input type="datetime-local" value={settings.freeDeliveryStartAt||""} onChange={e=>setSettings({...settings,freeDeliveryStartAt:e.target.value})}/></label>
        <label className="text-sm space-y-2"><span>Free delivery ends</span><Input type="datetime-local" value={settings.freeDeliveryEndAt||""} onChange={e=>setSettings({...settings,freeDeliveryEndAt:e.target.value})}/></label>
      </div>
      {settings.freeDeliveryEnabled===true && <p className="text-xs text-emerald-600">Free delivery will automatically turn on/off according to the saved schedule.</p>}
    </div>

    <div className="flex flex-wrap gap-5">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.cashOnDelivery!==false} onChange={e=>setSettings({...settings,cashOnDelivery:e.target.checked})}/> Cash on Delivery enabled</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.onlinePaymentEnabled!==false} onChange={e=>setSettings({...settings,onlinePaymentEnabled:e.target.checked})}/> Online payment enabled</label>
    </div>

    <Button onClick={saveSettings} disabled={savingSettings} className="w-fit"><Save className="size-4 mr-2"/>{savingSettings?"Saving…":"Save payment & delivery settings"}</Button>
  </CardContent>
</Card><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{["pending","verified","rejected","not_required"].map(s=><button key={s} onClick={()=>setFilter(filter===s?"all":s)} className={`rounded-xl border p-4 text-left ${filter===s?"border-primary bg-primary/5":""}`}><p className="text-xs text-muted-foreground capitalize">{s.replace("_"," ")}</p><p className="text-2xl font-semibold mt-1">{orders.filter(o=>(o.paymentStatus||((o.paymentMethod&&o.paymentMethod!=="cod")?"pending":"not_required"))===s).length}</p></button>)}</div><Card><CardHeader><CardTitle>Transaction verification</CardTitle><CardDescription>{list.length} records shown. Verify against payer name, transaction ID and product code before approval.</CardDescription><div className="relative mt-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/><Input className="pl-9" value={q} onChange={e=>setQ(e.target.value)} placeholder="Order, name, transaction ID, product code…"/></div></CardHeader><CardContent className="space-y-3">{loading?<p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>:list.length===0?<p className="py-8 text-center text-sm text-muted-foreground">No matching transactions.</p>:list.map(o=>{const ps=o.paymentStatus||((o.paymentMethod&&o.paymentMethod!=="cod")?"pending":"not_required");return <div key={o.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-4 flex-wrap"><div className="space-y-1"><div className="flex gap-2 flex-wrap"><Badge variant="outline">Order #{String(o.id).slice(-8)}</Badge><Badge variant="outline">{o.paymentMethod||"cod"}</Badge><Badge variant={ps==="verified"?"secondary":ps==="rejected"?"destructive":"outline"}>{ps}</Badge></div><p className="font-medium">{o.customerName||"Customer"}</p>{o.paymentNote&&<p className="text-xs text-muted-foreground">Notice / rejection reason: {o.paymentNote}</p>}<p className="text-xs text-muted-foreground">Payer: {o.paymentPayerName||"Not supplied"}</p><p className="text-xs flex items-center gap-1"><Receipt className="size-3"/> Transaction: <strong>{o.paymentRef||"—"}</strong></p><p className="text-xs text-muted-foreground">Product code: {(o.paymentProductCodes||o.items?.map((x:any)=>x.productCode||x.id)||[]).join(", ")||"—"}</p><p className="text-xs text-muted-foreground">Delivery: {o.deliveryZone==="inside_dhaka"?"Inside Dhaka":o.deliveryZone==="outside_dhaka"?"Outside Dhaka":"—"} · {o.deliveryFree?"Free":`৳${Number(o.deliveryCharge||0).toLocaleString()}`}</p><p className="text-xs text-muted-foreground">Size: {(o.items||[]).map((x:any)=>x.size||"—").join(", ")||"—"}</p></div><p className="font-mono font-semibold">৳{Number(o.total||0).toLocaleString()}</p></div>{ps!=="not_required"&&<div className="mt-4 flex gap-2 flex-wrap"><Button size="sm" disabled={!!busy} onClick={()=>verify(o,"verified")}><Check className="size-4 mr-1"/>Approve / Verify</Button><Button size="sm" variant="outline" disabled={!!busy} onClick={()=>verify(o,"rejected")}><X className="size-4 mr-1"/>Reject</Button><Button size="sm" variant="ghost" disabled={!!busy} onClick={()=>verify(o,"pending")}><Clock3 className="size-4 mr-1"/>Keep pending</Button><Button size="sm" variant="destructive" disabled={!!busy || (!o.paymentRef && !o.paymentPayerName && !o.paymentNote)} onClick={()=>deletePayment(o)}><Trash2 className="size-4 mr-1"/>Delete transaction data</Button></div>}</div>})}</CardContent></Card></div>}