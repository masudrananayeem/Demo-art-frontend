import { artApi } from '@/lib/art-api'
export async function getContactSubmissions(limitCount=500){ const d=await artApi.contacts(); const list=Array.isArray(d)?d:[]; return list.slice(0,limitCount) }
export async function deleteContactSubmission(id:string){ return artApi.deleteContact(id) }
