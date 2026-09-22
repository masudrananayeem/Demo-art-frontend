import { artApi } from '@/lib/art-api'
import type { AdminPermissions } from '@/types/admin'
import type { AdminRole } from '@/contexts/admin-auth-context'
export interface Admin { id:string; name:string; email:string; username?:string; role:AdminRole; permissions?:AdminPermissions; avatar?:string; phone?:string; location?:string; bio?:string; facebook?:string; whatsapp?:string; twitter?:string; linkedin?:string; instagram?:string; status:'active'|'suspended'|'deleted'; createdAt:string; createdBy?:string; lastLogin?:string|null }
export async function getAllAdmins(pageSize=100){ const data=await artApi.admins(); const admins=Array.isArray(data)?data:(data?.admins||[]); return {admins:admins.slice(0,pageSize),lastDoc:null,hasMore:admins.length>pageSize}; }
export async function getAdminById(id:string){ const list=await artApi.admins(); return (Array.isArray(list)?list:list?.admins||[]).find((x:any)=>x.id===id)||null; }
export async function createAdmin(data:any,createdBy:string,password?:string){ return artApi.createAdminProfile({...data,createdBy,password}); }
export async function updateAdminRole(id:string,role:AdminRole,permissions?:any){ return artApi.updateAdminProfile(id,{role,permissions}); }
export async function updateAdmin(id:string,patch:any){ return artApi.updateAdminProfile(id,patch); }
export async function deleteAdmin(id:string){ return artApi.deleteAdminProfile(id); }
export async function getCurrentAdmin(id:string){ return getAdminById(id); }
