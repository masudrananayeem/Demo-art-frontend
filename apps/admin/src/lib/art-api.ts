import { getAuth } from 'firebase/auth'

export const API_BASE = process.env.NEXT_PUBLIC_ARTCANVAS_API_URL || 'http://localhost:8787'

const GET_CACHE_TTL: Record<string, number> = {
  "/api/me": 30_000,
  "/api/admin/products": 15_000,
  "/api/admin/categories": 30_000,
  "/api/admin/subcategories": 30_000,
  "/api/admin/orders": 15_000,
  "/api/admin/messages/threads": 5_000,
  "/api/site-content": 30_000,
  "/api/admin/payment-settings": 300_000,
  "/api/admin/notification-state": 15_000,
  "/api/admin/analytics": 300_000,
};

const GET_CACHE = new Map<string, { value: any; expiresAt: number }>();
const GET_IN_FLIGHT = new Map<string, Promise<any>>();

function cloneValue(value: any) {
  if (value === null || value === undefined) return value;
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
}

function clearApiGetCache() {
  GET_CACHE.clear();
}

function cacheKey(path: string, auth: boolean) {
  const uid = auth ? (getAuth().currentUser?.uid || "anonymous") : "public";
  return `${uid}:${path}`;
}

async function request(path: string, opts: {method?: string; body?: any; auth?: boolean} = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const needsAuth = opts.auth === true;
  const ttl = method === 'GET' ? (GET_CACHE_TTL[path.split('?')[0]] || 0) : 0;
  const key = cacheKey(path, needsAuth);

  if (method === 'GET' && ttl > 0) {
    const cached = GET_CACHE.get(key);
    if (cached && cached.expiresAt > Date.now()) return cloneValue(cached.value);
    const existing = GET_IN_FLIGHT.get(key);
    if (existing) return cloneValue(await existing);
  }

  const run = async () => {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (needsAuth) {
      const user = getAuth().currentUser
      if (!user) throw new Error('You must be signed in to do that.')
      headers.Authorization = `Bearer ${await user.getIdToken()}`
    }
    let res: Response
    try { res = await fetch(`${API_BASE}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body), cache: 'no-store' }) }
    catch { throw new Error(`Failed to fetch ${API_BASE}. Start the ArtCanvas backend on port 8787 or set NEXT_PUBLIC_ARTCANVAS_API_URL.`) }
    let data:any=null; try { data=await res.json() } catch {}
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
    return data
  };

  if (method !== 'GET') clearApiGetCache();

  if (method !== 'GET' || ttl <= 0) return run();

  const promise = run()
    .then((data) => {
      GET_CACHE.set(key, { value: data, expiresAt: Date.now() + ttl });
      return data;
    })
    .finally(() => GET_IN_FLIGHT.delete(key));
  GET_IN_FLIGHT.set(key, promise);
  return cloneValue(await promise);
}

export const artApi = {
  me:()=>request('/api/me',{auth:true}),
  products:()=>request('/api/admin/products',{auth:true}),
  createProduct:(body:any)=>request('/api/admin/products',{method:'POST',body,auth:true}),
  updateProduct:(id:string,body:any)=>request(`/api/admin/products/${id}`,{method:'PATCH',body,auth:true}),
  deleteProduct:(id:string)=>request(`/api/admin/products/${id}`,{method:'DELETE',auth:true}),
  cloudinarySignature:(context='product')=>request('/api/admin/cloudinary-signature',{method:'POST',body:{context},auth:true}),
  categories:()=>request('/api/admin/categories',{auth:true}),
  createCategory:(name:string)=>request('/api/admin/categories',{method:'POST',body:{name},auth:true}),
  updateCategory:(id:string,name:string)=>request(`/api/admin/categories/${id}`,{method:'PATCH',body:{name},auth:true}),
  deleteCategory:(id:string)=>request(`/api/admin/categories/${id}`,{method:'DELETE',auth:true}),
  subcategories:()=>request('/api/admin/subcategories',{auth:true}),
  createSubcategory:(gender:string,name:string)=>request('/api/admin/subcategories',{method:'POST',body:{gender,name},auth:true}),
  updateSubcategory:(gender:string,oldName:string,name:string)=>request('/api/admin/subcategories',{method:'PATCH',body:{gender,oldName,name},auth:true}),
  deleteSubcategory:(gender:string,name:string)=>request('/api/admin/subcategories',{method:'DELETE',body:{gender,name},auth:true}),
  orders:()=>request('/api/admin/orders',{auth:true}),
  ordersPage:(limit=25,status='all',cursor='')=>request(`/api/admin/orders/page?limit=${limit}&status=${encodeURIComponent(status)}${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`,{auth:true}),
  updateOrderStatus:(id:string,status:string,reason:string='')=>request(`/api/admin/orders/${id}`,{method:'PATCH',body:{status,...(reason ? {reason} : {})},auth:true}),
  updatePaymentStatus:(id:string,status:string,body:any={})=>request(`/api/admin/orders/${id}/payment`,{method:'PATCH',body:{paymentStatus:status,...body},auth:true}),
  deletePaymentRecord:(id:string)=>request(`/api/admin/orders/${id}/payment`,{method:'DELETE',auth:true}),
  deleteOrder:(id:string)=>request(`/api/admin/orders/${id}`,{method:'DELETE',auth:true}),
  threads:()=>request('/api/admin/messages/threads',{auth:true}),
  messagesFor:(uid:string)=>request(`/api/admin/messages/${uid}`,{auth:true}),
  lookupEmail:(email:string)=>request('/api/admin/messages/lookup',{method:'POST',body:{email},auth:true}),
  markRead:(uid:string)=>request(`/api/admin/messages/${uid}/read`,{method:'PATCH',auth:true}),
  sendMessage:(uid:string,text:string)=>request(`/api/admin/messages/${uid}`,{method:'POST',body:{text},auth:true}),
  deleteMessage:(uid:string,id:string)=>request(`/api/admin/messages/${uid}/${id}`,{method:'DELETE',auth:true}),
  deleteThread:(uid:string)=>request(`/api/admin/messages/${uid}`,{method:'DELETE',auth:true}),
  siteContent:()=>request('/api/site-content'),
  updateSiteContent:(body:any)=>request('/api/admin/site-content',{method:'PATCH',body,auth:true}),
  admins:()=>request('/api/admin/admins',{auth:true}),
  createAdminProfile:(body:any)=>request('/api/admin/admins',{method:'POST',body,auth:true}),
  updateAdminProfile:(id:string,body:any)=>request(`/api/admin/admins/${id}`,{method:'PATCH',body,auth:true}),
  deleteAdminProfile:(id:string)=>request(`/api/admin/admins/${id}`,{method:'DELETE',auth:true}),
  requestAccess:(body:any)=>request('/api/admin/access-requests',{method:'POST',body,auth:true}),
  accessRequests:()=>request('/api/admin/access-requests',{auth:true}),
  approveAccessRequest:(id:string,body:any)=>request(`/api/admin/access-requests/${id}`,{method:'PATCH',body:{...body,status:'approved'},auth:true}),
  rejectAccessRequest:(id:string,body:any)=>request(`/api/admin/access-requests/${id}`,{method:'PATCH',body:{...body,status:'rejected'},auth:true}),
  auditLogs:(limit=200)=>request(`/api/admin/audit?limit=${limit}`,{auth:true}),
  paymentSettings:()=>request('/api/admin/payment-settings',{auth:true}),
  notificationState:()=>request('/api/admin/notification-state',{auth:true}),
  analytics:(year:string)=>request(`/api/admin/analytics?year=${encodeURIComponent(year)}`,{auth:true}),
  updatePaymentSettings:(body:any)=>request('/api/admin/payment-settings',{method:'PATCH',body,auth:true}),
  circulation:()=>request('/api/admin/circulation',{auth:true}),
  createCirculation:(body:any)=>request('/api/admin/circulation',{method:'POST',body,auth:true}),
  updateCirculation:(id:string,body:any)=>request(`/api/admin/circulation/${id}`,{method:'PATCH',body,auth:true}),
  deleteCirculation:(id:string)=>request(`/api/admin/circulation/${id}`,{method:'DELETE',auth:true}),
  membershipPlans:()=>request('/api/admin/membership-plans',{auth:true}),
  members:()=>request('/api/admin/members',{auth:true}),
  addMember:(body:any)=>request('/api/admin/members',{method:'POST',body,auth:true}),
  updateMember:(uid:string,body:any)=>request(`/api/admin/members/${uid}`,{method:'PATCH',body,auth:true}),
  membershipRequests:()=>request('/api/admin/membership-requests',{auth:true}),
  reviewMembershipRequest:(id:string,status:string)=>request(`/api/admin/membership-requests/${id}`,{method:'PATCH',body:{status},auth:true}),
  coinSettings:()=>request('/api/admin/coin-settings',{auth:true}),
  updateCoinSettings:(body:any)=>request('/api/admin/coin-settings',{method:'PATCH',body,auth:true}),
  coinRules:()=>request('/api/admin/coin-rules',{auth:true}),
  updateCoinRule:(productId:string,body:any)=>request(`/api/admin/coin-rules/${productId}`,{method:'PATCH',body,auth:true}),
  messageMember:(uid:string,text:string)=>request(`/api/admin/members/${uid}/message`,{method:'POST',body:{text},auth:true}),
  broadcastMembers:(text:string)=>request('/api/admin/members/broadcast',{method:'POST',body:{text},auth:true}),
  createMembershipPlan:(body:any)=>request('/api/admin/membership-plans',{method:'POST',body,auth:true}),
  updateMembershipPlan:(id:string,body:any)=>request(`/api/admin/membership-plans/${id}`,{method:'PATCH',body,auth:true}),
  deleteMembershipPlan:(id:string)=>request(`/api/admin/membership-plans/${id}`,{method:'DELETE',auth:true}),
  contacts:()=>request('/api/admin/contact',{auth:true}),
  updateContact:(id:string,body:any)=>request(`/api/admin/contact/${id}`,{method:'PATCH',body,auth:true}),
  deleteContact:(id:string)=>request(`/api/admin/contact/${id}`,{method:'DELETE',auth:true}),
}

export async function uploadAdminImage(file: File, context='product') {
  const sig:any = await artApi.cloudinarySignature(context)
  const form = new FormData(); form.append('file',file); form.append('api_key',sig.apiKey); form.append('timestamp',String(sig.timestamp)); form.append('signature',sig.signature); form.append('folder',sig.folder)
  const res=await fetch(sig.uploadUrl,{method:'POST',body:form}); const data=await res.json(); if(!res.ok) throw new Error(data?.error?.message||'Image upload failed')
  return {url:data.secure_url,publicId:data.public_id}
}

export const api = {
  adminProducts: artApi.products,
  createProduct: artApi.createProduct,
  updateProduct: artApi.updateProduct,
  deleteProduct: artApi.deleteProduct,
  adminCategories: artApi.categories,
  createCategory: artApi.createCategory,
  updateCategory: artApi.updateCategory,
  deleteCategory: artApi.deleteCategory,
  adminSubcategories: artApi.subcategories,
  createSubcategory: artApi.createSubcategory,
  updateSubcategory: artApi.updateSubcategory,
  deleteSubcategory: artApi.deleteSubcategory,
  allOrders: artApi.orders,
  updateOrderStatus: artApi.updateOrderStatus,
  deleteOrder: artApi.deleteOrder,
  adminMessageThreads: artApi.threads,
  adminMessagesFor: artApi.messagesFor,
  adminLookupEmail: artApi.lookupEmail,
  adminMarkMessagesRead: artApi.markRead,
  adminSendMessage: artApi.sendMessage,
  adminDeleteMessage: artApi.deleteMessage,
  adminDeleteMessageThread: artApi.deleteThread,
  updateSiteContent: artApi.updateSiteContent,
}
