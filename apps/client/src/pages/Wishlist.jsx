import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import PageTransition from "../components/PageTransition";
import BentoGrid from "../components/BentoGrid";
import { useStore } from "../context/StoreContext";

export default function Wishlist() {
  const { wishlist, products } = useStore();
  const items = products.filter((p) => wishlist.has(p.id));

  return (
    <PageTransition>
      <section className="px-6 pt-10 pb-24">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display italic text-4xl font-black tracking-tight mb-2">Your Wishlist</h1>
          <p className="text-sm opacity-60 mb-10">{items.length} saved piece{items.length !== 1 ? "s" : ""}</p>

          {items.length === 0 ? (
            <div className="text-center py-24">
              <Heart size={40} className="mx-auto mb-4 opacity-30" />
              <p className="opacity-60 mb-6">Nothing saved yet — tap the heart on any piece to keep it here.</p>
              <Link to="/shop" className="inline-block px-6 py-3 rounded-full text-xs font-semibold tracking-wider uppercase bg-black text-white">
                Browse the Shop
              </Link>
            </div>
          ) : (
            <BentoGrid products={items} />
          )}
        </div>
      </section>
    </PageTransition>
  );
}
