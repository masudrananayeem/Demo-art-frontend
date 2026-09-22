'use client'
import React,{createContext,useContext,useMemo} from 'react'
import {useArtAdmin} from './art-admin-context'
import {effectivePermissions} from '@/lib/admin-permissions'
export type AdminRole = 'Admin'|'Moderator'|'Seller'
export const AdminAuthContext=createContext<any>(null)
export function AdminAuthProvider({children}:{children:React.ReactNode}){
 const a=useArtAdmin()
 const permissions=useMemo(()=>effectivePermissions(a.admin),[a.admin])
 const hasRole=React.useCallback((role:string)=>a.admin?.role===role,[a.admin?.role])
 const hasPermission=React.useCallback((permission:string)=>!!permissions[permission as keyof typeof permissions],[permissions])
 const canEdit=React.useCallback(()=>!!a.admin,[a.admin])
 const logout=React.useCallback(async()=>{const {getAuth,signOut}=await import('firebase/auth');await signOut(getAuth())},[])
 const value=useMemo(()=>({...a,permissions,hasRole,hasPermission,canEdit,logout}),[a,permissions,hasRole,hasPermission,canEdit,logout])
 return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
export const useAdminAuth=()=>useContext(AdminAuthContext)||{}
