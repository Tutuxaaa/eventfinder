import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-10 text-center text-muted-foreground">Проверяем сессию...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="rounded-3xl border bg-card p-10 text-center shadow-sm">
          <h2 className="mb-3">Недостаточно прав</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Этот раздел доступен только ролям: {roles.join(", ")}.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
