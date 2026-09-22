import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

const GET_CACHE_TTL = {
  "/api/products": 15_000,
  "/api/site-content": 30_000,
  "/api/categories": 30_000,
  "/api/subcategories": 30_000,
  "/api/payment-settings": 30_000,
  "/api/membership-plans": 60_000,
  "/api/me": 30_000,
  "/api/orders/me": 5_000,
  "/api/membership/me": 15_000,
  "/api/circulation/me": 10_000,
  "/api/messages/me": 3_000,
  "/api/admin/products": 15_000,
  "/api/admin/categories": 30_000,
  "/api/admin/subcategories": 30_000,
  "/api/admin/orders": 5_000,
  "/api/admin/messages/threads": 5_000,
};

const GET_CACHE = new Map();
const GET_IN_FLIGHT = new Map();

function cloneValue(value) {
  if (value === null || value === undefined) return value;
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
}

function clearApiGetCache() {
  GET_CACHE.clear();
}

function cacheKey(path, needsAuth) {
  const uid = needsAuth ? (auth.currentUser?.uid || "anonymous") : "public";
  return `${uid}:${path}`;
}

async function request(path, { method = "GET", body, auth: needsAuth = false } = {}) {
  const normalizedMethod = method.toUpperCase();
  const ttl = normalizedMethod === "GET" ? (GET_CACHE_TTL[path.split("?")[0]] || 0) : 0;
  const key = cacheKey(path, needsAuth);

  if (normalizedMethod === "GET" && ttl > 0) {
    const cached = GET_CACHE.get(key);
    if (cached && cached.expiresAt > Date.now()) return cloneValue(cached.value);
    const existing = GET_IN_FLIGHT.get(key);
    if (existing) return cloneValue(await existing);
  }

  const run = async () => {
    const headers = { "Content-Type": "application/json" };

    if (needsAuth) {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be signed in to do that.");
      const token = await user.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: normalizedMethod,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error(`Failed to fetch ${API_BASE}. Make sure the backend is running on port 8787 and VITE_API_BASE_URL is correct.`);
    }

    let data = null;
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      const message = data?.error || `Request failed (${res.status})`;
      if (res.status === 429) throw new Error(`429: ${message}`);
      throw new Error(message);
    }
    return data;
  };

  if (normalizedMethod !== "GET") clearApiGetCache();
  if (normalizedMethod !== "GET" || ttl <= 0) return run();

  const promise = run()
    .then((data) => {
      GET_CACHE.set(key, { value: data, expiresAt: Date.now() + ttl });
      return data;
    })
    .finally(() => GET_IN_FLIGHT.delete(key));
  GET_IN_FLIGHT.set(key, promise);
  return cloneValue(await promise);
}

