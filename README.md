# EventFinder — лабораторные работы 4–6

Это доработанный проект **EventFinder** на основе уже реализованных ЛР1–3. В этой версии добавлены требования для:

- **ЛР4** — SEO-оптимизация и интеграция стороннего API;
- **ЛР5** — комплексное тестирование frontend и backend;
- **ЛР6** — контейнеризация и автоматизация развертывания.

## Что реализовано

### ЛР4
- публичный SEO-каталог `/discover`;
- публичная SEO-страница события `/discover/:eventId`;
- динамические `<title>` и `<meta name="description">`;
- canonical URL;
- Open Graph meta;
- JSON-LD для `CollectionPage` и `Event`;
- `robots.txt`;
- `sitemap.xml`;
- корректная страница `404`;
- интеграция внешнего API `/api/v1/external/location-insights`;
- graceful degradation: если внешний сервис недоступен, интерфейс не падает.

### ЛР5
- backend-тесты на auth/public/seo/external;
- frontend unit-тесты и e2e smoke.

### ЛР6
- Dockerfile для FastAPI;
- Dockerfile для React + Nginx;
- `docker-compose.yml`;
- `.dockerignore`;
- `.env.example`;
- CI workflow.

## Запуск
```bash
docker compose up --build
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:8000`  
Swagger: `http://localhost:8000/docs`

## Что говорить преподавателю
Я расширил существующий MVP после ЛР1–3, а не делал новый проект с нуля. Для ЛР4 выделил публичные индексируемые страницы, добавил мета-теги, canonical, Open Graph, JSON-LD, `robots.txt` и `sitemap.xml`, а внешний API подключил через backend-adapter. Для ЛР5 добавил backend и frontend проверки. Для ЛР6 разделил frontend/backend по контейнерам, настроил multi-stage сборку, healthcheck и локальный запуск одной командой.


## Важно про Docker volume

В backend-контейнере путь `/app/storage` нельзя использовать как bind mount для загружаемых файлов, потому что внутри приложения там лежит Python-пакет `storage` с модулем `backends.py`. Если смонтировать volume поверх `/app/storage`, Docker скроет существующие файлы контейнера в этой директории. Поэтому данные вынесены в отдельный путь `/data/storage`, а переменная `LOCAL_STORAGE_DIR` тоже указывает на `/data/storage`.

## Исправления фильтрации и проверка

В этой версии исправлена реализация пункта ЛР3 про фильтрацию:

- публичный каталог `/discover` теперь имеет форму фильтров с поиском, категорией, локацией, диапазоном дат, сортировкой, переключателем будущих событий и пагинацией;
- состояние фильтров сохраняется в query params, поэтому ссылку вида `/discover?q=jazz&category=Концерты&page=2` можно открыть повторно и получить тот же результат;
- backend `/api/v1/events/` и `/api/v1/public/events` принимает `q`, `category`, `location`, `date_from`, `date_to`, `upcoming_only`, `sort_by`, `sort_order`, `page`, `page_size`;
- фильтрация по кириллице стала устойчивее: например, `category=кон` теперь находит `Концерты`;
- добавлены backend-тесты на поиск, фильтрацию, сортировку и пагинацию;
- unit-тесты frontend больше не пытаются запускать Playwright E2E-файлы через Vitest.

Проверено:

```bash
pytest -q
# 4 passed

cd frontend
npm test
# 2 files, 4 tests passed

npm run build
# production build OK
```
