import { artApi } from '@/lib/art-api'
export async function createAuditLog(){ return {success:true} }
export async function getAllAuditLogs(limitCount=200){ const d=await artApi.auditLogs(limitCount); return Array.isArray(d)?d:(d?.logs||[]) }
export async function getAuditLogsByAdmin(adminId:string){ const logs=await getAllAuditLogs(500); return logs.filter((x:any)=>x.adminId===adminId) }
export async function getAuditLogsByTarget(targetType:string,targetId:string){ const logs=await getAllAuditLogs(500); return logs.filter((x:any)=>x.targetType===targetType&&x.targetId===targetId) }
