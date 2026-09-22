import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useStore } from "./context/StoreContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MobileMenu from "./components/MobileMenu";
import CartDrawer from "./components/CartDrawer";
import ScrollProgress from "./components/ScrollProgress";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import Wishlist from "./pages/Wishlist";
import NotFound from "./pages/NotFound";
import Account from "./pages/Account";
import Checkout from "./pages/Checkout";
import Contact from "./pages/Contact";
import Membership from "./pages/Membership";
import AdminRedirect from "./components/AdminRedirect";
import ChatWidget from "./components/ChatWidget";
import ScrollToTop from "./components/ScrollToTop";

export default function App() {
  const { dark } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className={`app-shell min-h-screen font-sans transition-colors duration-500 ${dark ? "theme-dark bg-[#111110] text-[#EDE7D9]" : "theme-light bg-[#FAF7F1] text-[#111110]"}`}>
      <ScrollProgress />
      <ScrollToTop />
      <Navbar onMenu={() => setMenuOpen(true)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/about" element={<About />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/account" element={<Account />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/admin" element={<AdminRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>

      <Footer />
      <ChatWidget />
      <CartDrawer />
    </div>
  );
}
