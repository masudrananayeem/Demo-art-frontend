"use client"

import React from 'react'
import { useAdminAuth } from '@/contexts/admin-auth-context'
import { getCustomizerSettings, type CustomizerSettings } from '@/lib/firebase/services/admin-customizer-settings'
import { useThemeManager } from '@/hooks/use-theme-manager'
import { useSidebarConfig } from '@/contexts/sidebar-context'
import { useTheme } from '@/hooks/use-theme'
import { tweakcnThemes, colorThemes } from '@/config/theme-data'
import { isDev } from '@/lib/env'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

/**
 * Component that automatically loads and applies theme customizer settings
 * when an admin logs in. This ensures themes persist across sessions.
 * Optimized to only show loading spinner when theme actually needs to be applied.
 */
export function ThemeLoader() {
  const { admin } = useAdminAuth()
  const { theme: currentTheme, setTheme: setCurrentTheme } = useTheme()
  const { applyTheme, applyTweakcnTheme, applyImportedTheme, applyRadius, setBrandColorsValues, isDarkMode } = useThemeManager()
  const { updateConfig: updateSidebarConfig } = useSidebarConfig()
  const [hasLoaded, setHasLoaded] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(() => {
    // Initialize isLoading from sessionStorage to prevent spinner flash
    if (typeof window === 'undefined') return false
    // We can't check admin.id here, so we'll check in useLayoutEffect
    return false
  })
  const hasCheckedSessionRef = React.useRef(false)
  const LOCAL_STORAGE_SETTINGS_KEY_PREFIX = 'artcanvas-admin-theme-settings-'
  
  // Check sessionStorage synchronously before render to prevent initial spinner flash
  // This only prevents the flash - we still verify and apply theme in useEffect
  React.useLayoutEffect(() => {
    if (!admin?.id || typeof window === 'undefined' || hasCheckedSessionRef.current) return
    
    const SESSION_STORAGE_KEY = `theme-loaded-${admin.id}`
    const sessionLoaded = sessionStorage.getItem(SESSION_STORAGE_KEY)
    
    if (sessionLoaded === 'true') {
      // Temporarily set isLoading to false to prevent initial flash
      // The useEffect will verify and apply if needed
      setIsLoading(false)
    }

    // Try to synchronously apply cached customizer settings so that
    // skeletons/loading states render with the user's theme instead
    // of the default theme on first paint.
    try {
      const LOCAL_STORAGE_KEY = `${LOCAL_STORAGE_SETTINGS_KEY_PREFIX}${admin.id}`
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY)

      if (cached) {
        const settings: CustomizerSettings | null = JSON.parse(cached)

        if (settings) {
          // 1) Apply mode to ThemeProvider
          if (settings.mode) {
            setCurrentThemeRef.current(settings.mode)
          }

          // Helper to compute dark mode from settings.mode
          const calculateDarkMode = (mode?: 'light' | 'dark' | 'system'): boolean => {
            const modeToCheck = mode || 'system'
            if (modeToCheck === 'dark') return true
            if (modeToCheck === 'light') return false
            if (modeToCheck === 'system') {
              return window.matchMedia("(prefers-color-scheme: dark)").matches
            }
            return false
          }

          const shouldBeDark = calculateDarkMode(settings.mode)

          // 2) Apply theme preset/imported theme
          if (settings.importedTheme) {
            applyImportedThemeRef.current(settings.importedTheme, shouldBeDark)
          } else if (settings.selectedTweakcnTheme) {
            const selectedPreset = tweakcnThemes.find(t => t.value === settings.selectedTweakcnTheme)?.preset
            if (selectedPreset) {
              applyTweakcnThemeRef.current(selectedPreset, shouldBeDark)
            }
          } else if (settings.selectedTheme) {
            applyThemeRef.current(settings.selectedTheme, shouldBeDark)
          }

          // 3) Apply radius
          if (settings.selectedRadius) {
            applyRadiusRef.current(settings.selectedRadius as string)
          }

          // 4) Apply brand colors
          if (settings.brandColors && Object.keys(settings.brandColors).length > 0) {
            setBrandColorsValuesRef.current(settings.brandColors)
            Object.entries(settings.brandColors).forEach(([cssVar, value]) => {
              document.documentElement.style.setProperty(cssVar, value)
            })
          }

          // 5) Apply sidebar config
          if (settings.sidebarConfig) {
            const sidebarConfigUpdate: Partial<{
              variant: "sidebar" | "floating" | "inset"
              collapsible: "offcanvas" | "icon" | "none"
              side: "left" | "right"
            }> = {}

            if (settings.sidebarConfig.variant && ['sidebar', 'floating', 'inset'].includes(settings.sidebarConfig.variant)) {
              sidebarConfigUpdate.variant = settings.sidebarConfig.variant as "sidebar" | "floating" | "inset"
            }
            if (settings.sidebarConfig.collapsible && ['offcanvas', 'icon', 'none'].includes(settings.sidebarConfig.collapsible)) {
              sidebarConfigUpdate.collapsible = settings.sidebarConfig.collapsible as "offcanvas" | "icon" | "none"
            }
            if (settings.sidebarConfig.side && ['left', 'right'].includes(settings.sidebarConfig.side)) {
              sidebarConfigUpdate.side = settings.sidebarConfig.side as "left" | "right"
            }

            if (Object.keys(sidebarConfigUpdate).length > 0) {
              updateSidebarConfigRef.current(sidebarConfigUpdate)
            }
          }
        }
      }
    } catch {
      // Ignore local cache errors; the dashboard can use the default theme.
    }
    
    hasCheckedSessionRef.current = true
  }, [admin?.id])

  // Use refs to store function references to prevent dependency array changes
  const applyThemeRef = React.useRef(applyTheme)
  const applyTweakcnThemeRef = React.useRef(applyTweakcnTheme)
  const applyImportedThemeRef = React.useRef(applyImportedTheme)
  const applyRadiusRef = React.useRef(applyRadius)
  const setBrandColorsValuesRef = React.useRef(setBrandColorsValues)
  const updateSidebarConfigRef = React.useRef(updateSidebarConfig)
  const setCurrentThemeRef = React.useRef(setCurrentTheme)
  const previousAdminRef = React.useRef<ReturnType<typeof useAdminAuth>["admin"] | null>(null)

  // Update refs when functions change
  React.useEffect(() => {
    applyThemeRef.current = applyTheme
    applyTweakcnThemeRef.current = applyTweakcnTheme
    applyImportedThemeRef.current = applyImportedTheme
    applyRadiusRef.current = applyRadius
    setBrandColorsValuesRef.current = setBrandColorsValues
    updateSidebarConfigRef.current = updateSidebarConfig
    setCurrentThemeRef.current = setCurrentTheme
  }, [applyTheme, applyTweakcnTheme, applyImportedTheme, applyRadius, setBrandColorsValues, updateSidebarConfig, setCurrentTheme])

  // Helper function to create a hash of settings for comparison
  const createSettingsHash = React.useCallback((settings: CustomizerSettings | null): string => {
    if (!settings) return 'no-settings'
    
    const hashData = {
      selectedTheme: settings.selectedTheme || '',
      selectedTweakcnTheme: settings.selectedTweakcnTheme || '',
      importedTheme: settings.importedTheme ? JSON.stringify(settings.importedTheme) : '',
      mode: settings.mode || 'system',
      selectedRadius: settings.selectedRadius || '',
      brandColors: settings.brandColors ? JSON.stringify(settings.brandColors) : '',
      sidebarConfig: settings.sidebarConfig ? JSON.stringify(settings.sidebarConfig) : '',
    }
    
    // Simple hash function
    const hashString = JSON.stringify(hashData)
    let hash = 0
    for (let i = 0; i < hashString.length; i++) {
      const char = hashString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString()
  }, [])

  // Helper function to check if theme is already applied in DOM
  const isThemeAlreadyApplied = React.useCallback((settings: CustomizerSettings | null): boolean => {
    if (!settings || typeof window === 'undefined') return false
    
    const root = document.documentElement
    
    // Check theme mode
    const calculateDarkMode = (mode?: 'light' | 'dark' | 'system'): boolean => {
      const modeToCheck = mode || 'system'
      if (modeToCheck === 'dark') return true
      if (modeToCheck === 'light') return false
      if (modeToCheck === 'system') {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
      }
      return false
    }
    
    const shouldBeDark = calculateDarkMode(settings.mode)
    const currentDarkMode = root.classList.contains('dark')
    
    // Check if dark mode matches
    if (shouldBeDark !== currentDarkMode) {
      return false
    }
    
    // Check radius
    if (settings.selectedRadius) {
      const currentRadius = root.style.getPropertyValue('--radius')
      if (currentRadius && currentRadius !== settings.selectedRadius) {
        return false
      }
    }
    
    // Check brand colors
    if (settings.brandColors && Object.keys(settings.brandColors).length > 0) {
      for (const [cssVar, value] of Object.entries(settings.brandColors)) {
        const currentValue = root.style.getPropertyValue(cssVar)
        if (currentValue && currentValue !== value) {
          return false
        }
      }
    }
    
    // Check theme variables - sample a few key variables to see if theme is applied
    let themeStyles: Record<string, string> | null = null
    
    if (settings.importedTheme) {
      themeStyles = shouldBeDark ? settings.importedTheme.dark : settings.importedTheme.light
    } else if (settings.selectedTweakcnTheme) {
      const selectedPreset = tweakcnThemes.find(t => t.value === settings.selectedTweakcnTheme)?.preset
      if (selectedPreset) {
        themeStyles = shouldBeDark ? selectedPreset.styles.dark : selectedPreset.styles.light
      }
    } else if (settings.selectedTheme) {
      const selectedPreset = colorThemes.find(t => t.value === settings.selectedTheme)?.preset
      if (selectedPreset) {
        themeStyles = shouldBeDark ? selectedPreset.styles.dark : selectedPreset.styles.light
      }
    }
    
    // If we have theme styles, check if key variables match
    if (themeStyles) {
      // Check a few key variables to verify theme is applied
      const keyVars = ['background', 'foreground', 'primary', 'primary-foreground']
      let allMatch = true
      for (const keyVar of keyVars) {
        const expectedValue = themeStyles[keyVar]
        if (expectedValue) {
          const currentValue = root.style.getPropertyValue(`--${keyVar}`)
          // Only check if currentValue exists (theme was applied)
          // If it doesn't exist, it means theme wasn't applied yet
          if (currentValue && currentValue !== expectedValue) {
            allMatch = false
            break
          } else if (!currentValue) {
            // Theme variable not set - theme not applied
            allMatch = false
            break
          }
        }
      }
      if (!allMatch) {
        return false
      }
    } else {
      // No theme selected - check if any custom CSS variables are set
      // If there are custom variables, it means a theme was applied
      const hasCustomVars = root.style.getPropertyValue('--background') || 
                            root.style.getPropertyValue('--foreground') ||
                            root.style.getPropertyValue('--primary')
      // If no theme is selected but custom vars exist, it's inconsistent - return false to re-apply
      if (hasCustomVars) {
        return false
      }
    }
    return true
  }, [])

  React.useEffect(() => {
    // Load theme settings when admin is available
    if (!admin?.id) return
    
    const SESSION_STORAGE_KEY = `theme-loaded-${admin.id}`
    
    // Only proceed if not already loaded (hasLoaded prevents re-running)
    // hasCheckedSessionRef is just for useLayoutEffect, don't block here
    if (hasLoaded) return
    
    const loadThemeSettings = async () => {
      const SETTINGS_HASH_KEY = `theme-settings-hash-${admin.id}`
      
      // Check sessionStorage first - if loaded, verify theme is still in DOM
      const sessionLoaded = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null
      const savedHash = typeof window !== 'undefined' ? sessionStorage.getItem(SETTINGS_HASH_KEY) : null
      
      try {
        // Fetch settings first (without showing spinner)
        const settings = await getCustomizerSettings(admin.id)
        
        // Create hash of current settings
        const currentHash = createSettingsHash(settings)
        
        // If no settings exist, just mark as loaded without showing spinner
        if (!settings) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
            sessionStorage.setItem(SETTINGS_HASH_KEY, currentHash)
          }
          setHasLoaded(true)
          setIsLoading(false)
          return
        }
        
        // Simple logic: If sessionStorage says loaded, skip entirely (trust it)
        // Only apply if sessionStorage doesn't say loaded OR hash changed (settings updated)
        const isFirstLoad = sessionLoaded !== 'true'
        const hashChanged = savedHash !== null && savedHash !== currentHash
        
        // Debug-only load check previously logged here; removed for production cleanliness.
        
        if (!isFirstLoad && !hashChanged) {
          // Session says loaded and hash matches - apply silently (no spinner)
          // On page refresh, DOM is empty so we need to apply, but silently
          // Don't set isLoading to true - apply theme silently
          // Don't add theme-loading class - apply without visual indication
        } else {
          // First time load or settings changed - show spinner and apply
          setIsLoading(true)
          // Add theme-loading class to prevent transitions during loading
          document.documentElement.classList.add('theme-loading')
        }
        
        // Step 1: Always set the theme mode first if it exists in settings
        // This ensures the mode is correct even if it matches currentTheme
        if (settings.mode) {
          setCurrentThemeRef.current(settings.mode)
          // Wait for theme mode to be applied to DOM (theme provider needs time)
          // Use requestAnimationFrame to ensure DOM updates are complete
          await new Promise(resolve => {
            requestAnimationFrame(() => {
              setTimeout(resolve, 350)
            })
          })
        }
        
        // Step 2: Calculate dark mode state based on saved settings mode
        // Re-check after mode is set to ensure accuracy
        const calculateDarkMode = (mode?: 'light' | 'dark' | 'system'): boolean => {
          const modeToCheck = mode || 'system'
          if (modeToCheck === 'dark') return true
          if (modeToCheck === 'light') return false
          if (modeToCheck === 'system') {
            return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
          }
          return false
        }
        
        // Use saved mode for dark mode calculation (not currentTheme which might be stale)
        const shouldBeDark = calculateDarkMode(settings.mode)
        
        // Step 3: Wait a bit more to ensure DOM is ready and theme mode is fully applied
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Step 4: Apply themes in priority order: imported > tweakcn > shadcn
        // Always apply if a theme exists in settings, even if mode matches
        if (settings.importedTheme) {
          applyImportedThemeRef.current(settings.importedTheme, shouldBeDark)
          // Wait for requestAnimationFrame to complete and DOM to update
          await new Promise(resolve => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setTimeout(resolve, 150)
              })
            })
          })
        } else if (settings.selectedTweakcnTheme) {
          const selectedPreset = tweakcnThemes.find(t => t.value === settings.selectedTweakcnTheme)?.preset
          if (selectedPreset) {
            applyTweakcnThemeRef.current(selectedPreset, shouldBeDark)
            // Wait for DOM to update - theme is applied synchronously now, but give it time to render
            await new Promise(resolve => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setTimeout(resolve, 200)
                })
              })
            })
            // Double-check that theme was applied by verifying CSS variables (previously logged in dev only).
          }
        } else if (settings.selectedTheme) {
          applyThemeRef.current(settings.selectedTheme, shouldBeDark)
          // Wait for requestAnimationFrame to complete and DOM to update
          await new Promise(resolve => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setTimeout(resolve, 150)
              })
            })
          })
        }
        
        // Step 5: Apply radius (can be applied independently, but after theme is applied)
        if (settings.selectedRadius) {
          // Use requestAnimationFrame to ensure it's applied after theme styles
          requestAnimationFrame(() => {
            applyRadiusRef.current(settings.selectedRadius as string)
          })
          // Small delay to ensure radius is applied
          await new Promise(resolve => setTimeout(resolve, 50))
        }
        
        // Step 6: Apply brand colors (these can be applied on top of themes)
        // Brand colors override theme colors, so apply them after themes
        if (settings.brandColors && Object.keys(settings.brandColors).length > 0) {
          setBrandColorsValuesRef.current(settings.brandColors)
          // Apply brand colors to DOM with proper timing
          await new Promise(resolve => {
            requestAnimationFrame(() => {
              Object.entries(settings.brandColors!).forEach(([cssVar, value]) => {
                document.documentElement.style.setProperty(cssVar, value)
              })
              setTimeout(resolve, 50)
            })
          })
        }
        
        // Step 7: Apply sidebar config (layout settings)
        if (settings.sidebarConfig) {
          const sidebarConfigUpdate: Partial<{
            variant: "sidebar" | "floating" | "inset"
            collapsible: "offcanvas" | "icon" | "none"
            side: "left" | "right"
          }> = {}
          
          if (settings.sidebarConfig.variant && ['sidebar', 'floating', 'inset'].includes(settings.sidebarConfig.variant)) {
            sidebarConfigUpdate.variant = settings.sidebarConfig.variant as "sidebar" | "floating" | "inset"
          }
          if (settings.sidebarConfig.collapsible && ['offcanvas', 'icon', 'none'].includes(settings.sidebarConfig.collapsible)) {
            sidebarConfigUpdate.collapsible = settings.sidebarConfig.collapsible as "offcanvas" | "icon" | "none"
          }
          if (settings.sidebarConfig.side && ['left', 'right'].includes(settings.sidebarConfig.side)) {
            sidebarConfigUpdate.side = settings.sidebarConfig.side as "left" | "right"
          }
          
          if (Object.keys(sidebarConfigUpdate).length > 0) {
            updateSidebarConfigRef.current(sidebarConfigUpdate)
          }
        }
        
        // Step 8: Cache settings locally so we can apply them
        // synchronously on the next load to avoid default-theme flashes.
        if (typeof window !== 'undefined') {
          try {
            const LOCAL_STORAGE_KEY = `${LOCAL_STORAGE_SETTINGS_KEY_PREFIX}${admin.id}`
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings))
          } catch {
            // Ignore cache write errors
          }
        }

        // Step 9: Final wait to ensure all theme customizations are fully applied
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(resolve, 200)
            })
          })
        })
        
        // Remove theme-loading class to enable smooth transitions (only if we added it)
        if (isFirstLoad || hashChanged) {
          // Do this after all styles are applied
          requestAnimationFrame(() => {
            document.documentElement.classList.remove('theme-loading')
          })
          
          // Small delay to ensure smooth fade-out of loading spinner
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        // Mark as loaded in sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
          sessionStorage.setItem(SETTINGS_HASH_KEY, currentHash)
        }
        
        setHasLoaded(true)
        setIsLoading(false)
      } catch (error) {
        document.documentElement.classList.remove('theme-loading')
        setHasLoaded(true)
        setIsLoading(false)
      }
    }
    
    // Load settings when admin is available and not yet loaded
    if (admin?.id && !hasLoaded) {
      loadThemeSettings()
    }
  }, [admin?.id, hasLoaded, createSettingsHash, isThemeAlreadyApplied])

  // Reset hasLoaded and clear sessionStorage when admin changes (logout/login)
  // Only clear theme session state when transitioning from a logged-in admin to logged-out.
  // This avoids wiping the per-tab theme cache on a simple page refresh before auth resolves.
  React.useEffect(() => {
    const previousAdmin = previousAdminRef.current

    // Transition: logged-in -> logged-out
    if (previousAdmin && !admin) {
      setHasLoaded(false)
      setIsLoading(false)

      // Clear all theme-related sessionStorage entries for this tab
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && (key.startsWith('theme-loaded-') || key.startsWith('theme-settings-hash-'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
      }
    }

    // Update ref for next render
    previousAdminRef.current = admin
  }, [admin])

  // Show loading spinner while theme is loading
  // Double-check sessionStorage before showing spinner to prevent flash on refresh
  const shouldShowSpinner = React.useMemo(() => {
    if (!isLoading) return false
    if (!admin?.id || typeof window === 'undefined') return isLoading
    
    const SESSION_STORAGE_KEY = `theme-loaded-${admin.id}`
    const sessionLoaded = sessionStorage.getItem(SESSION_STORAGE_KEY)
    
    // Don't show spinner if already loaded in session
    if (sessionLoaded === 'true') {
      return false
    }
    
    return isLoading
  }, [isLoading, admin?.id])
  
  if (shouldShowSpinner) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <LoadingSpinner size="lg" showContainer={false} className="border-primary" />
          <p className="text-sm font-medium text-foreground animate-pulse">Applying your theme...</p>
        </div>
      </div>
    )
  }

  return null
}
