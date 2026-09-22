import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Heart, ShoppingBag, Moon, Sun, Menu, ChevronDown, UserRound, ShieldCheck, X, ArrowRight } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { formatBDT, getOriginalPrice, hasActiveOffer } from "../lib/money";
import { img } from "../data/products";

const people = [
  ["Women", "women", "Dresses · Outerwear · Tops"],
  ["Men", "men", "Shirts · Outerwear · Trousers"],
  ["Children", "kids", "Tees · Outerwear · Sets"],
];

const navClass = ({ isActive }) => `nav-link ${isActive ? "is-active" : ""}`;

function SearchOverlay({ open, onClose }) {
  const { products, productsLoading } = useStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const normalized = query.trim().toLowerCase();
  const terms = normalized.split(/\s+/).filter(Boolean);
  const searchable = (p) => [
    p.id,
    p.name,
    p.description,
    p.category,
    p.subcategory,
    p.gender,
    p.material,
    p.story,
    p.seed,
  ].filter((v) => v !== undefined && v !== null).map(String).join(" ").toLowerCase();

  const results = terms.length
    ? products.filter((p) => {
        const haystack = searchable(p);
        return terms.every((term) => haystack.includes(term));
      }).slice(0, 8)
    : [];

  const clearInput = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const close = () => {
    setQuery("");
    onClose();
  };

  const goToResults = () => {
    const term = query.trim();
    if (!term) return;
    onClose();
    navigate(`/shop?search=${encodeURIComponent(term)}`, { replace: location.pathname === "/shop" });
  };

  const goToProduct = (id) => {
    onClose();
    navigate(`/product/${id}`);
  };

  if (!open) return null;

  const overlay = (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[9999]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ pointerEvents: "auto" }}>
        <button type="button" aria-label="Close search" className="absolute inset-0 w-full h-full bg-black/45 backdrop-blur-sm cursor-default" onClick={close} />
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-[10vh] w-[min(560px,calc(100vw-32px))] rounded-2xl border border-black/10 bg-white text-[#141413] shadow-2xl overflow-hidden"
        >
          <form onSubmit={(e) => { e.preventDefault(); goToResults(); }} className="flex items-center gap-3 px-5 py-4 border-b border-black/10">
            <Search size={17} className="opacity-50 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clothing, art, objects…"
              autoComplete="off"
              className="flex-1 min-w-0 outline-0 bg-transparent text-sm"
            />
            {query && (
              <button type="button" onClick={clearInput} aria-label="Clear search text" title="Clear text" className="opacity-50 hover:opacity-100 shrink-0">
                <X size={17} />
              </button>
            )}
            <button type="button" onClick={close} aria-label="Close search" title="Close search" className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 shrink-0">
              <X size={16} />
            </button>
          </form>

          {normalized && (
            <div className="max-h-[55vh] overflow-y-auto">
              {productsLoading ? (
                <p className="px-5 py-8 text-center text-sm opacity-55">Loading pieces…</p>
              ) : results.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm opacity-70">No pieces match “{query.trim()}”.</p>
                  <button type="button" onClick={goToResults} className="mt-4 text-xs font-semibold uppercase tracking-wider underline underline-offset-4">Open full search</button>
                </div>
              ) : (
                <>
                  {results.map((p) => (
                    <button type="button" key={p.id} onClick={() => goToProduct(p.id)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-black/[.04] text-left transition">
                      <img src={p.image || img(p.seed || p.id, 100, 130)} alt="" className="w-10 h-12 object-cover rounded-md shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{p.name}</span>
                        <span className="block text-[11px] opacity-50 capitalize">{p.category === "clothing" ? p.gender : p.category}{p.subcategory ? ` · ${p.subcategory}` : ""}</span>
                      </span>
                      <span className="font-mono text-xs opacity-70 shrink-0">{hasActiveOffer(p) ? <><span className="line-through opacity-40 mr-1">{formatBDT(getOriginalPrice(p))}</span>{formatBDT(p.price)}</> : formatBDT(p.price)}</span>
                    </button>
                  ))}
                  <button type="button" onClick={goToResults} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider border-t border-black/10 hover:bg-black/[.04] transition">
                    See all results for “{query.trim()}” <ArrowRight size={13} />
                  </button>
                </>
              )}
            </div>
          )}
          {!normalized && <p className="px-5 py-8 text-center text-xs opacity-45">Start typing to search the collection.</p>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(overlay, document.body) : null;
}

export default function Navbar({ onMenu }) {
  const { dark, setDark, cartCount, wishlist, setCartOpen, isAdmin, user, subcategories } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [clothingOpen, setClothingOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const shopFor = (gender, sub) => navigate(`/shop?category=clothing&gender=${gender}&sub=${encodeURIComponent(sub)}`);
  const tone = dark ? "nav-surface nav-surface--dark" : "nav-surface";

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className={tone}>
        <div className="nav-layout">
          <div className="nav-mobile-trigger">
            <button className="nav-icon" onClick={onMenu} aria-label="Open menu"><Menu size={19} /></button>
          </div>

          <nav className="nav-primary" aria-label="Primary navigation">
            <NavLink to="/" className={navClass}>Home</NavLink>
            <div className="nav-dropdown-wrap" onMouseEnter={() => setClothingOpen(true)} onMouseLeave={() => setClothingOpen(false)}>
              <button className={`nav-link nav-link--button ${clothingOpen ? "is-open" : ""}`} onClick={() => navigate("/shop?category=clothing")}>
                Clothing <ChevronDown size={12} />
              </button>
              <AnimatePresence>
                {clothingOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: .22 }} className={`clothing-menu ${dark ? "clothing-menu--dark" : ""}`}>
                    {people.map(([label, id, desc], index) => (
                      <div key={id} className="clothing-menu__group">
                        <div className="clothing-menu__heading">
                          <div><strong>{label}</strong><span>{desc}</span></div>
                          <small>0{index + 1}</small>
                        </div>
                        <NavLink to={`/shop?category=clothing&gender=${id}`} className="clothing-menu__all">All {label}</NavLink>
                        {(subcategories[id] || []).map((sub) => <button key={sub} onClick={() => shopFor(id, sub)}>{sub}</button>)}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <NavLink to="/shop" className={navClass}>Shop</NavLink>
          </nav>

          <NavLink to="/" className="brand-lockup" aria-label="ArtCanvas home">
            <span>Art</span><b>Canvas</b>
          </NavLink>

          <div className="nav-right">
            <nav className="nav-secondary" aria-label="Secondary navigation">
              <NavLink to="/gallery" className={navClass}>Gallery</NavLink>
              <NavLink to="/about" className={navClass}>About</NavLink>
           
            <NavLink to="/contact" className={navClass}>Contact</NavLink>
            </nav>
            <div className="nav-actions">
              <button className="nav-icon nav-search" onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={17} /></button>
              {isAdmin && <button className="nav-icon" onClick={() => navigate("/admin")} aria-label="Admin dashboard"><ShieldCheck size={17} /></button>}
              <button className="nav-icon" onClick={() => navigate("/account")} aria-label="Account">{user?.photoURL ? <img src={user.photoURL} alt="" className="w-[17px] h-[17px] rounded-full object-cover" /> : <UserRound size={17} />}</button>
              <button className="nav-icon nav-badge" onClick={() => navigate("/wishlist")} aria-label="Wishlist"><Heart size={17} />{wishlist.size > 0 && <span>{wishlist.size}</span>}</button>
              <button className="nav-icon nav-badge" onClick={() => setCartOpen(true)} aria-label="Bag"><ShoppingBag size={17} />{cartCount > 0 && <span>{cartCount}</span>}</button>
              <motion.button whileTap={{ scale: .88, rotate: 180 }} className="nav-icon nav-theme" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">{dark ? <Sun size={15} /> : <Moon size={15} />}</motion.button>
            </div>
          </div>
        </div>
      </div>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
