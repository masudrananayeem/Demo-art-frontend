import React from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useStore } from "../context/StoreContext";

export default function ScrollProgress() {
  const { dark } = useStore();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });

  return (
    <motion.div
      style={{ scaleX }}
      className={`fixed top-0 left-0 right-0 h-[3px] origin-left z-[200] ${dark ? "bg-[#EDE7D9]" : "bg-[#A8431E]"}`}
    />
  );
}
