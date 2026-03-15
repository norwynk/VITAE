import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Login from '@/pages/Login'
import Layout from '@/components/ui/Layout'
import Dashboard from '@/pages/Dashboard'
import Suppliers from '@/pages/Suppliers'
import AddSupplier from '@/pages/AddSupplier'
import SupplierDetail from '@/pages/SupplierDetail'
import Settings from '@/pages/Settings'
import FindSuppliers from '@/pages/FindSuppliers'

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    </div>
  )
}

/** Redirects to /login if not authenticated. */
function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Redirects to / if already authenticated. */
function PublicRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/new" element={<AddSupplier />} />
          <Route path="/suppliers/:id" element={<SupplierDetail />} />
          <Route path="/suppliers/:id/edit" element={<AddSupplier />} />
          <Route path="/find-suppliers" element={<FindSuppliers />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm',
            success: { duration: 3000 },
            error: { duration: 5000 },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
