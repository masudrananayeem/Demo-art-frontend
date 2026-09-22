"use client"

import React from 'react'
import { Layout, Palette, RotateCcw, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useThemeManager } from '@/hooks/use-theme-manager'
import { useSidebarConfig } from '@/contexts/sidebar-context'
import { tweakcnThemes } from '@/config/theme-data'
import { ThemeTab } from './theme-tab'
import { LayoutTab } from './layout-tab'
import { ImportModal } from './import-modal'
import { cn } from '@/lib/utils'
import type { ImportedTheme } from '@/types/theme-customizer'
import { useAdminAuth } from '@/contexts/admin-auth-context'
import { getCustomizerSettings, saveCustomizerSettings, resetCustomizerSettings } from '@/lib/firebase/services/admin-customizer-settings'
import { useTheme } from '@/hooks/use-theme'
import { isDev } from "@/lib/env"

interface ThemeCustomizerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ThemeCustomizer({ open, onOpenChange }: ThemeCustomizerProps) {
  const { applyImportedTheme, isDarkMode, resetTheme, applyRadius, setBrandColorsValues, applyTheme, applyTweakcnTheme, brandColorsValues } = useThemeManager()
  const { config: sidebarConfig, updateConfig: updateSidebarConfig } = useSidebarConfig()
  const { admin } = useAdminAuth()
  const { theme: currentTheme, setTheme: setCurrentTheme } = useTheme()

