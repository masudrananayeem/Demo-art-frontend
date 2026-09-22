"use client"

import * as React from "react"
import { getAvatarUrl } from "@/lib/avatar-utils"
import {
  CreditCard,
  EllipsisVertical,
  LogOut,
  BellDot,
  CircleUser,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Logo } from "@/components/logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { generateAdminAvatarFallback } from "@/lib/admin-utils"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const [isMounted, setIsMounted] = React.useState(false)
  const { isMobile } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAdminAuth()
  const isAdmin = pathname?.startsWith("/admin")

  React.useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Calculate avatarUrl after isMounted is set
  const avatarUrl = React.useMemo(() => getAvatarUrl(user.avatar, isMounted, true), [user.avatar, isMounted]) // Use proxy for external URLs

  if (!isMounted) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="pointer-events-none opacity-0"
            aria-hidden="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">&nbsp;</span>
              <span className="text-muted-foreground truncate text-xs">&nbsp;</span>
            </div>
            <EllipsisVertical className="ml-auto size-4" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // In this project only the admin dashboard has authentication.
  // Route all account-related links to the admin settings pages.
  const accountUrl = "/admin/settings/account"
  const billingUrl = "/admin/settings/billing"
  const notificationsUrl = "/admin/settings/notifications"

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/admin/login")
    } catch (error) {
      console.error("Logout error:", error)
      // Still redirect to login page even if logout fails
      router.push("/admin/login")
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              {avatarUrl ? (
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={user.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs rounded-lg">
                    {generateAdminAvatarFallback(user.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={20} />
                </div>
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                {avatarUrl ? (
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatarUrl} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs rounded-lg">
                      {generateAdminAvatarFallback(user.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground">
                    <Logo size={20} />
                  </div>
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={accountUrl}>
                  <CircleUser />
                  Account
                </Link>
              </DropdownMenuItem>
              {!isAdmin && (
                <>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={billingUrl}>
                      <CreditCard />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={notificationsUrl}>
                      <BellDot />
                      Notifications
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
