import { Home, Search, Heart } from "lucide-react";
import { motion } from "motion/react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const navItems = [
    { id: "home", icon: Home, label: "Главная" },
    { id: "feed", icon: Search, label: "События" },
    { id: "favorites", icon: Heart, label: "Избранное" },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 border-r border-border bg-sidebar z-40 hidden lg:block">
      <nav className="px-6 py-6">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
