"use client"

import * as React from "react"
import { getAvatarUrl } from "@/lib/avatar-utils"
import {
  CreditCard,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { generateAdminAvatarFallback } from "@/lib/admin-utils"

export function HeaderUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const [isMounted, setIsMounted] = React.useState(false)
  const [imageLoadError, setImageLoadError] = React.useState(false)
  
  React.useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAdminAuth()
  const isAdmin = pathname?.startsWith("/admin")
  
  // Reset error state when avatar URL changes
  React.useEffect(() => {
    setImageLoadError(false)
  }, [user.avatar])
  
  // Calculate avatarUrl after isMounted is set
  // Use proxy for external URLs to avoid CORS and rate limiting issues
  const avatarUrl = React.useMemo(() => {
    return getAvatarUrl(user.avatar, isMounted, true) // Use proxy for external URLs
  }, [user.avatar, isMounted])

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-accent"
        >
          <Avatar className="h-8 w-8" key={`avatar-${user.avatar || 'none'}-${isMounted}`}>
            {avatarUrl && !imageLoadError && isMounted ? (
              <AvatarImage 
                src={avatarUrl} 
                alt={user.name}
                key={avatarUrl}
                onError={() => {
                  setImageLoadError(true)
                }}
                onLoad={() => {
                  setImageLoadError(false)
                }}
              />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground">
              <span className="text-xs font-medium">
                {generateAdminAvatarFallback(user.name)}
              </span>
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-lg"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8" key={`dropdown-avatar-${user.avatar || 'none'}-${isMounted}`}>
              {avatarUrl && !imageLoadError && isMounted ? (
                <AvatarImage 
                  src={avatarUrl} 
                  alt={user.name}
                  key={avatarUrl}
                  onError={() => {
                    setImageLoadError(true)
                  }}
                  onLoad={() => {
                    setImageLoadError(false)
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground">
                <span className="text-xs font-medium">
                  {generateAdminAvatarFallback(user.name)}
                </span>
              </AvatarFallback>
            </Avatar>
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
              <CircleUser className="mr-2 h-4 w-4" />
              Account
            </Link>
          </DropdownMenuItem>
          {!isAdmin && (
            <>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={billingUrl}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={notificationsUrl}>
                  <BellDot className="mr-2 h-4 w-4" />
                  Notifications
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
