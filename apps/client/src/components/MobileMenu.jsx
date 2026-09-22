import React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useStore } from "../context/StoreContext";

const BASE_LINKS = [
  { to: "/", label: "Home" },
  { to: "/shop?category=clothing", label: "Clothing" },
  { to: "/shop", label: "Shop" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/membership", label: "Membership" },
  { to: "/contact", label: "Contact" },
];

export default function MobileMenu({ open, onClose }) {
  const { dark, user, isAdmin } = useStore();
  const links = [
    ...BASE_LINKS,
    { to: "/account", label: user ? "Account" : "Sign in / Sign up" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
          className={`fixed inset-0 z-[110] flex flex-col items-center justify-center gap-8 text-3xl font-semibold ${dark ? "bg-[#111110] text-[#EDE7D9]" : "bg-[#FAF7F1] text-[#111110]"}`}
        >
          <button className="absolute top-6 right-6" onClick={onClose} aria-label="Close menu">
            <X size={26} />
          </button>
          {links.map((l, i) => (
            <motion.div
              key={l.to}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
            >
              <Link to={l.to} onClick={onClose}>{l.label}</Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
