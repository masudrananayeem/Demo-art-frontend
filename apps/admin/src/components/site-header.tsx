"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { Search, LogOut } from "lucide-react"
import { useAdminAuth } from "@/contexts/admin-auth-context"
export function SiteHeader(){const {admin,logout}=useAdminAuth();const [q,setQ]=React.useState("");return <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/90 backdrop-blur"><div className="flex w-full items-center gap-2 px-4 py-3 lg:px-6"><SidebarTrigger className="-ml-1"/><Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4"/><div className="hidden sm:flex max-w-md flex-1 items-center gap-2 rounded-lg border bg-muted/30 px-3 h-9"><Search className="size-4 text-muted-foreground"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search dashboard..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"/></div><div className="ml-auto flex items-center gap-2"><div className="hidden md:block text-right"><p className="text-sm font-medium">{admin?.name||"Admin"}</p><p className="text-xs text-muted-foreground">{admin?.email||""}</p></div><ModeToggle/><Button variant="ghost" size="icon" onClick={logout} title="Sign out"><LogOut className="size-4"/></Button></div></div></header>}
