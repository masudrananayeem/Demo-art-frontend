"use client"
import * as React from "react"
import {LayoutDashboard,Package,Tags,UsersRound,ShoppingCart,MessageSquare,Home,Store,ExternalLink,ShieldCheck,UserCog,WalletCards,ClipboardList,ScrollText,Settings2,BarChart3} from "lucide-react"
import Link from "next/link"
import {usePathname} from "next/navigation"
import {Sidebar,SidebarContent,SidebarHeader,SidebarMenu,SidebarMenuButton,SidebarMenuItem,useSidebar,SidebarGroup,SidebarGroupLabel} from "@/components/ui/sidebar"
import {Logo} from "@/components/logo"
import {useAdminAuth} from "@/contexts/admin-auth-context"
import {useAdminSectionNotifications, type AdminNotificationKey} from "@/hooks/use-admin-section-notifications"

const workspace=[
 {title:"Dashboard",url:"/admin/dashboard",icon:LayoutDashboard,permission:"viewDashboard"},
 {title:"Products",url:"/admin/products",icon:Package,permission:"manageProducts"},
 {title:"Categories",url:"/admin/categories",icon:Tags,permission:"manageCategories"},
 {title:"Sub-categories",url:"/admin/subcategories",icon:UsersRound,permission:"manageCategories"},
 {title:"Orders",url:"/admin/orders",icon:ShoppingCart,permission:"manageOrders"},
 {title:"Messages",url:"/admin/messages",icon:MessageSquare,permission:"manageMessages"},
 {title:"Homepage",url:"/admin/home",icon:Home,permission:"manageHomepage"},
]
const administration=[
 {title:"Admins & Roles",url:"/admin/admins",icon:UserCog,permission:"manageAdmins"},
 {title:"Access Requests",url:"/admin/access-requests",icon:ClipboardList,permission:"manageAdmins"},
 {title:"Audit Log",url:"/admin/audit",icon:ScrollText,permission:"viewAuditLogs"},
 {title:"Account Settings",url:"/admin/settings/account",icon:Settings2,permission:"manageSettings"},
]
const finance=[
 {title:"Payments & Finance",url:"/admin/payments",icon:WalletCards,permission:"managePayments"},
 {title:"Business Analytics",url:"/admin/analytics",icon:BarChart3,permission:"managePayments"},
 {title:"Circulation",url:"/admin/circulation",icon:ClipboardList,permission:"manageCirculation"},
 {title:"Membership",url:"/admin/membership",icon:UsersRound,permission:"manageMembership"},
 {title:"Contact & Feedback",url:"/admin/contact",icon:MessageSquare,permission:"manageContact"},
]
function Nav({items,unread,clear}:{items:any[];unread:Record<AdminNotificationKey,boolean>;clear:(key:AdminNotificationKey)=>void}){const pathname=usePathname();const{isMobile,setOpenMobile}=useSidebar();const routeKey=(url:string):AdminNotificationKey|undefined=>{if(url==="/admin/products")return "products";if(url==="/admin/categories")return "categories";if(url==="/admin/subcategories")return "subcategories";if(url==="/admin/orders")return "orders";if(url==="/admin/messages")return "messages";if(url==="/admin/home")return "homepage";if(url==="/admin/payments")return "payments";return undefined};return <SidebarMenu>{items.map((item:any)=>{const I=item.icon;const key=routeKey(item.url);const hasUnread=key?!!unread[key]:false;return <SidebarMenuItem key={item.url}><SidebarMenuButton asChild tooltip={item.title} isActive={pathname===item.url||pathname.startsWith(item.url+"/")}><Link href={item.url} onClick={()=>{if(key)clear(key);if(isMobile)setOpenMobile(false)}}><span className="relative flex shrink-0"><I/>{hasUnread&&<span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-sidebar" aria-label="New update"/>}</span><span>{item.title}</span></Link></SidebarMenuButton></SidebarMenuItem>})}</SidebarMenu>}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>){const{hasPermission,admin}=useAdminAuth();const{unread,clear}=useAdminSectionNotifications(admin?.uid,!!admin);const filteredWorkspace=workspace.filter(x=>hasPermission(x.permission));const filteredAdmin=administration.filter(x=>hasPermission(x.permission));const{isMobile,setOpenMobile}=useSidebar();return <Sidebar {...props}><SidebarHeader><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" asChild><Link href="/admin/dashboard" onClick={()=>isMobile&&setOpenMobile(false)}><div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Logo size={22} className="text-current"/></div><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">ArtCanvas</span><span className="truncate text-xs text-muted-foreground">Studio Admin</span></div></Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader><SidebarContent><SidebarGroup><SidebarGroupLabel>Workspace</SidebarGroupLabel><Nav items={filteredWorkspace} unread={unread} clear={clear}/></SidebarGroup>{filteredAdmin.length>0&&<SidebarGroup><SidebarGroupLabel>Administration</SidebarGroupLabel><Nav items={filteredAdmin} unread={unread} clear={clear}/></SidebarGroup>}{finance.filter(x=>hasPermission(x.permission)).length>0&&<SidebarGroup><SidebarGroupLabel>Finance & Services</SidebarGroupLabel><Nav items={finance.filter(x=>hasPermission(x.permission))} unread={unread} clear={clear}/></SidebarGroup>}<div className="mt-auto p-3"><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip="Open storefront"><a href={process.env.NEXT_PUBLIC_ARTCANVAS_STORE_URL||"http://localhost:5173"} target="_blank" rel="noreferrer"><Store/><span>Open storefront</span><ExternalLink className="ml-auto"/></a></SidebarMenuButton></SidebarMenuItem></SidebarMenu></div></SidebarContent></Sidebar>}
