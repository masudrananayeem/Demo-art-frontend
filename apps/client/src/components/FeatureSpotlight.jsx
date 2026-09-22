import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Star } from "lucide-react";
import { img } from "../data/products";
import { useStore } from "../context/StoreContext";
import { formatBDT, getOriginalPrice, hasActiveOffer } from "../lib/money";

export default function FeatureSpotlight({ products = [] }) {
  const { dark } = useStore();
  const items = products.slice(0, 4);

  return (
    <section className="relative px-6 py-20 sm:py-28 overflow-hidden">
      {/* decorative floating blobs for aesthetic depth */}
      <motion.div
        aria-hidden
        animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className={`pointer-events-none absolute -top-10 right-[6%] w-56 h-56 sm:w-72 sm:h-72 rounded-full blur-3xl opacity-30 ${dark ? "bg-[#A8431E]" : "bg-[#A8431E]"}`}
      />
      <motion.div
        aria-hidden
        animate={{ y: [0, 16, 0], x: [0, -12, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className={`pointer-events-none absolute bottom-0 left-[4%] w-40 h-40 sm:w-56 sm:h-56 rounded-full blur-3xl opacity-20 ${dark ? "bg-[#EDE7D9]" : "bg-black"}`}
      />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 sm:mb-16 max-w-xl"
        >
          <p className="text-xs tracking-[0.25em] uppercase opacity-50 mb-3 flex items-center gap-2">
            <Star size={12} className="fill-current" /> Studio Spotlight
          </p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[0.95]">
            PIECES WORTH
            <br />
            SCROLLING FOR
          </h2>
        </motion.div>

        <div className="space-y-16 sm:space-y-24">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: 120, rotate: 2 }}
              whileInView={{ opacity: 1, x: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`grid sm:grid-cols-2 gap-6 sm:gap-10 items-center ${i % 2 === 1 ? "sm:[direction:rtl]" : ""}`}
            >
              <div className="sm:[direction:ltr] relative">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="aspect-[4/3] sm:aspect-[5/4] rounded-2xl overflow-hidden shadow-2xl"
                >
                  <img src={p.image || img(p.seed, 800, 640)} alt={p.name} className="w-full h-full object-cover" />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className={`absolute -bottom-4 left-4 sm:left-6 px-4 py-2 rounded-full text-xs font-mono shadow-lg ${dark ? "bg-[#EDE7D9] text-black" : "bg-black text-white"}`}
                >
                  {hasActiveOffer(p) ? `${formatBDT(getOriginalPrice(p))} → ${formatBDT(p.price)}` : formatBDT(p.price)}
                </motion.span>
              </div>

              <div className="sm:[direction:ltr]">
                <p className="text-[11px] tracking-[0.25em] uppercase opacity-50 mb-3">{p.category}</p>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">{p.name}</h3>
                <p className="text-sm opacity-70 leading-relaxed mb-5 max-w-sm">{p.story}</p>
                <Link
                  to={`/product/${p.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase underline underline-offset-4 group"
                >
                  View Piece
                  <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
