# EventFinder — реализация лабораторных работ №1–3

## ЛР1. Роли и права доступа

### Роли
- `user` — работает только со своими событиями и файлами
- `manager` — видит весь каталог и может редактировать любые события и их файлы
- `admin` — полный доступ к каталогу + управление ролями пользователей

### Матрица доступа
| Роль | Действия |
| --- | --- |
| user | просмотр своих событий, создание, редактирование/удаление своих событий, избранное, загрузка файлов к своим событиям |
| manager | просмотр всего каталога, редактирование любых событий, управление файлами для любых событий |
| admin | все права manager + удаление любых событий + просмотр списка пользователей + изменение ролей |

### Backend
- поле `role` добавлено в модель пользователя
- проверки прав реализованы через `AccessService` и зависимости FastAPI
- endpoint управления ролями: `PATCH /api/v1/users/{user_id}/role` (только `admin`)
- endpoint матрицы ролей: `GET /api/v1/rbac/matrix`

### Frontend
- интерфейс адаптируется к роли
- есть ролевые маршруты (`/admin/users` только для `admin`)
- действия редактирования/удаления блокируются, если роль не позволяет

## ЛР2. Access + Refresh токены

### Реализовано
- `POST /api/v1/auth/token` — вход, возвращает `access_token` и `refresh_token`
- `POST /api/v1/auth/refresh` — ротация refresh token и выдача новой пары токенов
- `POST /api/v1/auth/logout` — отзыв refresh token
- `GET /api/v1/auth/me` — текущий пользователь

### Безопасность
- `access token` короткоживущий
- `refresh token` хранится в таблице `refresh_tokens`
- при refresh старый refresh token отзывается, новый выдаётся заново
- на frontend есть централизованное хранение auth state и автоматическое обновление access token при 401

### Архитектурные паттерны
- разделение на слои: `endpoints -> services -> repositories`
- dependency injection для сервисов, репозиториев и проверок доступа

## ЛР3. UI с фильтрацией и файловым хранилищем

### Серверная фильтрация
`GET /api/v1/events/` поддерживает:
- `q`
- `category`
- `location`
- `favorites_only`
- `upcoming_only`
- `sort_by`
- `sort_order`
- `page`
- `page_size`
- `scope`

### React UI
- фильтрация минимум по 3 параметрам
- поиск
- сортировка
- пагинация
- состояние фильтров сохраняется в query params

### Файлы и object storage
- загрузка файлов к событию: `POST /api/v1/events/{event_id}/files`
- список файлов: `GET /api/v1/events/{event_id}/files`
- получение защищённой ссылки: `GET /api/v1/files/{file_id}/access`
- удаление файла: `DELETE /api/v1/files/{file_id}`

### Storage backend
Поддерживаются два режима:
- `OBJECT_STORAGE_PROVIDER=local` — локальное хранилище по умолчанию для разработки
- `OBJECT_STORAGE_PROVIDER=s3` — S3-совместимое хранилище (например MinIO)

Для локального режима ссылки тоже защищены: backend выдаёт короткоживущий tokenized URL на скачивание.

## Как создать admin или manager

### Вариант 1 — скриптом
```bash
cd api
python scripts/seed_roles.py --email admin@eventfinder.local --password Admin123! --role admin --name "Platform Admin"
python scripts/seed_roles.py --email manager@eventfinder.local --password Manager123! --role manager --name "Content Manager"
```

### Вариант 2 — через admin UI
1. Войти под `admin`
2. Открыть `/admin/users`
3. Изменить роль пользователя через dropdown

## Что показать преподавателю
1. `GET /api/v1/rbac/matrix`
2. Войти как `user`, затем как `admin`
3. Под `user` попробовать административный маршрут — получить 403
4. Под `admin` открыть `/admin/users` и сменить роль другому пользователю
5. Показать login -> access/refresh -> refresh -> logout
6. Показать каталог с фильтрами, сортировкой и pagination
7. Загрузить файл к событию, получить защищённую ссылку и открыть файл
