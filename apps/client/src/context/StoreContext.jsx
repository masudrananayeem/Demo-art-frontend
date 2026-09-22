import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { api } from "../lib/api";

const StoreContext = createContext(null);

const EMPTY_SITE_CONTENT = { heroImage: "", manifestoImage: "", heroHeadline: "", heroTagline: "", heroTopLeft: "ARTCANVAS / NEW SEASON", heroTopRight: "DROP 04 — 2026", heroCtaLabel: "Explore the collection", heroCtaLink: "/shop?category=clothing", heroCtaNote: "Designed in small runs.\nMade to be kept.", heroBottomLeft: "01", heroBottomRight: "EST. 2026", filmTitle: "Clothing in motion.", filmDescription: "A moving study of fabric, proportion and everyday gesture.", filmVideoUrl: "", showWhatsNew: true, showFilm: true, showManifesto: true, showAnnouncement: false, announcementText: "", featuredTitle: "Currently interesting.", featuredDescription: "", whatsNewTitle: "What’s new.", whatsNewDescription: "Fresh pieces, new proportions and objects worth noticing." };

export function StoreProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem("artcanvas_cart_v1");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState(new Set());
  const [cartOpen, setCartOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [siteContent, setSiteContent] = useState(EMPTY_SITE_CONTENT);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({ women: [], men: [], kids: [] });

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // { name, phone, photoURL, address, admin }
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.body.style.background = dark ? "#0d0d0c" : "#f4f1eb";
    document.body.style.color = dark ? "#EDE7D9" : "#141413";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  const refreshProducts = useCallback(async () => {
    try {
      const list = await api.getProducts();
      setProducts(list);
      // Keep already-open carts in sync with server-side offer activation/expiry.
      setCart((current) => current.map((item) => {
        const fresh = list.find((p) => String(p.id) === String(item.id));
        return fresh
          ? { ...item, price: fresh.price, originalPrice: fresh.originalPrice, offerEnabled: fresh.offerEnabled, offerActive: fresh.offerActive, offerPrice: fresh.offerPrice, offerStartAt: fresh.offerStartAt, offerEndAt: fresh.offerEndAt }
          : item;
      }));
    } catch (e) {
      console.error("Failed to load products", e);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const refreshSiteContent = useCallback(async () => {
    try {
      const content = await api.getSiteContent();
      setSiteContent({ ...EMPTY_SITE_CONTENT, ...content });
    } catch (e) {
      console.error("Failed to load site content", e);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const list = await api.getCategories();
      setCategories(list);
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  }, []);

  const refreshSubcategories = useCallback(async () => {
    try {
      const detailed = await api.getSubcategories();
      const flat = {};
      for (const gender of Object.keys(detailed)) flat[gender] = detailed[gender].map((s) => s.name);
      setSubcategories(flat);
    } catch (e) {
      console.error("Failed to load sub-categories", e);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
    refreshSiteContent();
    refreshCategories();
    refreshSubcategories();
  }, [refreshProducts, refreshSiteContent, refreshCategories, refreshSubcategories]);

  const refreshMyProfile = useCallback(async () => {
    try {
      const me = await api.me();
      setProfile(me);
      setIsAdmin(!!me.admin);
    } catch (e) {
      console.error("Failed to load profile", e);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const token = await fbUser.getIdTokenResult(true).catch(() => null);
        setIsAdmin(!!token?.claims?.admin);
        refreshMyProfile();
      } else {
        setIsAdmin(false);
        setProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, [refreshMyProfile]);

  const user = firebaseUser
    ? {
        uid: firebaseUser.uid,
        name: profile?.name || firebaseUser.displayName || firebaseUser.email,
        email: firebaseUser.email,
        phone: profile?.phone || "",
        photoURL: profile?.photoURL || firebaseUser.photoURL || "",
        address: profile?.address || null,
      }
    : null;

  const updateMyProfile = async (patch) => {
    const saved = await api.updateMe(patch);
    setProfile(saved);
    if (patch.name && firebaseUser) {
      updateProfile(firebaseUser, { displayName: patch.name }).catch(() => {});
    }
    return saved;
  };

  const clearAuthError = () => setAuthError(null);

  const signUpWithEmail = async (name, email, password) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      if (name) await api.updateMe({ name }).catch(() => {});
      return true;
    } catch (e) {
      setAuthError(friendlyAuthError(e));
      return false;
    }
  };

  const signInWithEmail = async (email, password) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (e) {
      setAuthError(friendlyAuthError(e));
      return false;
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (e) {
      setAuthError(friendlyAuthError(e));
      return false;
    }
  };

  const signOut = () => firebaseSignOut(auth);

  // Real messaging, backed by the /api/messages endpoints. The client's whole
  // conversation with the studio lives in Firestore, keyed by their uid, so
  // an admin can find and reply to it from the Messages tab.
  const refreshMessages = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const list = await api.myMessages();
      setChatMessages(Array.isArray(list) ? list : []);
      setChatError(null);
    } catch (e) {
      // Do not make a temporary Firestore quota/rate-limit error look like a
      // broken chat. The next refresh will retry automatically.
      const message = String(e?.message || "");
      if (/429|quota exceeded|resource_exhausted/i.test(message)) {
        setChatError("Messages are temporarily rate-limited. Please try again in a moment.");
      } else {
        setChatError(message || "Could not load messages.");
      }
    }
  }, []);

  const sendMessage = async (text) => {
    if (!user || !text) return;
    setChatError(null);
    // Optimistic bubble so the studio chat feels instant.
    const optimistic = { from: "user", text, createdAt: new Date().toISOString(), _pending: true };
    setChatMessages((m) => [...m, optimistic]);
    try {
      await api.sendMessage(text);
      await refreshMessages();
    } catch (e) {
      setChatError(e.message || "Could not send your message. Please try again.");
      setChatMessages((m) => m.filter((msg) => msg !== optimistic));
    }
  };

  // Keep customer notices reasonably fresh without aggressive polling. The
  // chat widget still performs its own refresh when opened; this extra refresh
  // runs only when the signed-in user returns to the tab.
  // IMPORTANT: `user` is a derived object and gets recreated on every render.
  // Depending on it here caused a refreshMessages() loop, which repeatedly hit
  // Firestore and could consume the daily read quota by itself. Depend only on
  // the stable Firebase UID so the refresh runs once per signed-in session and
  // again when the user returns to the tab.
  const currentUserUid = firebaseUser?.uid || "";
  useEffect(() => {
    if (!currentUserUid) {
      setChatMessages([]);
      setChatError(null);
      return undefined;
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshMessages();
    };
    document.addEventListener("visibilitychange", onVisible);
    refreshMessages();
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [currentUserUid, refreshMessages]);

  const addToBag = (product, qty = 1, size = "") => {
    if (product.inStock === false) return;
    const sizeData = Array.isArray(product.sizes) ? product.sizes.find((s) => String(s?.size || "") === String(size || "")) : null;
    const maxAvailable = sizeData ? Math.max(0, Number(sizeData.stock) || 0) : Infinity;
    if (Array.isArray(product.sizes) && product.sizes.length && (!size || maxAvailable <= 0)) return;
    const key = `${product.id}::${size}`;
    setCart((c) => {
      const existing = c.find((i) => i.cartKey === key);
      const nextQty = Number.isFinite(maxAvailable) ? Math.min(maxAvailable, (existing?.qty || 0) + qty) : (existing?.qty || 0) + qty;
      if (existing) return c.map((i) => (i.cartKey === key ? { ...i, qty: nextQty } : i));
      return [...c, { ...product, qty: Number.isFinite(maxAvailable) ? Math.min(maxAvailable, qty) : qty, size, cartKey: key }];
    });
    setCartOpen(true);
  };
  useEffect(() => {
    try {
      localStorage.setItem("artcanvas_cart_v1", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const removeFromCart = (id) => setCart((c) => c.filter((i) => (i.cartKey || i.id) !== id));
  const updateQty = (id, qty) => setCart((c) => c.map((i) => {
    if ((i.cartKey || i.id) !== id) return i;
    const sizeData = Array.isArray(i.sizes) ? i.sizes.find((s) => String(s?.size || "") === String(i.size || "")) : null;
    const max = sizeData ? Math.max(1, Number(sizeData.stock) || 0) : Infinity;
    return { ...i, qty: Number.isFinite(max) ? Math.min(max, Math.max(1, qty)) : Math.max(1, qty) };
  }));
  const toggleWishlist = (id) =>
    setWishlist((w) => {
      const n = new Set(w);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // Places the order with the backend (validates + decrements real stock),
  // then clears the local cart and refreshes product stock levels.
  const checkout = async (shipping, paymentMethod, paymentRef, paymentMeta = {}) => {
    if (!user) throw new Error("Sign in to check out.");
    if (cart.length === 0) throw new Error("Your bag is empty.");
    const order = await api.placeOrder(
      cart.map((i) => ({ id: i.id, qty: i.qty, size: i.size || "" })),
      shipping,
      paymentMethod,
      paymentRef,
      paymentMeta.payerName || "",
      paymentMeta.productCodes || [],
      paymentMeta.useCoins === true
    );
    setCart([]);
    setCartOpen(false);
    // Keep the customer's latest delivery details in their profile for the next order.
    updateMyProfile({
      name: shipping.fullName,
      phone: shipping.phone,
      address: { ...shipping },
    }).catch(() => {});
    await refreshProducts();
    return order;
  };

  const value = useMemo(
    () => ({
      dark,
      setDark,
      cart,
      addToBag,
      removeFromCart,
      updateQty,
      wishlist,
      toggleWishlist,
      cartOpen,
      setCartOpen,
      cartCount: cart.reduce((s, i) => s + i.qty, 0),
      subtotal: cart.reduce((s, i) => s + i.price * i.qty, 0),
      checkout,

      products,
      productsLoading,
      refreshProducts,

      siteContent,
      refreshSiteContent,

      categories,
      refreshCategories,

      subcategories,
      refreshSubcategories,

      user,
      isAuthenticated: !!user,
      isAdmin,
      authLoading,
      authError,
      clearAuthError,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      updateMyProfile,
      refreshMyProfile,

      chatMessages,
      chatLoading,
      chatError,
      sendMessage,
      refreshMessages,
    }),
    [dark, cart, wishlist, cartOpen, user, isAdmin, authLoading, authError, chatMessages, chatLoading, chatError, products, productsLoading, siteContent, categories, subcategories]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function friendlyAuthError(e) {
  const code = e?.code || "";
  if (code.includes("email-already-in-use")) return "That email already has an account — try signing in instead.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Incorrect email or password.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("popup-closed-by-user")) return "Google sign-in was cancelled.";
  return e?.message || "Something went wrong. Please try again.";
}

export const useStore = () => useContext(StoreContext);
