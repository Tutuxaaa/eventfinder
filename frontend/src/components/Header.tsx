import { Camera, LogOut, Shield, User } from "lucide-react";
import { Button } from "./ui/button";
import type { UserDto } from "../types";

interface HeaderProps {
  onAuthClick: () => void;
  user: UserDto | null;
  onLogout: () => Promise<void>;
}

export function Header({ onAuthClick, user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6 lg:px-6">
        <div className="flex items-center gap-3 lg:w-64">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 flex-shrink-0">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="leading-none">EventFinder</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Event catalog with RBAC, tokens and object storage</p>
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border px-3 py-1 text-xs md:flex">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="uppercase tracking-wide text-muted-foreground">{user.role}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium leading-none">{user.name || "Пользователь"}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void onLogout()} title="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button onClick={onAuthClick} className="bg-primary hover:bg-primary/90">
            <User className="mr-2 h-4 w-4" />
            Войти
          </Button>
        )}
      </div>
    </header>
  );
}
