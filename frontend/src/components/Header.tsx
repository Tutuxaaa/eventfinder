import { Camera, User, LogOut } from "lucide-react"; // Добавили иконку LogOut
import { Button } from "./ui/button";

// Описываем тип пользователя, совпадающий с AuthContext
interface UserType {
  id: number;
  email: string;
  name?: string;
}

interface HeaderProps {
  onAuthClick: () => void;
  user: UserType | null; // Принимаем объект пользователя или null
  onLogout: () => void;  // Функция для выхода
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
            <p className="text-xs text-muted-foreground hidden sm:block">Найди событие по фото</p>
          </div>
        </div>

        {/* --- ЛОГИКА ОТОБРАЖЕНИЯ --- */}
        {user ? (
          // ЕСЛИ ПОЛЬЗОВАТЕЛЬ ЗАЛОГИНЕН
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium leading-none">
                {user.name || "Пользователь"}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout} title="Выйти">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          // ЕСЛИ ПОЛЬЗОВАТЕЛЬ НЕ ЗАЛОГИНЕН
          <Button onClick={onAuthClick} className="bg-primary hover:bg-primary/90">
            <User className="mr-2 h-4 w-4" />
            Войти
          </Button>
        )}
      </div>
    </header>
  );
}