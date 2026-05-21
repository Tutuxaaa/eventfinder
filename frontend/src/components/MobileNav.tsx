import { Globe, Heart, Home, LayoutDashboard, Search, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { UserRole } from "../types";

interface MobileNavProps {
  isAuthenticated: boolean;
  role?: UserRole;
}

export function MobileNav({ isAuthenticated, role }: MobileNavProps) {
  const navItems = [
    { to: "/", icon: Home, label: "Главная", end: true },
    { to: "/discover", icon: Globe, label: "Каталог" },
    { to: "/events", icon: Search, label: "События" },
    { to: "/favorites", icon: Heart, label: "Избранное" },
    ...(isAuthenticated ? [{ to: "/dashboard", icon: LayoutDashboard, label: "Кабинет" }] : []),
    ...(role === "admin" ? [{ to: "/admin/users", icon: ShieldCheck, label: "Роли" }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div className="flex items-center justify-around px-4 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {({ isActive }) => (
                <div className={`flex flex-col items-center gap-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{item.label}</span>
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
