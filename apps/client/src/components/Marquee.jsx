import React from "react";
import { Sparkles } from "lucide-react";
import { useStore } from "../context/StoreContext";

const ITEMS = ["NEW ARRIVALS", "ARTIST DROPS", "FREE SHIPPING $150+", "LIMITED EDITIONS", "STUDIO MADE"];

export default function Marquee() {
  const { dark } = useStore();
  return (
    <div
      className={`relative overflow-hidden border-y py-2.5 ${
        dark ? "border-white/10 bg-gradient-to-r from-[#1a1a18] via-[#111110] to-[#1a1a18] text-[#EDE7D9]" : "border-black/10 bg-gradient-to-r from-black via-[#1c1c1a] to-black text-white"
      }`}
    >
      {/* fade masks so the loop feels seamless at the edges */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-24 z-10 bg-gradient-to-r ${dark ? "from-[#1a1a18]" : "from-black"} to-transparent`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-24 z-10 bg-gradient-to-l ${dark ? "from-[#1a1a18]" : "from-black"} to-transparent`} />

      <div className="flex whitespace-nowrap animate-[marquee_26s_linear_infinite] hover:[animation-play-state:paused]">
        {[...ITEMS, ...ITEMS, ...ITEMS].map((m, i) => (
          <span key={i} className="mx-5 sm:mx-7 text-[10px] sm:text-xs tracking-[0.25em] uppercase flex items-center gap-5 sm:gap-7 font-medium">
            {m} <Sparkles size={11} className="opacity-50 shrink-0" />
          </span>
        ))}
      </div>
    </div>
  );
}
