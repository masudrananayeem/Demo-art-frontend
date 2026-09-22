import React,{useEffect,useState} from "react"
import {CheckCircle2,Loader2,ShieldCheck,Star,Clock3} from "lucide-react"
import {useStore} from "../context/StoreContext"
import {api} from "../lib/api"
import PageTransition from "../components/PageTransition"

export default function Membership(){
  const {user,dark}=useStore();
  const [mine,setMine]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [phone,setPhone]=useState(user?.phone||"");
  useEffect(()=>{setPhone(user?.phone||"")},[user]);
  useEffect(()=>{if(!user){setLoading(false);return} setLoading(true);api.myMembership().then(setMine).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[user]);
  const join=async()=>{
    if(!user){setError("Please sign in first to request free membership.");return}
    if(!user.email&&!phone.trim()){setError("Please provide your email or phone number.");return}
    setBusy(true);setError("");
    try{const result=await api.requestMembership({name:user.name||user.email||"ArtCanvas Customer",phone:phone.trim()});setMine(result)}catch(e){setError(e.message)}finally{setBusy(false)}
  };
  return <PageTransition><main className="px-6 pt-12 pb-24"><div className="max-w-5xl mx-auto">
    <p className="section-kicker">ARTCANVAS / MEMBERSHIP</p>
    <h1 className="font-display italic text-4xl font-bold mt-2">Become an ArtCanvas Member.</h1>
    <p className="text-sm opacity-60 mt-3 max-w-2xl">Membership is completely free. Request membership with your email or phone number. An ArtCanvas admin reviews the request before activating it.</p>
    {!user&&<div className="mt-8 rounded-2xl border border-current/10 p-5"><p className="text-sm">Sign in to request your free membership.</p></div>}
    {user&&<div className={`mt-8 rounded-2xl border p-6 ${dark?"bg-white/[.03] border-white/10":"bg-black/[.02] border-black/10"}`}>
      {loading?<Loader2 className="animate-spin"/>:mine?.status==="active"?<div className="flex gap-4 items-start"><CheckCircle2 className="text-emerald-500 mt-1"/><div><h2 className="text-xl font-semibold">You are an ArtCanvas Member</h2><p className="text-sm opacity-60 mt-2">Member benefits, reward coins and special announcements are managed by ArtCanvas.</p><p className="text-xs opacity-50 mt-2">Your reward coin balance is intentionally private and is not shown here.</p></div></div>:mine?.status==="pending"?<div className="flex gap-4 items-start"><Clock3 className="mt-1"/><div><h2 className="text-xl font-semibold">Membership request pending</h2><p className="text-sm opacity-60 mt-2">An admin needs to approve your free membership request.</p></div></div>:<div>
        <h2 className="text-xl font-semibold">Free membership</h2><p className="text-sm opacity-60 mt-2">Join the ArtCanvas member community and receive reward coins when eligible purchases are completed.</p>
        <div className="grid sm:grid-cols-3 gap-3 mt-5 text-xs"><div className="rounded-xl border border-current/10 p-4"><Star size={15}/><p className="font-medium mt-2">Reward coins</p><p className="opacity-50 mt-1">Earn coins according to admin-set product rules.</p></div><div className="rounded-xl border border-current/10 p-4"><ShieldCheck size={15}/><p className="font-medium mt-2">Member offers</p><p className="opacity-50 mt-1">Receive announcements for offers and new releases.</p></div><div className="rounded-xl border border-current/10 p-4"><CheckCircle2 size={15}/><p className="font-medium mt-2">Free to join</p><p className="opacity-50 mt-1">No membership fee or subscription.</p></div></div>
        <label className="block mt-5 text-xs"><span className="opacity-60">Phone number (optional if your account email is available)</span><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="mt-1 w-full max-w-sm px-3 py-2.5 rounded-lg border border-current/15 bg-transparent"/></label>
        {error&&<p className="text-xs text-red-500 mt-3">{error}</p>}
        <button onClick={join} disabled={busy} className={`mt-5 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-wider ${dark?"bg-white text-black":"bg-black text-white"}`}>{busy?<Loader2 size={14} className="animate-spin"/>:"Request free membership"}</button>
      </div>}
      {error&&mine?.status&&<p className="text-xs text-red-500 mt-4">{error}</p>}
    </div>}
  </div></main></PageTransition>
}
