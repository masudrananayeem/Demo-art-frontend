import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Mail, ArrowRight, Check, Loader2 } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";

export default function Footer(){
  const {dark}=useStore();
  const [email,setEmail]=useState("");
  const [status,setStatus]=useState("");
  const [saving,setSaving]=useState(false);
  const submitNewsletter=async(e)=>{
    e.preventDefault();
    const value=email.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)){setStatus("Please enter a valid email.");return;}
    setSaving(true); setStatus("");
    try{
      await api.subscribeNewsletter(value);
      localStorage.setItem("artcanvas_newsletter_email",value);
      setEmail(""); setStatus("You're on the studio letter list.");
    }catch(err){ setStatus(err?.message || "Could not subscribe right now."); }
    finally{setSaving(false);}
  };
  React.useEffect(()=>{try{const saved=localStorage.getItem("artcanvas_newsletter_email");if(saved)setEmail(saved);}catch{}},[]);
  return <footer className={`site-footer site-footer--editorial ${dark?"site-footer--dark":""}`}>
  <div className="footer-flag"><span>ARTCANVAS / 2026</span><span>INDEPENDENT EDITORIAL STORE</span></div>
  <div className="footer-main">
    <div className="footer-brand"><Link to="/" className="site-footer__brand"><img src="/brand/artcanvas-logo.png" alt="ArtCanvas" className="site-footer__logo" /><span>ArtCanvas</span></Link><p>Clothing, objects and visual culture — carefully selected, quietly made, and meant to stay in rotation.</p><Link to="/shop" className="site-footer__arrow-link">Explore the collection <ArrowUpRight size={15}/></Link></div>
    <div className="footer-letter"><p className="site-footer__kicker">THE STUDIO LETTER</p><h2>Good things<br/><em>take time.</em></h2><form onSubmit={submitNewsletter}><input type="email" value={email} onChange={e=>{setEmail(e.target.value);setStatus("")}} placeholder="Your email address" aria-label="Email address" autoComplete="email"/><button type="submit" aria-label="Subscribe" disabled={saving}>{saving?<Loader2 size={18} className="animate-spin"/>:<ArrowRight size={18}/>}</button></form><small>New arrivals, studio notes and occasional releases. No noise.</small>{status&&<p className="mt-3 text-[10px] opacity-70" role="status">{status}</p>}</div>
  </div>
  <div className="footer-links">
    <div><p className="site-footer__kicker">EXPLORE</p><Link to="/">Home</Link><Link to="/shop">Shop all</Link><Link to="/gallery">Gallery</Link><Link to="/about">The studio</Link></div>
    <div><p className="site-footer__kicker">CLOTHING</p><Link to="/shop?category=clothing&gender=women">Women</Link><Link to="/shop?category=clothing&gender=men">Men</Link><Link to="/shop?category=clothing&gender=kids">Children</Link><Link to="/shop?category=accessories">Accessories</Link></div>
    <div><p className="site-footer__kicker">SERVICE</p><Link to="/account">Account</Link><Link to="/wishlist">Wishlist</Link><Link to="/shop">Shipping & returns</Link><Link to="/contact">Contact studio</Link><Link to="/membership">Membership</Link></div>
    <div><p className="site-footer__kicker">FOLLOW</p><a href="https://instagram.com" target="_blank" rel="noreferrer"><span aria-hidden="true" style={{fontSize:14,fontWeight:700,lineHeight:1}}>@</span> Instagram</a><a href="mailto:studio@artcanvas.local"><Mail size={14}/> studio@artcanvas.local</a><span className="footer-place">DHAKA — WORLDWIDE</span></div>
  </div>
  <div className="footer-bottom"><span>© 2026 ARTCANVAS</span><span>CONSIDERED / INDEPENDENT / KEPT</span><span>PRIVACY · TERMS</span></div>
</footer>}
