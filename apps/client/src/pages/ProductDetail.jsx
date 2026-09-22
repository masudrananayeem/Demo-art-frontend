import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Star, Plus, Minus, Share2, Truck, X } from "lucide-react";
import PageTransition from "../components/PageTransition";
import BentoGrid from "../components/BentoGrid";
import Reveal from "../components/Reveal";
import { img } from "../data/products";
import { useStore } from "../context/StoreContext";
import { formatBDT, getOriginalPrice, hasActiveOffer, getOfferPercent } from "../lib/money";

export default function ProductDetail() {
  const { id } = useParams();
  const { dark, wishlist, toggleWishlist, addToBag, products, productsLoading } = useStore();
  const product = products.find((p) => p.id === id);
  const [qty, setQty] = useState(1);
  const gallery = useMemo(() => {
    const list = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
    if (product?.image && !list.includes(product.image)) list.unshift(product.image);
    return list.length ? list.slice(0, 8) : [product?.image || img(product?.seed, 800, 1000)];
  }, [product]);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const sizes = Array.isArray(product?.sizes) ? product.sizes.filter(s => s?.size) : [];
  const selectedSizeData = sizes.find((s) => String(s.size) === selectedSize);
  const selectedAvailable = selectedSizeData ? Math.max(0, Number(selectedSizeData.stock) || 0) : 0;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setQty(1);
    setActiveImage(0);
    setSelectedSize("");
    setLightboxOpen(false);
  }, [id]);

  if (!product) {
    if (productsLoading) return <main className="px-6 py-32 text-center text-sm opacity-60">Loading…</main>;
    return <Navigate to="/shop" replace />;
  }

  const wished = wishlist.has(product.id);
  const relatedItems = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);

  return (
    <PageTransition>
      <section className="px-6 pt-10 pb-20">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs opacity-50 mb-8">
            <Link to="/shop" className="hover:underline">Shop</Link> / <Link to={`/shop?category=${product.category}`} className="hover:underline capitalize">{product.category}</Link> / <span className="opacity-80">{product.name}</span>
          </p>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="grid md:grid-cols-[minmax(0,1fr)_82px] gap-3 items-start min-w-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-xl bg-current/5 cursor-zoom-in group"
              onClick={() => setLightboxOpen(true)}
              title="Click to view full screen"
            >
              <img src={gallery[activeImage]} alt={`${product.name} view ${activeImage + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.12]" />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 text-white px-3 py-1.5 text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Click to enlarge</span>
            </motion.div>
            {gallery.length > 1 && <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
              {gallery.map((src, index) => (
                <button type="button" key={`${src}-${index}`} onClick={() => setActiveImage(index)} className={`shrink-0 w-16 h-20 md:w-[76px] md:h-[92px] rounded-xl overflow-hidden border ${index === activeImage ? "border-current" : "border-current/10"}`} aria-label={`View image ${index + 1}`}>
                  <img src={src} alt="" className="w-full h-full object-cover"/>
                </button>
              ))}
            </div>}
            </div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
              <p className="text-xs tracking-[0.25em] uppercase opacity-50 mb-2">{product.category}</p>
              <h1 className="font-display italic text-3xl sm:text-4xl font-black tracking-tight mb-3">{product.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < Math.round(product.rating) ? "fill-amber-500 text-amber-500" : "opacity-30"} />
                  ))}
                </div>
                <span className="text-xs opacity-60">{product.rating} ({product.reviews} reviews)</span>
              </div>
              <div className="font-mono text-2xl mb-1">
                {hasActiveOffer(product) ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="line-through opacity-40 text-base">{formatBDT(getOriginalPrice(product))}</span>
                    <span className="font-semibold text-[#A8431E]">{formatBDT(product.price)}</span>
                    <span className="text-[9px] uppercase tracking-[0.18em] rounded-full border border-[#A8431E]/25 px-2 py-1 text-[#A8431E]">{getOfferPercent(product)}% OFF</span>
                  </div>
                ) : <span>{formatBDT(product.price)}</span>}
              </div>
              {product.productCode && <p className="text-[10px] uppercase tracking-widest opacity-45 mb-5">Product code: {product.productCode}</p>}
              {product.description && <p className="text-sm opacity-75 leading-relaxed mb-6 max-w-md">{product.description}</p>}

              <div className="space-y-2 text-xs opacity-70 mb-6 max-w-md">
                <div className="flex justify-between border-t border-current/10 py-2"><span>Category</span><span className="capitalize">{product.category}</span></div>
                {product.subcategory && <div className="flex justify-between border-t border-current/10 py-2"><span>{product.category === "art" ? "Medium" : "Style"}</span><span>{product.subcategory}</span></div>}
                {sizes.length > 0 && <div className="flex justify-between border-t border-current/10 py-2"><span>Available sizes</span><span>{sizes.map((s) => `${s.size} (${Math.max(0, Number(s.stock) || 0)})`).join(" · ")}</span></div>}
                <div className="flex justify-between border-t border-current/10 py-2 border-b"><span className="flex items-center gap-1"><Truck size={12}/> Shipping</span><span>5–8 business days</span></div>
              </div>

              {sizes.length > 0 && (
                <div className="mb-6 max-w-md">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs tracking-[0.18em] uppercase font-semibold">Select size</span>
                    {selectedSize && <span className={`text-[10px] uppercase tracking-wider ${selectedAvailable > 0 ? "text-emerald-700" : "text-[#A8431E]"}`}>{selectedAvailable > 0 ? `${selectedAvailable} available` : "Sold out"}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((item) => {
                      const available = Math.max(0, Number(item.stock) || 0);
                      const value = String(item.size);
                      const selected = selectedSize === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={available <= 0}
                          onClick={() => { setSelectedSize(value); setQty(1); }}
                          className={`min-w-14 px-4 py-2.5 rounded-full border text-xs font-semibold transition ${selected ? (dark ? "bg-[#EDE7D9] text-black border-[#EDE7D9]" : "bg-black text-white border-black") : dark ? "border-white/20 hover:bg-white/5" : "border-black/15 hover:bg-black/5"} ${available <= 0 ? "opacity-30 line-through cursor-not-allowed" : ""}`}
                        >
                          <span>{value}</span><span className="block text-[8px] mt-0.5 opacity-60">{available > 0 ? `${available} left` : "Sold out"}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!selectedSize && <p className="text-[10px] opacity-50 mt-2">Choose your size before adding this clothing item to the bag.</p>}
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center border border-current/20 rounded-full overflow-hidden">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-current/5" aria-label="Decrease quantity"><Minus size={13} /></button>
                  <span className="w-8 text-center text-sm">{qty}</span>
                  <button onClick={() => setQty((q) => selectedSizeData ? Math.min(selectedAvailable, q + 1) : q + 1)} disabled={!!selectedSizeData && qty >= selectedAvailable} className="w-10 h-10 flex items-center justify-center hover:bg-current/5 disabled:opacity-30" aria-label="Increase quantity"><Plus size={13} /></button>
                </div>
                <motion.button
                  whileHover={{ scale: product.inStock === false ? 1 : 1.03 }}
                  whileTap={{ scale: product.inStock === false ? 1 : 0.97 }}
                  onClick={() => product.inStock !== false && (!sizes.length || (selectedSize && selectedAvailable > 0)) && addToBag(product, Math.min(qty, selectedSizeData ? selectedAvailable : qty), selectedSize)}
                  disabled={product.inStock === false || (sizes.length > 0 && (!selectedSize || selectedAvailable <= 0))}
                  className={`flex-1 h-11 rounded-full text-xs tracking-[0.2em] uppercase font-semibold ${product.inStock === false ? "opacity-40 cursor-not-allowed" : ""} ${dark ? "bg-[#EDE7D9] text-black" : "bg-black text-white"}`}
                >
                  {product.inStock === false ? "Out of Stock" : sizes.length > 0 && !selectedSize ? "Select a Size" : "Add to Bag"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => toggleWishlist(product.id)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center border ${dark ? "border-white/20" : "border-black/15"}`}
                >
                  <Heart size={16} className={wished ? "fill-[#A8431E] text-[#A8431E]" : ""} />
                </motion.button>
                <button onClick={async () => { const shareData = { title: product.name, text: `Check out ${product.name} on ArtCanvas`, url: window.location.href }; try { if (navigator.share) await navigator.share(shareData); else { await navigator.clipboard.writeText(window.location.href); alert("Product link copied to clipboard."); } } catch (e) { if (e?.name !== "AbortError") { try { await navigator.clipboard.writeText(window.location.href); alert("Product link copied to clipboard."); } catch {} } } }} className={`w-11 h-11 rounded-full flex items-center justify-center border ${dark ? "border-white/20" : "border-black/15"}`} aria-label="Share product" title="Share product">
                  <Share2 size={16} />
                </button>
              </div>
            </motion.div>
          </div>

          {lightboxOpen && <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxOpen(false)}><button type="button" onClick={() => setLightboxOpen(false)} className="absolute top-5 right-5 w-11 h-11 rounded-full border border-white/20 text-white flex items-center justify-center" aria-label="Close image"><X size={20}/></button><img src={gallery[activeImage]} alt={product.name} onClick={e => e.stopPropagation()} className="max-h-[92vh] max-w-[94vw] object-contain" /></div>}

          {relatedItems.length > 0 && (
            <div className="mt-24">
              <Reveal>
                <h2 className="font-display italic text-2xl font-black tracking-tight mb-6">You might also like</h2>
              </Reveal>
              <BentoGrid products={relatedItems} pattern={[1, 1, 1, 1]} />
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
