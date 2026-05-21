import { Globe, Heart, Home, LayoutDashboard, Search, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import type { UserRole } from "../types";

interface SidebarProps {
  isAuthenticated: boolean;
  role?: UserRole;
}

export function Sidebar({ isAuthenticated, role }: SidebarProps) {
  const navItems = [
    { to: "/", icon: Home, label: "Главная", end: true },
    { to: "/discover", icon: Globe, label: "Публичный каталог" },
    { to: "/events", icon: Search, label: "События" },
    { to: "/favorites", icon: Heart, label: "Избранное" },
    ...(isAuthenticated ? [{ to: "/dashboard", icon: LayoutDashboard, label: "Управление" }] : []),
    ...(role === "admin" ? [{ to: "/admin/users", icon: ShieldCheck, label: "Роли" }] : []),
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 z-40 hidden w-64 border-r border-border bg-sidebar lg:block">
      <nav className="px-6 py-6">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {({ isActive }) => (
                  <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </motion.div>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
