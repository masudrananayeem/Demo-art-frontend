"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  BarChart3,
  CalendarDays,
  Download,
  FilePlus2,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { artApi } from "@/lib/art-api"

const EXPENSE_STORAGE_KEY = "artcanvas.analytics.expenses.v1"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const STATUS_LABELS: Record<string, string> = {
  placed: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

const money = (value: number) => `৳${Math.round(value || 0).toLocaleString("en-BD")}`
const safeDate = (value: any) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function currentMonth() {
  const now = new Date()
  return monthKey(now)
}

function currentYear() {
  return String(new Date().getFullYear())
}

function readExpenses() {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EXPENSE_STORAGE_KEY) || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [year, setYear] = useState(currentYear())
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "Inventory / materials",
    amount: "",
    note: "",
  })

  useEffect(() => {
    setExpenses(readExpenses())
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError("")
    artApi.orders()
      .then((data) => { if (alive) setOrders(Array.isArray(data) ? data : []) })
      .catch((e) => { if (alive) setError(e?.message || "Could not load order analytics.") })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const availableYears = useMemo(() => {
    const years = new Set<string>([currentYear()])
    orders.forEach((order) => {
      const date = safeDate(order?.createdAt)
      if (date) years.add(String(date.getFullYear()))
    })
    expenses.forEach((item) => {
      const date = safeDate(item?.date)
      if (date) years.add(String(date.getFullYear()))
    })
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [orders, expenses])

  const yearOrders = useMemo(() => orders.filter((order) => {
    const date = safeDate(order?.createdAt)
    return date && String(date.getFullYear()) === year
  }), [orders, year])

  const yearExpenses = useMemo(() => expenses.filter((item) => {
    const date = safeDate(item?.date)
    return date && String(date.getFullYear()) === year
  }), [expenses, year])

  const monthly = useMemo(() => MONTHS.map((label, index) => {
    const key = `${year}-${String(index + 1).padStart(2, "0")}`
    const monthOrders = yearOrders.filter((order) => {
      const date = safeDate(order?.createdAt)
      return date && monthKey(date) === key
    })
    const monthExpenses = yearExpenses.filter((item) => {
      const date = safeDate(item?.date)
      return date && monthKey(date) === key
    })
    const income = monthOrders
      .filter((order) => order?.status === "delivered")
      .reduce((sum, order) => sum + Number(order?.total || 0), 0)
    const sales = monthOrders
      .filter((order) => order?.status !== "cancelled")
      .reduce((sum, order) => sum + Number(order?.total || 0), 0)
    const expense = monthExpenses.reduce((sum, item) => sum + Number(item?.amount || 0), 0)
    return { month: label, income, sales, expense, profit: income - expense, orders: monthOrders.length }
  }), [year, yearOrders, yearExpenses])

  const metrics = useMemo(() => {
    const income = monthly.reduce((sum, item) => sum + item.income, 0)
    const sales = monthly.reduce((sum, item) => sum + item.sales, 0)
    const expense = monthly.reduce((sum, item) => sum + item.expense, 0)
    const delivered = yearOrders.filter((o) => o?.status === "delivered").length
    const cancelled = yearOrders.filter((o) => o?.status === "cancelled").length
    const averageOrder = delivered ? income / delivered : 0
    return { income, sales, expense, profit: income - expense, delivered, cancelled, averageOrder }
  }, [monthly, yearOrders])

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    yearOrders.forEach((order) => {
      const status = order?.status || "placed"
      counts[status] = (counts[status] || 0) + 1
    })
    return Object.entries(STATUS_LABELS).map(([key, label]) => ({ status: label, orders: counts[key] || 0 }))
  }, [yearOrders])

  const expenseCategoryData = useMemo(() => {
    const grouped: Record<string, number> = {}
    yearExpenses.forEach((item) => {
      const category = item?.category || "Other"
      grouped[category] = (grouped[category] || 0) + Number(item?.amount || 0)
    })
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [yearExpenses])

  const paymentData = useMemo(() => {
    const grouped: Record<string, number> = {}
    yearOrders.filter((order) => order?.status === "delivered").forEach((order) => {
      const method = order?.paymentMethod === "cod" ? "Cash on delivery" : (order?.paymentMethod || "Unknown")
      grouped[method] = (grouped[method] || 0) + Number(order?.total || 0)
    })
    return Object.entries(grouped).map(([method, revenue]) => ({ method, revenue }))
  }, [yearOrders])

  const addExpense = () => {
    const amount = Number(expenseForm.amount)
    if (!expenseForm.date || !Number.isFinite(amount) || amount <= 0) return
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: expenseForm.date,
      category: expenseForm.category.trim() || "Other",
      amount,
      note: expenseForm.note.trim(),
    }
    const next = [item, ...expenses]
    setExpenses(next)
    window.localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(next))
    setExpenseForm((form) => ({ ...form, amount: "", note: "" }))
    setExpenseOpen(false)
  }

  const removeExpense = (id: string) => {
    const next = expenses.filter((item) => item.id !== id)
    setExpenses(next)
    window.localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(next))
  }

  const exportReport = () => {
    const rows = [
      ["Month", "Sales", "Delivered income", "Expenses", "Profit", "Orders"],
      ...monthly.map((item) => [item.month, item.sales, item.income, item.expense, item.profit, item.orders]),
    ]
    downloadCsv(`artcanvas-financial-analysis-${year}.csv`, rows)
  }

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-primary">ArtCanvas / Finance</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-1">Business analytics</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Analyze sales, delivered income, operating expenses and estimated profit without changing the existing order or payment workflow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-transparent text-sm outline-none">
              {availableYears.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <Button variant="outline" onClick={() => setExpenseOpen(true)}><Plus className="size-4" /> Add expense</Button>
          <Button onClick={exportReport}><Download className="size-4" /> Export CSV</Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Delivered income", metrics.income, WalletCards, "Money from delivered orders"],
          ["Operating expenses", metrics.expense, Receipt, "Expenses entered in this panel"],
          ["Estimated profit", metrics.profit, metrics.profit >= 0 ? TrendingUp : TrendingDown, "Income minus recorded expenses"],
          ["Average delivered order", metrics.averageOrder, BarChart3, `${metrics.delivered} delivered · ${metrics.cancelled} cancelled`],
        ].map(([label, value, Icon, description]: any) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{money(Number(value))}</div>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LineChartIcon className="size-4" /> Monthly financial trend</CardTitle>
            <CardDescription>Sales, delivered income, recorded expenses and profit for {year}.</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `৳${Number(v).toLocaleString("en-BD")}`} />
                <Tooltip formatter={(value: any) => money(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="sales" name="Sales" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="income" name="Delivered income" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expense" name="Expenses" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" name="Profit" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="size-4" /> Order performance</CardTitle>
            <CardDescription>Order count by current status for {year}.</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 12, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="status" tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="orders" name="Orders" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChartIcon className="size-4" /> Expense breakdown</CardTitle>
            <CardDescription>How the recorded {year} expenses are distributed.</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            {expenseCategoryData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}>
                    {expenseCategoryData.map((entry, index) => <Cell key={`${entry.name}-${index}`} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => money(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full grid place-items-center text-sm text-muted-foreground">No expenses recorded for {year} yet.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><WalletCards className="size-4" /> Delivered income by payment</CardTitle>
            <CardDescription>Revenue collected from delivered orders, grouped by payment method.</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            {paymentData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentData} layout="vertical" margin={{ top: 10, right: 12, left: 18, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `৳${Number(v).toLocaleString("en-BD")}`} />
                  <YAxis type="category" dataKey="method" width={110} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: any) => money(Number(value))} />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full grid place-items-center text-sm text-muted-foreground">No delivered income for {year} yet.</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense ledger</CardTitle>
          <CardDescription>Record business costs such as packaging, advertising, materials, delivery support or other operating expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          {yearExpenses.length ? (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-b bg-muted/30"><tr className="text-left text-xs text-muted-foreground"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Note</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3"></th></tr></thead>
                <tbody>
                  {yearExpenses.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-4 py-3">{item.date}</td><td className="px-4 py-3 font-medium">{item.category}</td><td className="px-4 py-3 text-muted-foreground">{item.note || "—"}</td><td className="px-4 py-3 text-right font-mono">{money(Number(item.amount))}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => removeExpense(item.id)} className="inline-flex size-8 items-center justify-center rounded-full border hover:bg-muted" title="Delete expense"><X className="size-4" /></button></td></tr>)}
                </tbody>
              </table>
            </div>
          ) : <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No expenses recorded for {year}. Add expenses to make the profit analysis meaningful.</div>}
          <p className="text-[11px] text-muted-foreground mt-4">Expense entries are stored locally in this admin browser so the analytics feature does not create extra Firestore reads. Order income comes from existing ArtCanvas order data.</p>
        </CardContent>
      </Card>

      {expenseOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 grid place-items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border bg-background shadow-2xl p-5">
            <div className="flex items-center justify-between"><div><h2 className="font-semibold">Add business expense</h2><p className="text-xs text-muted-foreground mt-1">This entry is used for profit analysis only.</p></div><button type="button" onClick={() => setExpenseOpen(false)} className="size-8 rounded-full border grid place-items-center"><X className="size-4" /></button></div>
            <div className="grid gap-4 mt-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Amount (৳)</Label><Input type="number" min="0" step="1" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} placeholder="1500" /></div>
              </div>
              <div className="space-y-2"><Label>Category</Label><Input value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} placeholder="Inventory / materials" /></div>
              <div className="space-y-2"><Label>Note</Label><Input value={expenseForm.note} onChange={(e) => setExpenseForm((f) => ({ ...f, note: e.target.value }))} placeholder="Packaging supplies" /></div>
              <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button><Button onClick={addExpense}><FilePlus2 className="size-4" /> Save expense</Button></div>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="fixed bottom-4 right-4 rounded-full border bg-background/95 px-3 py-2 text-xs shadow-lg">Loading analytics…</div>}
    </div>
  )
}
