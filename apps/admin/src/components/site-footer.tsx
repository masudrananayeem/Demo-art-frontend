export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Mosabbir Maruf
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Comprehensive admin dashboard for managing your book marketplace - sellers, orders, users, and inventory.
          </p>
        </div>
      </div>
    </footer>
  )
}
