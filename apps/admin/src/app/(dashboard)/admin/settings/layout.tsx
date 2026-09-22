"use client"
import {useEffect} from "react"
import {useRouter} from "next/navigation"
import {useAdminAuth} from "@/contexts/admin-auth-context"
export default function AdminSettingsLayout({children}:{children:React.ReactNode}){const{isAuthenticated,isLoading}=useAdminAuth();const router=useRouter();useEffect(()=>{if(!isLoading&&!isAuthenticated)router.replace('/admin/login')},[isLoading,isAuthenticated,router]);if(isLoading||!isAuthenticated)return null;return children}
