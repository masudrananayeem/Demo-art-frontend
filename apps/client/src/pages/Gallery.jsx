import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { img } from "../data/products";
import { useStore } from "../context/StoreContext";
import { formatBDT, getOriginalPrice, hasActiveOffer } from "../lib/money";
import PageTransition from "../components/PageTransition";
import galleryHero from "../assets/clothing/gallery.jpg";

export default function Gallery() {
  const { dark, products } = useStore();
  const art = products.filter((p) => p.category === "art");

  return (
    <PageTransition>
      {/* Full-bleed editorial banner — sits outside the padded section so it
          naturally spans the page's full width (no 100vw/scrollbar quirks). */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative w-full overflow-hidden h-[280px] sm:h-[420px] lg:h-[560px]"
      >
        <img
          src={galleryHero}
          alt="ArtCanvas fashion editorial"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      </motion.div>

      <section className="px-6 pt-10 pb-24">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-12 max-w-xl">
            <p className="text-xs tracking-[0.25em] uppercase opacity-50 mb-3">The Gallery</p>
            <h1 className="font-display italic text-4xl sm:text-5xl font-black tracking-tight mb-4">Original works, hung the way they were meant to be seen.</h1>
            <p className="text-sm opacity-60">Each piece is signed, dated and released in a limited edition. Click a work to view materials, dimensions and the story behind it.</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-8">
            {art.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
              >
                <Link to={`/product/${a.id}`} className="group block">
                  <div className={`aspect-[4/5] overflow-hidden border-8 ${dark ? "border-white/5 bg-white/5" : "border-black/5 bg-white"} shadow-md group-hover:shadow-2xl transition-shadow duration-300`}>
                    <motion.img
                      src={a.image || img(a.seed, 700, 900)}
                      alt={a.name}
                      whileHover={{ scale: 1.06 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-4 flex justify-between items-start">
                    <div>
                      <p className="italic font-medium">{a.name}</p>
                      {a.subcategory && <p className="text-xs opacity-50">{a.subcategory}</p>}
                    </div>
                    {a.inStock === false && <span className="opacity-60 font-mono text-[10px] uppercase tracking-wide shrink-0 ml-3">Out of stock</span>}
                  </div>
                  <p className="font-mono text-sm mt-1">{hasActiveOffer(a) ? <><span className="line-through opacity-40 mr-2">{formatBDT(getOriginalPrice(a))}</span><span className="font-semibold text-[#A8431E]">{formatBDT(a.price)}</span></> : formatBDT(a.price)}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
