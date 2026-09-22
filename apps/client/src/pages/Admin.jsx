import React,{useState}from"react";
import{Home as HomeIcon,LayoutGrid,MessageCircle,ShoppingBag,Tag,Users}from"lucide-react";
import PageTransition from"../components/PageTransition";
import AdminProducts from"../components/admin/AdminProducts";
import AdminCategories from"../components/admin/AdminCategories";
import AdminSubcategories from"../components/admin/AdminSubcategories";
import AdminOrders from"../components/admin/AdminOrders";
import AdminMessages from"../components/admin/AdminMessages";
import AdminHome from"../components/admin/AdminHome";

const TABS=[
 {id:"products",label:"Products",icon:LayoutGrid},
 {id:"categories",label:"Categories",icon:Tag},
 {id:"subcategories",label:"Sub-categories",icon:Users},
 {id:"orders",label:"Orders",icon:ShoppingBag},
 {id:"messages",label:"Messages",icon:MessageCircle},
 {id:"home",label:"Home",icon:HomeIcon},
];

export default function Admin(){const[tab,setTab]=useState("products");return <PageTransition><main className="px-6 pt-10 pb-24"><div className="max-w-5xl mx-auto"><p className="section-kicker">ARTCANVAS / ADMIN</p><h1 className="font-display italic text-3xl sm:text-4xl font-black tracking-tight mb-2">Studio dashboard</h1><p className="text-sm opacity-60 mb-8">Manage products, categories, sub-categories, orders, customer inbox and homepage content from separate control panels.</p><div className="flex gap-2 mb-8 flex-wrap">{TABS.map(t=>{const Icon=t.icon;return <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2 rounded-full text-xs font-semibold uppercase flex items-center gap-1.5 ${tab===t.id?"bg-black text-white":"border border-current/15"}`}><Icon size={12}/>{t.label}</button>})}</div>{tab==="products"&&<AdminProducts/>}{tab==="categories"&&<AdminCategories/>}{tab==="subcategories"&&<AdminSubcategories/>}{tab==="orders"&&<AdminOrders/>}{tab==="messages"&&<AdminMessages/>}{tab==="home"&&<AdminHome/>}</div></main></PageTransition>}
