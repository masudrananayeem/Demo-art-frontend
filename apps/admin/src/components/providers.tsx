"use client"
import React from "react"
import {QueryClient,QueryClientProvider} from "@tanstack/react-query"
import {ArtAdminProvider} from "@/contexts/art-admin-context"
import {AdminAuthProvider} from "@/contexts/admin-auth-context"
export default function Providers({children}:{children:React.ReactNode}){const [queryClient]=React.useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:30000,refetchOnWindowFocus:false,retry:1}}}));return <QueryClientProvider client={queryClient}><ArtAdminProvider><AdminAuthProvider>{children}</AdminAuthProvider></ArtAdminProvider></QueryClientProvider>}
