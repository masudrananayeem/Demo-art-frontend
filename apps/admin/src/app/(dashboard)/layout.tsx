"use client"
import React from "react"
import {AppSidebar} from "@/components/app-sidebar"
import {SiteHeader} from "@/components/site-header"
import {SidebarProvider,SidebarInset} from "@/components/ui/sidebar"
import {useSidebarConfig} from "@/hooks/use-sidebar-config"
export default function DashboardLayout({children}:{children:React.ReactNode}){const {config}=useSidebarConfig();return <SidebarProvider style={{"--sidebar-width":"16rem","--sidebar-width-icon":"3rem","--header-height":"calc(var(--spacing) * 14)"} as React.CSSProperties}><AppSidebar variant={config.variant} collapsible={config.collapsible} side="left"/><SidebarInset><SiteHeader/><main className="flex flex-1 flex-col"><div className="@container/main flex flex-1 flex-col gap-2"><div className="flex flex-col gap-4 py-5 md:gap-6 md:py-7">{children}</div></div></main></SidebarInset></SidebarProvider>}
