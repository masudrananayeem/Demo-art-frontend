import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Shirt, Sparkles, Gift, Palette, ChevronDown, X, SlidersHorizontal, ArrowUpRight, Users, Search, ArrowRight } from "lucide-react";
import PageTransition from "../components/PageTransition";
import ProductCard from "../components/ProductCard";
import { GENDERS, img } from "../data/products";
import { useStore } from "../context/StoreContext";
import { formatBDT } from "../lib/money";

const ICONS = { clothing: Shirt, art: Palette, objects: Package, accessories: Gift, gifts: Gift };
const SORTS = ["Featured", "Price: Low to High", "Price: High to Low", "Top Rated"];

export default function Shop() {
  const { dark, products, productsLoading, categories, subcategories } = useStore();
  const SHOP_PRODUCTS = products;
  const SHOP_CATEGORIES = categories;
  const MAX_PRICE = useMemo(() => (products.length ? Math.ceil(Math.max(...products.map((p) => p.price))) : 1000), [products]);
  const [params, setParams] = useSearchParams();
  const active = params.get("category") || "all";
  const gender = params.get("gender") || "all";
  const sub = params.get("sub") || "all";
  const search = params.get("search") || "";
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => { setSearchInput(search); }, [search]);
  const [sort, setSort] = useState("Featured");
  const [sortOpen, setSortOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1000);
  useEffect(() => { setMaxPrice(MAX_PRICE); }, [MAX_PRICE]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  const setActive = (id) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("category");
    else next.set("category", id);
    next.delete("sub");
    if (id !== "clothing") next.delete("gender");
    setParams(next);
  };
  const setGender = (id) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("gender");
    else next.set("gender", id);
    next.delete("sub");
    setParams(next);
  };
  const setSub = (id) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("sub");
    else next.set("sub", id);
    setParams(next);
  };
  const applySearch = (value) => {
    const term = value.trim();
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (term) {
        next.set("search", term);
        // A search should search the whole catalogue instead of silently
        // remaining trapped inside an old category/gender/price filter.
        next.delete("category");
        next.delete("gender");
        next.delete("sub");
      } else {
        next.delete("search");
      }
      return next;
    }, { replace: true });
  };
  const submitSearch = (e) => { e.preventDefault(); applySearch(searchInput); };
  const clearSearch = () => { setSearchInput(""); applySearch(""); };


  const availableSubs = gender !== "all" ? subcategories[gender] || [] : [];

  const searchTerm = search.trim().toLowerCase();
  const searchWords = searchTerm.split(/\s+/).filter(Boolean);
  const matchesSearch = (p) => {
    if (!searchWords.length) return true;
    const haystack = [p.id, p.name, p.description, p.category, p.subcategory, p.gender, p.material, p.story, p.seed]
      .filter((field) => field !== undefined && field !== null)
      .map(String)
      .join(" ")
      .toLowerCase();
    return searchWords.every((word) => haystack.includes(word));
  };

  const filtered = useMemo(() => {
    let list = active === "all" ? SHOP_PRODUCTS : active === "new" ? [...SHOP_PRODUCTS].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 8) : SHOP_PRODUCTS.filter((p) => p.category === active);
    if (gender !== "all") list = list.filter((p) => p.gender === gender || p.gender === "unisex");
    if (sub !== "all") list = list.filter((p) => p.subcategory === sub);
    if (!searchTerm) list = list.filter((p) => p.price <= maxPrice);
    if (searchTerm) list = list.filter(matchesSearch);
    list = [...list];
    if (sort === "Price: Low to High") list.sort((a, b) => a.price - b.price);
    if (sort === "Price: High to Low") list.sort((a, b) => b.price - a.price);
    if (sort === "Top Rated") list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [active, gender, sub, sort, maxPrice, searchTerm, SHOP_PRODUCTS]);

  // With no category, filter or search chosen, showing every product mixed
  // together in one long grid makes it impossible to tell what's clothing vs
  // art vs an accessory. In that "browse everything" state we instead group
  // pieces into their categories, each with its own heading and a link to
  // see the full category.
  const isBrowsingEverything = active === "all" && gender === "all" && sub === "all" && !searchTerm && maxPrice >= MAX_PRICE;
  const groupedByCategory = useMemo(() => {
    if (!isBrowsingEverything) return [];
    return SHOP_CATEGORIES.map((cat) => ({
      ...cat,
      items: SHOP_PRODUCTS.filter((p) => p.category === cat.id),
    })).filter((group) => group.items.length > 0);
  }, [isBrowsingEverything, SHOP_CATEGORIES, SHOP_PRODUCTS]);
  const CATEGORY_PREVIEW_COUNT = 8;

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  useEffect(() => {
    setPage(1);
  }, [active, gender, sub, sort, maxPrice, searchTerm]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedProducts = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );
  const pageStart = filtered.length ? (page - 1) * ITEMS_PER_PAGE + 1 : 0;
  const pageEnd = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  const activeFilterCount = (active !== "all" ? 1 : 0) + (gender !== "all" ? 1 : 0) + (sub !== "all" ? 1 : 0) + (maxPrice < MAX_PRICE ? 1 : 0) + (searchTerm ? 1 : 0);
  const clearFilters = () => {
    setSearchInput("");
    setMaxPrice(MAX_PRICE);
    setParams({}, { replace: true });
  };

  const SidebarContent = (
    <>
      <div>
        <p className="text-xs tracking-widest uppercase opacity-50 mb-3">Search</p>
        <form onSubmit={submitSearch} className="relative flex items-center">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-45" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search pieces…"
            className="w-full pl-9 pr-8 py-2 rounded-full border border-current/15 bg-transparent text-sm"
          />
          {searchInput && (
            <button type="button" onClick={clearSearch} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-45 hover:opacity-100">
              <X size={13} />
            </button>
          )}
        </form>
      </div>

      <div>
        <p className="text-xs tracking-widest uppercase opacity-50 mb-3">Category</p>
        <div className="space-y-1">
          <button
            onClick={() => setActive("all")}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-full text-sm transition ${
              active === "all" ? (dark ? "bg-[#EDE7D9] text-black" : "bg-black text-white") : "hover:bg-current/5"
            }`}
          >
            <span className="flex items-center gap-2"><Package size={14} /> All Product</span>
            <span className="text-[10px] opacity-70">{SHOP_PRODUCTS.length}</span>
          </button>
          {SHOP_CATEGORIES.map((c) => {
            const Icon = ICONS[c.id] || Sparkles;
            const count = SHOP_PRODUCTS.filter((p) => p.category === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-full text-sm transition ${
                  active === c.id ? (dark ? "bg-[#EDE7D9] text-black" : "bg-black text-white") : "hover:bg-current/5"
                }`}
              >
                <span className="flex items-center gap-2"><Icon size={14} /> {c.name}</span>
                <span className="text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs tracking-widest uppercase opacity-50 mb-3">Shop For</p>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGender(g.id)}
              className={`px-3 py-1.5 rounded-full text-xs border transition ${
                gender === g.id
                  ? dark
                    ? "bg-[#EDE7D9] text-black border-[#EDE7D9]"
                    : "bg-black text-white border-black"
                  : dark
                  ? "border-white/15 hover:bg-white/5"
                  : "border-black/15 hover:bg-black/5"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {availableSubs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="text-xs tracking-widest uppercase opacity-40 mt-4 mb-2">Sub-category</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSub("all")}
                  className={`px-3 py-1 rounded-full text-[11px] border transition ${sub === "all" ? (dark ? "bg-white/15 border-white/30" : "bg-black/10 border-black/20") : dark ? "border-white/10 opacity-70" : "border-black/10 opacity-70"}`}
                >
                  All
                </button>
                {availableSubs.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSub(s)}
                    className={`px-3 py-1 rounded-full text-[11px] border transition ${sub === s ? (dark ? "bg-white/15 border-white/30" : "bg-black/10 border-black/20") : dark ? "border-white/10 opacity-70" : "border-black/10 opacity-70"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <p className="text-xs tracking-widest uppercase opacity-50 mb-3">Max Price: {formatBDT(maxPrice)}</p>
        <input
          type="range"
          min={0}
          max={MAX_PRICE}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#A8431E]"
        />
      </div>

      <div className={`h-px ${dark ? "bg-white/10" : "bg-black/10"}`} />

      <Link to="/gallery" className={`group block border p-4 rounded-2xl transition ${dark ? "border-white/10 bg-white/[.03]" : "border-black/10 bg-white"}`}>
        <p className="text-[9px] tracking-[.2em] uppercase opacity-45 mb-2">Also in the studio</p>
        <div className="flex items-end justify-between gap-4"><span className="font-display italic text-2xl">Original art & editions</span><ArrowUpRight size={16} className="shrink-0 opacity-60 group-hover:translate-x-1 group-hover:-translate-y-1 transition" /></div>
      </Link>

      <div className="text-xs opacity-60 leading-relaxed">
        Every piece is studio-made in small batches. Limited editions are numbered on arrival.
      </div>
    </>
  );

  return (
    <PageTransition>
      <section className="px-6 pt-10 pb-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-[9px] tracking-[0.25em] uppercase opacity-50 mb-2">04 — The collection</p>
          <h1 className="font-display italic text-4xl sm:text-6xl font-black tracking-[-.04em]">The Collection</h1>
          <p className="max-w-2xl mt-4 text-sm opacity-55 leading-relaxed">Clothing is organized into <b>Women, Men and Children</b>, with dedicated sub-categories. Pick a person, then narrow the silhouette.</p>
        </div>
      </section>

      <section className="shop-category-strip px-6 pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-5 mb-4"><div><p className="text-[9px] tracking-[.25em] uppercase opacity-45">Browse the world</p><h2 className="font-display italic text-2xl sm:text-3xl font-bold mt-1">Shop by category</h2></div><span className="hidden sm:block text-[10px] opacity-45">{SHOP_PRODUCTS.length} pieces / {SHOP_CATEGORIES.length} categories</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <button onClick={() => setActive("all")} className={`shop-category-tile ${active === "all" ? "is-active" : ""}`}><span className="shop-category-tile__number">00</span><span>All pieces</span></button>
            <button onClick={() => setActive("new")} className={`shop-category-tile ${active === "new" ? "is-active" : ""}`}><img src={img("ac-new-in", 260, 180)} alt="New in" /><span>New in</span></button>
            {SHOP_CATEGORIES.map((c) => <button key={c.id} onClick={() => setActive(c.id)} className={`shop-category-tile ${active === c.id ? "is-active" : ""}`}><img src={img(c.seed || c.id, 260, 180)} alt="" /><span>{c.name}</span></button>)}
          </div>
        </div>
      </section>

      {active === "clothing" && (
        <section className="px-6 pb-8">
          <div className="max-w-6xl mx-auto border-y border-current/10 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><p className="text-[9px] tracking-[.25em] uppercase opacity-45">Clothing / Browse by</p><p className="font-display italic text-2xl font-bold mt-1">Women · Men · Children</p></div>
            <div className="flex flex-wrap gap-2">
              {GENDERS.filter(g => g.id !== "all").map(g => <Link key={g.id} to={`/shop?category=clothing&gender=${g.id}`} className="px-3 py-1.5 rounded-full border border-current/15 text-[10px] uppercase tracking-wider hover:bg-current/5 transition">{g.name}</Link>)}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar — desktop */}
          <aside className="space-y-6 hidden md:block">{SidebarContent}</aside>

          {/* Mobile filter bar */}
          <div className="md:hidden space-y-3">
            <form onSubmit={submitSearch} className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-45" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search pieces…"
                className="w-full pl-9 pr-8 py-2.5 rounded-full border border-current/15 bg-transparent text-sm"
              />
              {searchInput && (
                <button type="button" onClick={clearSearch} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 opacity-45 hover:opacity-100">
                  <X size={13} />
                </button>
              )}
            </form>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-6 px-6 no-scrollbar">
              <button
                onClick={() => setActive("all")}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs border ${active === "all" ? (dark ? "bg-[#EDE7D9] text-black border-[#EDE7D9]" : "bg-black text-white border-black") : dark ? "border-white/15" : "border-black/15"}`}
              >
                All
              </button>
              {SHOP_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs border ${active === c.id ? (dark ? "bg-[#EDE7D9] text-black border-[#EDE7D9]" : "bg-black text-white border-black") : dark ? "border-white/15" : "border-black/15"}`}
                >
                  {c.name}
                </button>
              ))}
              <Link to="/gallery" className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs border flex items-center gap-1 ${dark ? "border-white/15" : "border-black/15"}`}>
                <Sparkles size={11} /> Art
              </Link>
            </div>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs border ${dark ? "border-white/15" : "border-black/15"}`}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={13} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </span>
              <ChevronDown size={13} className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {filtersOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`overflow-hidden rounded-2xl border p-4 space-y-6 ${dark ? "border-white/10 bg-white/5" : "border-black/10 bg-white"}`}
                >
                  <div>
                    <p className="text-xs tracking-widest uppercase opacity-50 mb-3">Shop For</p>
                    <div className="flex flex-wrap gap-2">
                      {GENDERS.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => setGender(g.id)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition ${
                            gender === g.id ? (dark ? "bg-[#EDE7D9] text-black border-[#EDE7D9]" : "bg-black text-white border-black") : dark ? "border-white/15" : "border-black/15"
                          }`}
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                    {availableSubs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          onClick={() => setSub("all")}
                          className={`px-3 py-1 rounded-full text-[11px] border ${sub === "all" ? (dark ? "bg-white/15 border-white/30" : "bg-black/10 border-black/20") : dark ? "border-white/10 opacity-70" : "border-black/10 opacity-70"}`}
                        >
                          All
                        </button>
                        {availableSubs.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSub(s)}
                            className={`px-3 py-1 rounded-full text-[11px] border ${sub === s ? (dark ? "bg-white/15 border-white/30" : "bg-black/10 border-black/20") : dark ? "border-white/10 opacity-70" : "border-black/10 opacity-70"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs tracking-widest uppercase opacity-50 mb-3">Max Price: {formatBDT(maxPrice)}</p>
                    <input type="range" min={0} max={MAX_PRICE} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#A8431E]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Grid */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <p className="text-sm opacity-60">
                  {isBrowsingEverything ? SHOP_PRODUCTS.length : filtered.length} pieces
                  {searchTerm && ` · results for "${search}"`}
                </p>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100 underline underline-offset-4">
                    <X size={11} /> Clear filters
                  </button>
                )}
              </div>
              {!isBrowsingEverything && (
                <div className="relative">
                  <button
                    onClick={() => setSortOpen((s) => !s)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs border ${dark ? "border-white/15" : "border-black/15"}`}
                  >
                    {sort} <ChevronDown size={12} className={`transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {sortOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className={`absolute right-0 mt-2 w-48 rounded-xl border shadow-lg overflow-hidden z-10 ${dark ? "bg-[#1c1c1a] border-white/10" : "bg-white border-black/10"}`}
                      >
                        {SORTS.map((s) => (
                          <button
                            key={s}
                            onClick={() => { setSort(s); setSortOpen(false); }}
                            className={`block w-full text-left px-4 py-2 text-xs hover:bg-current/5 ${sort === s ? "font-semibold" : ""}`}
                          >
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {isBrowsingEverything ? (
              // Browsing with no category/filter/search chosen: group pieces by
              // category so it's always obvious which section you're looking at,
              // instead of one long mixed grid.
              <div className="space-y-14">
                {groupedByCategory.map((group) => {
                  const Icon = ICONS[group.id] || Sparkles;
                  const showing = group.items.slice(0, CATEGORY_PREVIEW_COUNT);
                  return (
                    <div key={group.id}>
                      <div className="flex items-end justify-between gap-4 mb-5 pb-3 border-b border-current/10">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className="opacity-60" />
                          <h3 className="font-display italic text-xl sm:text-2xl font-bold">{group.name}</h3>
                          <span className="text-[10px] opacity-45">{group.items.length} piece{group.items.length === 1 ? "" : "s"}</span>
                        </div>
                        {group.items.length > CATEGORY_PREVIEW_COUNT && (
                          <button onClick={() => setActive(group.id)} className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 underline underline-offset-4 shrink-0">
                            View all {group.name} <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 items-start">
                        {showing.map((p, i) => (
                          <motion.div key={p.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42, delay: Math.min(i * .035, .25) }}>
                            <ProductCard p={p} size="md" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {groupedByCategory.length === 0 && (
                  <p className="text-sm opacity-60 mt-10 text-center">{productsLoading ? "Loading pieces…" : "No pieces found yet."}</p>
                )}
              </div>
            ) : (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active + sort + gender + sub + maxPrice + searchTerm}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .35 }}
                    className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-12 items-start"
                  >
                    {paginatedProducts.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42, delay: Math.min(i * .035, .25) }}>
                        <ProductCard p={p} size="md" />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>

                {filtered.length > 0 && (
                  <nav className="shop-pagination" aria-label="Product pages">
                    <div className="shop-pagination__summary">
                      Showing {pageStart}–{pageEnd} of {filtered.length} pieces
                    </div>
                    <div className="shop-pagination__controls">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="Previous page"
                      >
                        Previous
                      </button>
                      <div className="shop-pagination__pages">
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                          <button
                            type="button"
                            key={number}
                            onClick={() => setPage(number)}
                            className={page === number ? "is-active" : ""}
                            aria-current={page === number ? "page" : undefined}
                          >
                            {String(number).padStart(2, "0")}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        aria-label="Next page"
                      >
                        Next
                      </button>
                    </div>
                  </nav>
                )}

                {filtered.length === 0 && <p className="text-sm opacity-60 mt-10 text-center">{productsLoading ? "Loading pieces…" : "No pieces found. Try adjusting your filters."}</p>}
              </>
            )}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