export const api = {
  // public
  getProducts: () => request("/api/products"),
  getProduct: (id) => request(`/api/products/${id}`),
  getSiteContent: () => request("/api/site-content"),
  getCategories: () => request("/api/categories"),
  getSubcategories: () => request("/api/subcategories"),
  getPaymentSettings: () => request("/api/payment-settings"),
  getMembershipPlans: () => request("/api/membership-plans"),

  // authenticated user
  me: () => request("/api/me", { auth: true }),
  updateMe: (patch) => request("/api/me", { method: "PATCH", body: patch, auth: true }),
  placeOrder: (items, shipping, paymentMethod, paymentRef, paymentPayerName = "", paymentProductCodes = [], useCoins = false) =>
    request("/api/orders", { method: "POST", body: { items, shipping, paymentMethod, paymentRef, paymentPayerName, paymentProductCodes, useCoins }, auth: true }),
  myOrders: () => request("/api/orders/me", { auth: true }),
  myMembership: () => request("/api/membership/me", { auth: true }),
  requestMembership: (body) => request("/api/membership/request", { method: "POST", body, auth: true }),
  myCirculation: () => request("/api/circulation/me", { auth: true }),
  sendContact: (body) => request("/api/contact", { method: "POST", body }),
  profileCloudinarySignature: () => request("/api/cloudinary-signature", { method: "POST", auth: true }),

  // messages (client <-> studio)
  sendMessage: (text) => request("/api/messages", { method: "POST", body: { text }, auth: true }),
  myMessages: () => request("/api/messages/me", { auth: true }),
  subscribeNewsletter: (email) => request("/api/newsletter", { method: "POST", body: { email } }),

  // admin
  adminProducts: () => request("/api/admin/products", { auth: true }),
  createProduct: (product) => request("/api/admin/products", { method: "POST", body: product, auth: true }),
  updateProduct: (id, patch) => request(`/api/admin/products/${id}`, { method: "PATCH", body: patch, auth: true }),
  deleteProduct: (id) => request(`/api/admin/products/${id}`, { method: "DELETE", auth: true }),
  adminCloudinarySignature: (context = "product") => request("/api/admin/cloudinary-signature", { method: "POST", body: { context }, auth: true }),
  updateSiteContent: (patch) => request("/api/admin/site-content", { method: "PATCH", body: patch, auth: true }),
  adminCategories: () => request("/api/admin/categories", { auth: true }),
  adminSubcategories: () => request("/api/admin/subcategories", { auth: true }),
  createCategory: (name) => request("/api/admin/categories", { method: "POST", body: { name }, auth: true }),
  updateCategory: (id, name) => request(`/api/admin/categories/${id}`, { method: "PATCH", body: { name }, auth: true }),
  deleteCategory: (id) => request(`/api/admin/categories/${id}`, { method: "DELETE", auth: true }),
  createSubcategory: (gender, name) => request("/api/admin/subcategories", { method: "POST", body: { gender, name }, auth: true }),
  updateSubcategory: (gender, oldName, name) => request("/api/admin/subcategories", { method: "PATCH", body: { gender, oldName, name }, auth: true }),
  deleteSubcategory: (gender, name) => request("/api/admin/subcategories", { method: "DELETE", body: { gender, name }, auth: true }),
  allOrders: () => request("/api/admin/orders", { auth: true }),
  updateOrderStatus: (id, status, reason = "") => request(`/api/admin/orders/${id}`, { method: "PATCH", body: { status, reason }, auth: true }),
  updatePaymentStatus: (id, paymentStatus, meta = {}) => request(`/api/admin/orders/${id}/payment`, { method: "PATCH", body: { paymentStatus, ...meta }, auth: true }),
  deleteOrder: (id) => request(`/api/admin/orders/${id}`, { method: "DELETE", auth: true }),

  // admin messages
  adminMessageThreads: () => request("/api/admin/messages/threads", { auth: true }),
  adminLookupEmail: (email) => request("/api/admin/messages/lookup", { method: "POST", body: { email }, auth: true }),
  adminMessagesFor: (uid) => request(`/api/admin/messages/${uid}`, { auth: true }),
  adminMarkMessagesRead: (uid) => request(`/api/admin/messages/${uid}/read`, { method: "PATCH", auth: true }),
  adminSendMessage: (uid, text) => request(`/api/admin/messages/${uid}`, { method: "POST", body: { text }, auth: true }),
  adminDeleteMessage: (uid, messageId) => request(`/api/admin/messages/${uid}/${messageId}`, { method: "DELETE", auth: true }),
  adminDeleteMessageThread: (uid) => request(`/api/admin/messages/${uid}`, { method: "DELETE", auth: true }),
};

async function uploadToCloudinary(sig, file) {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const res = await fetch(sig.uploadUrl, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Image upload failed");
  return { url: data.secure_url, publicId: data.public_id };
}

// Admin-only: product photos or the homepage hero image.
export async function uploadAdminImage(file, context = "product") {
  const sig = await api.adminCloudinarySignature(context);
  return uploadToCloudinary(sig, file);
}

// Any signed-in user: their own profile photo.
export async function uploadProfileImage(file) {
  const sig = await api.profileCloudinarySignature();
  return uploadToCloudinary(sig, file);
}
