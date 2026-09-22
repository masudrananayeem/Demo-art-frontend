import React from "react";
import { Navigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function AdminRoute({ children }) {
  const { user, isAdmin, authLoading } = useStore();

  if (authLoading) return <main className="px-6 py-24 text-center text-sm opacity-60">Checking your access…</main>;
  if (!user) return <Navigate to="/account" replace />;
  if (!isAdmin) {
    return (
      <main className="px-6 py-24 text-center max-w-md mx-auto">
        <h1 className="font-display italic text-2xl font-bold mb-2">Admins only</h1>
        <p className="text-sm opacity-60">This account doesn't have admin access. Ask a studio admin to grant it.</p>
      </main>
    );
  }
  return children;
}
