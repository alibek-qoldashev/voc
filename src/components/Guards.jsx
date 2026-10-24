import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

const Splash = () => (
  <div className="flex min-h-screen items-center justify-center bg-night">
    <Spinner />
  </div>
);

// Faqat login qilganlar uchun
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

// Welcome / Login / Sign up: login qilgan bo'lsa, to'g'ridan-to'g'ri /home ga
export function PublicOnly() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;
  return session ? <Navigate to="/home" replace /> : <Outlet />;
}
