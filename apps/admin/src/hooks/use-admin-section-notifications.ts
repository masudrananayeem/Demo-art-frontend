"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { artApi } from "@/lib/art-api"

export type AdminNotificationKey = "products" | "categories" | "subcategories" | "orders" | "messages" | "homepage" | "payments"

const STORAGE_PREFIX = "artcanvas-admin-section-notifications:v1"
const POLL_MS = 120000
const ERROR_BACKOFF_MS = 300000

const SECTION_ROUTES: Record<AdminNotificationKey, string> = {
  products: "/admin/products",
  categories: "/admin/categories",
  subcategories: "/admin/subcategories",
  orders: "/admin/orders",
  messages: "/admin/messages",
  homepage: "/admin/home",
  payments: "/admin/payments",
}

function stableSignature(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => stableSignature(item)).join("|")
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .map((key) => `${key}:${stableSignature(value[key])}`)
      .join(";")
  }
  return String(value ?? "")
}

function collectionSignature(items: any[], fields: string[] = []) {
  return (items || [])
    .map((item) => {
      if (!fields.length) return stableSignature(item)
      return fields.map((field) => `${field}=${item?.[field] ?? ""}`).join("|")
    })
    .sort()
    .join("||")
}

export function useAdminSectionNotifications(adminUid?: string, enabled = true) {
  const [unread, setUnread] = useState<Record<AdminNotificationKey, boolean>>({
    products: false,
    categories: false,
    subcategories: false,
    orders: false,
    messages: false,
    homepage: false,
    payments: false,
  })

  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}:${adminUid || "anonymous"}`,
    [adminUid]
  )

  const loadState = useCallback(() => {
    if (typeof window === "undefined") return {}
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}") } catch { return {} }
  }, [storageKey])

  const saveState = useCallback((state: any) => {
    if (typeof window === "undefined") return
    try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch {}
  }, [storageKey])

  const clear = useCallback((key: AdminNotificationKey) => {
    setUnread((current) => ({ ...current, [key]: false }))
    const state = loadState()
    if (state[key]?.signature) {
      state[key].seenSignature = state[key].signature
      saveState(state)
    }
  }, [loadState, saveState])

  useEffect(() => {
    if (!enabled || !adminUid) return
    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null

    let failures = 0
    const check = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      try {
        const [products, categories, subcategories, orders, threads, siteContent, payments] = await Promise.all([
          artApi.products(),
          artApi.categories(),
          artApi.subcategories(),
          artApi.orders(),
          artApi.threads(),
          artApi.siteContent(),
          artApi.paymentSettings(),
        ])
        if (!alive) return
        failures = 0

        const current: Record<AdminNotificationKey, string> = {
          products: collectionSignature(products || [], ["id", "updatedAt", "createdAt", "name", "price", "offerPrice", "offerEnabled"]),
          categories: collectionSignature(categories || [], ["id", "name", "updatedAt", "hidden"]),
          subcategories: stableSignature(subcategories || {}),
          orders: collectionSignature(orders || [], ["id", "status", "updatedAt", "createdAt", "total"]),
          messages: collectionSignature(threads || [], ["uid", "updatedAt", "createdAt", "lastMessageAt", "unreadCount"]),
          homepage: stableSignature(siteContent || {}),
          payments: stableSignature(payments || {}),
        }

        const previous = loadState()
        const next = { ...previous }
        const nextUnread: Record<AdminNotificationKey, boolean> = { ...unread }

        ;(Object.keys(current) as AdminNotificationKey[]).forEach((key) => {
          const entry = previous[key]
          if (!entry?.signature) {
            // First visit establishes the baseline; existing data is not shown as new.
            next[key] = { signature: current[key], seenSignature: current[key] }
            nextUnread[key] = false
          } else if (entry.signature !== current[key]) {
            next[key] = { signature: current[key], seenSignature: entry.seenSignature || entry.signature }
            nextUnread[key] = entry.seenSignature !== current[key]
          } else {
            next[key] = entry
            nextUnread[key] = entry.seenSignature !== current[key]
          }
        })

        saveState(next)
        setUnread(nextUnread)
      } catch {
        // Notifications are intentionally non-blocking. Back off aggressively on quota/network errors.
        failures += 1
        if (timer) { clearInterval(timer); timer = setInterval(check, failures >= 2 ? ERROR_BACKOFF_MS : POLL_MS) }
      }
    }

    check()
    timer = setInterval(check, POLL_MS)
    return () => {
      alive = false
      if (timer) clearInterval(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, adminUid, storageKey])

  return { unread, clear, sectionRoutes: SECTION_ROUTES }
}
