"use client"

import {
  Home,
  LayoutDashboard,
  Store,
  ShoppingCart,
  Users,
  MessageCircleQuestion,
  Mail,
  LogIn,
  UserPlus,
} from 'lucide-react'

const menuSections = [
  {
    title: 'Platform',
    items: [
      {
        title: 'Overview',
        description: 'Learn what the admin dashboard includes',
        icon: Home,
        href: '#hero'
      },
      {
        title: 'Marketplace features',
        description: 'Seller, order, user, and inventory tools',
        icon: LayoutDashboard,
        href: '#features'
      }
    ]
  },
  {
    title: 'Admin areas',
    items: [
      {
        title: 'Dashboard',
        description: 'Quick overview of marketplace performance',
        icon: LayoutDashboard,
        href: '/admin/dashboard'
      },
      {
        title: 'Sellers',
        description: 'Manage sellers and their listings',
        icon: Store,
        href: '/admin/sellers'
      },
      {
        title: 'Orders',
        description: 'Track orders, payments, and status',
        icon: ShoppingCart,
        href: '/admin/orders'
      },
      {
        title: 'Users',
        description: 'Manage users and permissions',
        icon: Users,
        href: '/admin/users'
      }
    ]
  },
  {
    title: 'Resources',
    items: [
      {
        title: 'FAQ',
        description: 'Common questions about Booksetu',
        icon: MessageCircleQuestion,
        href: '#faq'
      },
      {
        title: 'Contact support',
        description: 'Get help from the team',
        icon: Mail,
        href: '#contact'
      },
      {
        title: 'Sign in / Sign up',
        description: 'Access your Booksetu account',
        icon: LogIn,
        href: '/sign-in'
      }
    ]
  }
]

export function MegaMenu() {
  return (
    <div className="w-[700px] max-w-[95vw] p-4 sm:p-6 lg:p-8 bg-background">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-4 lg:space-y-6">
            {/* Section Header */}
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {section.title}
            </h3>

            {/* Section Links */}
            <div className="space-y-3 lg:space-y-4">
              {section.items.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  className="group block space-y-1 lg:space-y-2 hover:bg-accent rounded-md p-2 lg:p-3 -mx-2 lg:-mx-3 transition-colors my-0"
                >
                  <div className="flex items-center gap-2 lg:gap-3">
                    <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed ml-6 lg:ml-7">
                    {item.description}
                  </p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
