"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useEffect, useState } from "react"
import { useTheme } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  sidebarWidth: z.string().optional(),
  contentWidth: z.string().optional(),
})

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>

const STORAGE_KEY = "appearance-settings"

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)

  const loadPreferences = (): AppearanceFormValues => {
    const defaultTheme: "light" | "dark" | "system" = theme === "system" ? "system" : theme === "dark" ? "dark" : "light"
    
    if (typeof window === "undefined") {
      return {
        theme: defaultTheme,
        fontFamily: "",
        fontSize: "",
        sidebarWidth: "",
        contentWidth: "",
      }
    }

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.theme && ["light", "dark", "system"].includes(parsed.theme)) {
          return parsed as AppearanceFormValues
        }
        return {
          theme: defaultTheme,
          fontFamily: parsed.fontFamily || "",
          fontSize: parsed.fontSize || "",
          sidebarWidth: parsed.sidebarWidth || "",
          contentWidth: parsed.contentWidth || "",
        }
      } catch {
        return {
          theme: defaultTheme,
          fontFamily: "",
          fontSize: "",
          sidebarWidth: "",
          contentWidth: "",
        }
      }
    }

    return {
      theme: defaultTheme,
      fontFamily: "",
      fontSize: "",
      sidebarWidth: "",
      contentWidth: "",
    }
  }

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: loadPreferences(),
  })

  useEffect(() => {
    const preferences = loadPreferences()
    const typedPreferences: AppearanceFormValues = {
      ...preferences,
      theme: preferences.theme as "light" | "dark" | "system",
    }
    form.reset(typedPreferences)
    setIsLoading(false)
    
    setTimeout(() => {
      applyPreferences(typedPreferences)
    }, 100)
  }, [form])

  const applyPreferences = (data: AppearanceFormValues) => {
    if (typeof window === "undefined") return

    const root = document.documentElement

    if (data.theme) {
      if (data.theme === "system") {
        setTheme("system")
      } else {
        setTheme(data.theme)
      }
    }

    const body = document.body
    const html = document.documentElement
    
    if (data.fontFamily) {
      if (data.fontFamily === "inter") {
        html.classList.add("font-inter")
        body.style.fontFamily = "var(--font-inter), system-ui, sans-serif"
        root.style.setProperty("--font-sans", "var(--font-inter)")
      } else if (data.fontFamily === "roboto") {
        html.classList.remove("font-inter")
        body.style.fontFamily = "'Roboto', sans-serif"
        root.style.setProperty("--font-sans", "'Roboto', sans-serif")
        if (!document.querySelector('link[href*="roboto"]')) {
          const link = document.createElement('link')
          link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap'
          link.rel = 'stylesheet'
          document.head.appendChild(link)
        }
      } else if (data.fontFamily === "system") {
        html.classList.remove("font-inter")
        body.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        root.style.setProperty("--font-sans", "system-ui, sans-serif")
      }
    } else {
      html.classList.add("font-inter")
      body.style.fontFamily = ""
      root.style.setProperty("--font-sans", "var(--font-inter)")
    }

    if (data.fontSize) {
      const fontSizeMap: Record<string, string> = {
        small: "0.875rem",
        medium: "1rem",
        large: "1.125rem",
      }
      root.style.setProperty("--base-font-size", fontSizeMap[data.fontSize] || "1rem")
      document.body.style.fontSize = fontSizeMap[data.fontSize] || "1rem"
    } else {
      root.style.removeProperty("--base-font-size")
      document.body.style.fontSize = ""
    }

    if (data.sidebarWidth) {
      const widthMap: Record<string, string> = {
        compact: "12rem",
        comfortable: "16rem",
        spacious: "20rem",
      }
      const width = widthMap[data.sidebarWidth] || "16rem"
      root.style.setProperty("--sidebar-width", width)
      const sidebarWrapper = document.querySelector('[data-slot="sidebar-wrapper"]') as HTMLElement
      if (sidebarWrapper) {
        sidebarWrapper.style.setProperty("--sidebar-width", width)
      }
    } else {
      root.style.removeProperty("--sidebar-width")
    }

    if (data.contentWidth) {
      root.setAttribute("data-content-width", data.contentWidth)
      const mainContent = document.querySelector('[data-slot="sidebar-inset"]') as HTMLElement
      if (mainContent) {
        const contentWidthMap: Record<string, string> = {
          fixed: "1200px",
          fluid: "100%",
          container: "100%",
        }
        mainContent.style.maxWidth = contentWidthMap[data.contentWidth] || "100%"
      }
    } else {
      root.removeAttribute("data-content-width")
    }
  }

  function onSubmit(data: AppearanceFormValues) {
    try {
      const preferences: AppearanceFormValues = {
        theme: data.theme || "system",
        fontFamily: data.fontFamily || "",
        fontSize: data.fontSize || "",
        sidebarWidth: data.sidebarWidth || "",
        contentWidth: data.contentWidth || "",
      }
      
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      }

      applyPreferences(preferences)

      toast.success("Preferences saved successfully!")
    } catch (error) {
      toast.error("Failed to save preferences. Please try again.")
    }
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold">Appearance</h1>
          <p className="text-muted-foreground">
            Customize the appearance of the application.
          </p>
        </div>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(
              (data) => {
                onSubmit(data)
              },
              (errors) => {
                toast.error("Please fix form errors before saving")
              }
            )} 
            className="space-y-6"
          >
            {/* Theme Section */}
            <h3 className="text-lg font-medium mb-2">Theme</h3>
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value)
                        setTheme(value as "light" | "dark" | "system")
                      }}
                      value={field.value || "system"}
                      className="flex gap-4"
                    >
                      <FormItem>
                        <FormLabel className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
                          <FormControl>
                            <RadioGroupItem value="light" className="sr-only" />
                          </FormControl>
                          <div className={`rounded-md border-2 p-4 hover:border-accent transition-colors ${
                            field.value === "light" ? "border-primary" : "border-muted"
                          }`}>
                            <div className="space-y-2">
                              <div className="w-20 h-20 bg-white border rounded-md p-3">
                                <div className="space-y-2">
                                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                                  <div className="flex space-x-2">
                                    <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                                    <div className="h-2 bg-gray-200 rounded flex-1"></div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                                    <div className="h-2 bg-gray-200 rounded flex-1"></div>
                                  </div>
                                </div>
                              </div>
                              <span className="text-sm font-medium">Light</span>
                            </div>
                          </div>
                        </FormLabel>
                      </FormItem>
                      <FormItem>
                        <FormLabel className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
                          <FormControl>
                            <RadioGroupItem value="dark" className="sr-only" />
                          </FormControl>
                          <div className={`rounded-md border-2 p-4 hover:border-accent transition-colors ${
                            field.value === "dark" ? "border-primary" : "border-muted"
                          }`}>
                            <div className="space-y-2">
                              <div className="w-20 h-20 bg-gray-900 border border-gray-700 rounded-md p-3">
                                <div className="space-y-2">
                                  <div className="h-2 bg-gray-600 rounded w-3/4"></div>
                                  <div className="h-2 bg-gray-600 rounded w-1/2"></div>
                                  <div className="flex space-x-2">
                                    <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                                    <div className="h-2 bg-gray-600 rounded flex-1"></div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                                    <div className="h-2 bg-gray-600 rounded flex-1"></div>
                                  </div>
                                </div>
                              </div>
                              <span className="text-sm font-medium">Dark</span>
                            </div>
                          </div>
                        </FormLabel>
                      </FormItem>
                      <FormItem>
                        <FormLabel className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
                          <FormControl>
                            <RadioGroupItem value="system" className="sr-only" />
                          </FormControl>
                          <div className={`rounded-md border-2 p-4 hover:border-accent transition-colors ${
                            field.value === "system" ? "border-primary" : "border-muted"
                          }`}>
                            <div className="space-y-2">
                              <div className="w-20 h-20 bg-gradient-to-br from-white to-gray-900 border rounded-md p-3">
                                <div className="space-y-2">
                                  <div className="h-2 bg-gray-400 rounded w-3/4"></div>
                                  <div className="h-2 bg-gray-400 rounded w-1/2"></div>
                                  <div className="flex space-x-2">
                                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                                    <div className="h-2 bg-gray-400 rounded flex-1"></div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                                    <div className="h-2 bg-gray-400 rounded flex-1"></div>
                                  </div>
                                </div>
                              </div>
                              <span className="text-sm font-medium">System</span>
                            </div>
                          </div>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fontFamily"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Font Family</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value)
                    // Apply immediately
                    const root = document.documentElement
                    const body = document.body
                    const html = document.documentElement
                    
                    if (value === "inter") {
                      html.classList.add("font-inter")
                      body.style.fontFamily = "var(--font-inter), system-ui, sans-serif"
                      root.style.setProperty("--font-sans", "var(--font-inter)")
                    } else if (value === "roboto") {
                      html.classList.remove("font-inter")
                      body.style.fontFamily = "'Roboto', sans-serif"
                      root.style.setProperty("--font-sans", "'Roboto', sans-serif")
                      if (!document.querySelector('link[href*="roboto"]')) {
                        const link = document.createElement('link')
                        link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap'
                        link.rel = 'stylesheet'
                        document.head.appendChild(link)
                      }
                    } else {
                      html.classList.remove("font-inter")
                      body.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                      root.style.setProperty("--font-sans", "system-ui, sans-serif")
                    }
                  }} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fontSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Font Size</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value)
                    const root = document.documentElement
                    const fontSizeMap: Record<string, string> = {
                      small: "0.875rem",
                      medium: "1rem",
                      large: "1.125rem",
                    }
                    root.style.setProperty("--base-font-size", fontSizeMap[value] || "1rem")
                    document.body.style.fontSize = fontSizeMap[value] || "1rem"
                  }} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Layout Section */}
            <FormField
              control={form.control}
              name="sidebarWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sidebar Width</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value)
                    const root = document.documentElement
                    const widthMap: Record<string, string> = {
                      compact: "12rem",
                      comfortable: "16rem",
                      spacious: "20rem",
                    }
                    const width = widthMap[value] || "16rem"
                    root.style.setProperty("--sidebar-width", width)
                    const sidebarWrapper = document.querySelector('[data-slot="sidebar-wrapper"]') as HTMLElement
                    if (sidebarWrapper) {
                      sidebarWrapper.style.setProperty("--sidebar-width", width)
                    }
                  }} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder="Select sidebar width" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contentWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Width</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value)
                    const root = document.documentElement
                    root.setAttribute("data-content-width", value)
                    const mainContent = document.querySelector('[data-slot="sidebar-inset"]') as HTMLElement
                    if (mainContent) {
                      const contentWidthMap: Record<string, string> = {
                        fixed: "1200px",
                        fluid: "100%",
                        container: "100%",
                      }
                      mainContent.style.maxWidth = contentWidthMap[value] || "100%"
                    }
                  }} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder="Select content width" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="fluid">Fluid</SelectItem>
                      <SelectItem value="container">Container</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2 mt-12">
              <Button 
                type="submit" 
                className="cursor-pointer" 
                disabled={isLoading}
              >
                Save Preferences
              </Button>
              <Button 
                variant="outline" 
                type="button" 
                className="cursor-pointer"
                onClick={() => {
                  const defaultTheme: "light" | "dark" | "system" = theme === "system" ? "system" : theme === "dark" ? "dark" : "light"
                  const defaults: AppearanceFormValues = {
                    theme: defaultTheme,
                    fontFamily: "",
                    fontSize: "",
                    sidebarWidth: "",
                    contentWidth: "",
                  }
                  form.reset(defaults)
                  applyPreferences(defaults)
                  if (typeof window !== "undefined") {
                    localStorage.removeItem(STORAGE_KEY)
                  }
                  toast.success("Preferences reset - Your appearance preferences have been reset to defaults.")
                }}
              >
                Reset to Defaults
              </Button>
            </div>
          </form>
        </Form>
      </div>
  )
}
