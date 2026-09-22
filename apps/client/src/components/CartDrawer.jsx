import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { img } from "../data/products";
import { useStore } from "../context/StoreContext";
import { formatBDT } from "../lib/money";

export default function CartDrawer() {
  const { dark, cart, cartOpen, setCartOpen, removeFromCart, updateQty, subtotal, user } = useStore();
  const navigate = useNavigate();

  const goToCheckout = () => {
    setCartOpen(false);
    navigate(user ? "/checkout" : "/account?next=/checkout");
  };

  return (
    <AnimatePresence>
      {cartOpen && (
        <motion.div className="fixed inset-0 z-[105]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute right-0 top-0 h-full w-full sm:w-[400px] p-6 flex flex-col ${dark ? "bg-[#111110] text-[#EDE7D9]" : "bg-white text-[#111110]"}`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg tracking-[0.1em] uppercase">Your Bag</h3>
              <button onClick={() => setCartOpen(false)}>
                <X size={18} />
              </button>
            </div>
            {cart.length === 0 ? (
              <p className="text-sm opacity-60 mt-10 text-center">Your bag is empty. Go find something worth keeping.</p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4">
                <AnimatePresence>
                  {cart.map((i) => (
                    <motion.div
                      key={i.cartKey || i.id}
                      layout
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      className="flex gap-3 border-b border-current/10 pb-4"
                    >
                      <Link to={`/product/${i.id}`} onClick={() => setCartOpen(false)} className="w-16 h-20 shrink-0 rounded-md overflow-hidden block">
                        <img src={i.image || img(i.seed, 100, 130)} alt={i.name} className="w-full h-full object-cover transition-transform hover:scale-105" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${i.id}`} onClick={() => setCartOpen(false)} className="text-sm hover:underline">{i.name}</Link>{i.size && <span className="block text-[10px] opacity-50 mt-0.5">Size: {i.size}</span>}
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={() => updateQty(i.cartKey || i.id, i.qty - 1)} className="w-5 h-5 border border-current/20 rounded flex items-center justify-center">
                            <Minus size={10} />
                          </button>
                          <span className="text-xs">{i.qty}</span>
                          <button onClick={() => updateQty(i.cartKey || i.id, i.qty + 1)} className="w-5 h-5 border border-current/20 rounded flex items-center justify-center">
                            <Plus size={10} />
                          </button>
                        </div>
                        <span className="font-mono text-sm">{formatBDT(i.price * i.qty)}</span>
                      </div>
                      <button onClick={() => removeFromCart(i.cartKey || i.id)} className="text-xs opacity-50 hover:opacity-100">
                        Remove
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            <div className="pt-4 border-t border-current/10">
              <div className="flex justify-between text-sm mb-4">
                <span>Subtotal</span>
                <span className="font-mono">{formatBDT(subtotal)}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={cart.length === 0}
                onClick={goToCheckout}
                className={`w-full h-11 text-xs tracking-[0.2em] uppercase rounded-full disabled:opacity-40 flex items-center justify-center gap-2 ${dark ? "bg-[#EDE7D9] text-black" : "bg-black text-white"}`}
              >
                {user ? "Checkout" : "Sign in to checkout"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
