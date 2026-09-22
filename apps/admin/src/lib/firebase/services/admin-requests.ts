import { artApi } from '@/lib/art-api'
import type { AdminRole } from '@/contexts/admin-auth-context'
export interface AdminRequest { id:string; name:string; email:string; photoURL?:string; requestedRole?:AdminRole; assignedRole?:AdminRole; assignedPermissions?:any; reason?:string; status:'pending'|'approved'|'rejected'; createdAt:string; reviewedAt?:string; reviewedBy?:string; reviewerName?:string; reviewerNotes?:string }
export async function createAdminRequest(data:any){ return artApi.requestAccess(data) }
export async function getAllAdminRequests(){ const d=await artApi.accessRequests(); return Array.isArray(d)?d:(d?.requests||[]) }
export async function getPendingAdminRequests(){ const all=await getAllAdminRequests(); return all.filter((x:any)=>x.status==='pending') }
export async function approveAdminRequest(id:string,reviewerId:string,reviewerName:string,reviewerNotes?:string,assignedRole?:AdminRole,assignedPermissions?:any){ return artApi.approveAccessRequest(id,{reviewerId,reviewerName,reviewerNotes,assignedRole,assignedPermissions}) }
export async function rejectAdminRequest(id:string,reviewerId:string,reviewerName:string,reviewerNotes?:string){ return artApi.rejectAccessRequest(id,{reviewerId,reviewerName,reviewerNotes}) }
export async function getApprovedAdminRequestByEmail(email:string){ const all=await getAllAdminRequests(); return all.find((x:any)=>x.email?.toLowerCase()===email.toLowerCase()&&x.status==='approved')||null }
