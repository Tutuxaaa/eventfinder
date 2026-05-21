import { useEffect, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { usersApi } from "../api";
import type { RoleMatrixResponse, UserDto, UserRole } from "../types";
import { Card } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";

const ROLE_OPTIONS: UserRole[] = ["user", "manager", "admin"];

export function AdminUsers() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [matrix, setMatrix] = useState<RoleMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");

  async function loadData() {
    setLoading(true);
    try {
      const [userList, roleMatrix] = await Promise.all([usersApi.list(), usersApi.getRoleMatrix()]);
      setUsers(userList);
      setMatrix(roleMatrix);
    } catch (error: any) {
      setMessage(error.message || "Не удалось загрузить административные данные");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function updateRole(userId: number, role: UserRole) {
    setMessage("");
    try {
      const updated = await usersApi.updateRole(userId, role);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`Роль пользователя ${updated.email} обновлена на ${updated.role}`);
    } catch (error: any) {
      setMessage(error.message || "Не удалось обновить роль");
    }
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <h2 className="mb-1 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Администрирование ролей
        </h2>
        <p className="text-muted-foreground">
          Раздел покрывает ЛР1: матрица ролей, endpoint управления ролями и ролевое поведение интерфейса.
        </p>
      </div>

      {message && <div className="rounded-2xl border bg-card p-4 text-sm">{message}</div>}

      {matrix && (
        <Card className="p-6">
          <h3 className="mb-4">Матрица ролей и прав</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {matrix.rows.map((row) => (
              <div key={row.role} className="rounded-2xl border p-4">
                <h4 className="mb-3 capitalize">{row.role}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {row.allowed_actions.map((action) => (
                    <li key={action}>• {action}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            {matrix.notes.map((note) => (
              <p key={note}>• {note}</p>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3>Пользователи</h3>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Загрузка пользователей...</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{user.name || user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Текущая роль: {user.role}</span>
                  <Select value={user.role} onValueChange={(value: UserRole) => void updateRole(user.id, value)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => void loadData()}>
          Обновить данные
        </Button>
      </div>
    </div>
  );
}