  const [activeTab, setActiveTab] = React.useState("theme")
  const [selectedTheme, setSelectedTheme] = React.useState("default")
  const [selectedTweakcnTheme, setSelectedTweakcnTheme] = React.useState("")
  const [selectedRadius, setSelectedRadius] = React.useState("0.5rem")
  const [importModalOpen, setImportModalOpen] = React.useState(false)
  const [importedTheme, setImportedTheme] = React.useState<ImportedTheme | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasLoadedSettings, setHasLoadedSettings] = React.useState(false)

  // Load settings from database on mount (only for UI state, ThemeLoader handles actual application)
  React.useEffect(() => {
    const loadSettings = async () => {
      if (!admin?.id || hasLoadedSettings) return
      
      setIsLoading(true)
      try {
        const settings = await getCustomizerSettings(admin.id)
        
        if (settings) {
          // Only set UI state, don't re-apply themes (ThemeLoader already did that)
          // This is just to sync the customizer UI with the loaded settings
          if (settings.selectedTheme) {
            setSelectedTheme(settings.selectedTheme)
          }
          
          if (settings.selectedTweakcnTheme) {
            setSelectedTweakcnTheme(settings.selectedTweakcnTheme)
          }
          
          if (settings.selectedRadius) {
            setSelectedRadius(settings.selectedRadius)
          }
          
          if (settings.brandColors) {
            setBrandColorsValues(settings.brandColors)
          }
          
          if (settings.importedTheme) {
            setImportedTheme(settings.importedTheme)
          }
        }
        
        setHasLoadedSettings(true)
      } catch (error) {
        if (isDev) {
          // eslint-disable-next-line no-console
          console.error('Error loading customizer settings:', error)
        }
        setHasLoadedSettings(true)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (admin?.id && !hasLoadedSettings) {
      loadSettings()
    }
  }, [admin?.id, hasLoadedSettings])

  // Memoize brand colors and sidebar config to prevent unnecessary re-renders
  const brandColorsString = React.useMemo(() => JSON.stringify(brandColorsValues), [brandColorsValues])
  const sidebarConfigString = React.useMemo(() => JSON.stringify(sidebarConfig), [sidebarConfig])
  const importedThemeString = React.useMemo(() => JSON.stringify(importedTheme), [importedTheme])

  // Save settings to database when they change (debounced)
  React.useEffect(() => {
    if (!admin?.id || !hasLoadedSettings || isLoading) return
    
    const timeoutId = setTimeout(async () => {
      // Determine the actual mode to save
      // If currentTheme is 'system', use isDarkMode to determine actual mode
      // Otherwise, use currentTheme directly
      let modeToSave: 'light' | 'dark' | 'system' = currentTheme
      if (currentTheme === 'system') {
        // If system mode, save the actual current mode based on isDarkMode
        modeToSave = isDarkMode ? 'dark' : 'light'
      }
      
      await saveCustomizerSettings(admin.id, {
        selectedTheme,
        selectedTweakcnTheme,
        selectedRadius,
        mode: modeToSave,
        brandColors: brandColorsValues,
        importedTheme,
        sidebarConfig,
      })
    }, 500) // Debounce for 500ms
    
    return () => clearTimeout(timeoutId)
    // Use stable stringified values for objects to prevent dependency array size changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin?.id, selectedTheme, selectedTweakcnTheme, selectedRadius, currentTheme, isDarkMode, brandColorsString, importedThemeString, sidebarConfigString, hasLoadedSettings, isLoading])

  const handleReset = async () => {
    // Complete reset to application defaults

    // 1. Reset all state variables to initial values
    setSelectedTheme("default")
    setSelectedTweakcnTheme("")
    setSelectedRadius("0.5rem")
    setImportedTheme(null) // Clear imported theme
    setBrandColorsValues({}) // Clear brand colors state

    // 2. Completely remove all custom CSS variables
    resetTheme()

    // 3. Reset the radius to default
    applyRadius("0.5rem")

    // 4. Reset sidebar to defaults
    updateSidebarConfig({ variant: "inset", collapsible: "offcanvas", side: "left" })

    // 5. Reset theme mode to system
    setCurrentTheme("system")

    // 6. Save reset state to database
    if (admin?.id) {
      await resetCustomizerSettings(admin.id)
    }
  }

  const handleImport = (themeData: ImportedTheme) => {
    setImportedTheme(themeData)
    // Clear other selections to indicate custom import is active
    setSelectedTheme("")
    setSelectedTweakcnTheme("")

    // Apply the imported theme
    applyImportedTheme(themeData, isDarkMode)
    
    // Settings will be saved automatically via useEffect
  }

  const handleImportClick = () => {
    setImportModalOpen(true)
  }

  // Re-apply themes when theme mode changes
  // Only re-apply if settings have been loaded (to avoid overriding ThemeLoader)
  React.useEffect(() => {
    // Don't apply themes until settings are loaded (ThemeLoader handles initial load)
    if (!hasLoadedSettings || isLoading) return
    
    if (importedTheme) {
      applyImportedTheme(importedTheme, isDarkMode)
    } else if (selectedTheme) {
      applyTheme(selectedTheme, isDarkMode)
    } else if (selectedTweakcnTheme) {
      const selectedPreset = tweakcnThemes.find(t => t.value === selectedTweakcnTheme)?.preset
      if (selectedPreset) {
        applyTweakcnTheme(selectedPreset, isDarkMode)
      }
    }
  }, [isDarkMode, importedTheme, selectedTheme, selectedTweakcnTheme, applyImportedTheme, applyTheme, applyTweakcnTheme, hasLoadedSettings, isLoading])

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent
          side={sidebarConfig.side === "left" ? "right" : "left"}
          className="w-[400px] p-0 gap-0 pointer-events-auto [&>button]:hidden overflow-hidden flex flex-col"
          onInteractOutside={(e) => {
            // Prevent the sheet from closing when dialog is open
            if (importModalOpen) {
              e.preventDefault()
            }
          }}
        >
          <SheetHeader className="space-y-0 p-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-semibold">Customizer</SheetTitle>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handleReset} className="cursor-pointer h-8 w-8">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => onOpenChange(false)} className="cursor-pointer h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <SheetDescription className="text-sm text-muted-foreground sr-only">
              Customize the them and layout of your dashboard.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="py-2">
                <TabsList className="grid w-full grid-cols-2 rounded-none h-12 p-1.5">
                  <TabsTrigger value="theme" className="cursor-pointer data-[state=active]:bg-background"><Palette className="h-4 w-4 mr-1" /> Theme</TabsTrigger>
                  <TabsTrigger value="layout" className="cursor-pointer data-[state=active]:bg-background"><Layout className="h-4 w-4 mr-1" /> Layout</TabsTrigger>
                </TabsList>
                {/* <TabsList className="grid w-full grid-cols-2 rounded-none h-12 p-1.5">
                  <TabsTrigger value="theme" className="cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Palette className="h-4 w-4 mr-1" /> Theme</TabsTrigger>
                  <TabsTrigger value="layout" className="cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Layout className="h-4 w-4 mr-1" /> Layout</TabsTrigger>
                </TabsList> */}
              </div>

              <TabsContent value="theme" className="flex-1 mt-0">
                <ThemeTab
                  selectedTheme={selectedTheme}
                  setSelectedTheme={setSelectedTheme}
                  selectedTweakcnTheme={selectedTweakcnTheme}
                  setSelectedTweakcnTheme={setSelectedTweakcnTheme}
                  selectedRadius={selectedRadius}
                  setSelectedRadius={setSelectedRadius}
                  setImportedTheme={setImportedTheme}
                  onImportClick={handleImportClick}
                />
              </TabsContent>

              <TabsContent value="layout" className="flex-1 mt-0">
                <LayoutTab />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImport}
      />
    </>
  )
}

// Floating trigger button - positioned dynamically based on sidebar side
export function ThemeCustomizerTrigger({ onClick }: { onClick: () => void }) {
  const { config: sidebarConfig } = useSidebarConfig()

  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        "fixed top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer",
        sidebarConfig.side === "left" ? "right-4" : "left-4"
      )}
    >
      <Settings className="h-5 w-5" />
    </Button>
  )
}
