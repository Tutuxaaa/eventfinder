import { useEffect, useState } from "react";
import { CloudSun, Loader2, MapPin, Wind } from "lucide-react";
import { externalApi } from "../api";
import type { LocationInsightsDto } from "../types";
import { Card } from "./ui/card";

interface Props {
  location?: string | null;
}

export function EventLocationInsights({ location }: Props) {
  const [data, setData] = useState<LocationInsightsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;
    let ignore = false;
    setLoading(true);
    setError(null);
    externalApi
      .getLocationInsights(location)
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((err: Error) => {
        if (!ignore) setError(err.message || "Не удалось получить внешние данные");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [location]);

  if (!location) return null;

  return (
    <Card className="mb-8 p-6">
      <div className="mb-4 flex items-center gap-2">
        <CloudSun className="h-5 w-5 text-primary" />
        <h3>Внешние данные по локации</h3>
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Получаем данные внешнего API…
        </div>
      )}
      {!loading && error && <p className="text-sm text-muted-foreground">Сервис временно недоступен: {error}</p>}
      {!loading && !error && !data?.result && (
        <p className="text-sm text-muted-foreground">По этой локации пока не найдено дополнительных внешних данных.</p>
      )}
      {!loading && !error && data?.result && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {data.result.name}
              {data.result.admin1 ? `, ${data.result.admin1}` : ""}
            </div>
            {typeof data.result.current_temperature === "number" && <div>Сейчас: {data.result.current_temperature}°C</div>}
            {typeof data.result.current_wind_speed === "number" && (
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4" />
                {data.result.current_wind_speed} км/ч
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.result.daily.map((day) => (
              <div key={day.date} className="rounded-2xl border p-3">
                <p className="mb-1 text-sm font-medium">{new Date(day.date).toLocaleDateString("ru-RU")}</p>
                <p className="text-sm text-muted-foreground">{day.summary}</p>
                <p className="mt-2 text-sm">
                  {day.temperature_min ?? "—"}°C / {day.temperature_max ?? "—"}°C
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
