# api/scripts/index_images.py
"""
Индексатор изображений: скачивает image_url у событий, считает pHash и сохраняет image_hash в БД.
Скрипт добавляет корень проекта в sys.path, импортирует модели и вызывает Base.metadata.create_all,
чтобы гарантировать, что таблицы созданы.
"""

from pathlib import Path
import sys
import time
from io import BytesIO
import logging

# ---- Сделать доступным пакет проекта, даже если запускаем из api/ или из корня ----
HERE = Path(__file__).resolve()
# ожидаем структуру: <project_root>/api/scripts/index_images.py
# project_root = HERE.parents[2]  (если глубина меньше — fallback)
project_root = HERE.parents[2] if len(HERE.parents) >= 3 else HERE.parents[1]
api_dir = project_root / "api"

# вставляем в sys.path: сначала project_root, потом api_dir (чтобы import database, models работали)
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(api_dir))

# ---- теперь стандартные импорты проекта ----
try:
    from database import SessionLocal, engine, Base
except Exception as e:
    raise SystemExit(
        "Не удалось импортировать database. Убедись, что запускаешь из корня проекта или используешь python -m api.scripts.index_images\n"
        f"Точнее: {e}"
    )

# импорт моделей, чтобы metadata содержала таблицу events
try:
    # предполагаем, что модель лежит в api/models/event.py и объявляет Event, и сама регистрирует Base
    from models.event import Event
except Exception as e:
    raise SystemExit(
        "Не удалось импортировать models.event. Проверь файл api/models/event.py и __init__.py в папках.\n"
        f"Точнее: {e}"
    )

# third-party
try:
    import requests
    from PIL import Image
    import imagehash
except Exception as e:
    raise SystemExit("Не установлены зависимости pillow/imagehash/requests. Установи: pip install pillow imagehash requests")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ---- Гарантируем создание таблиц (если их ещё нет) ----
logging.info("Создаём таблицы (если ещё не существуют)...")
Base.metadata.create_all(bind=engine)

# ---- вспомогательные функции ----
def compute_phash_from_bytes(img_bytes: bytes, size=8):
    try:
        img = Image.open(BytesIO(img_bytes)).convert("RGB")
        # можно ресайзить перед хешем, но imagehash.phash сам масштабирует
        ph = imagehash.phash(img, hash_size=size)
        return str(ph)  # hex представление
    except Exception as e:
        logging.warning("Ошибка при вычислении pHash: %s", e)
        return None

def fetch_image_bytes(url: str, timeout=8):
    try:
        r = requests.get(url, timeout=timeout)
        r.raise_for_status()
        return r.content
    except Exception as e:
        logging.warning("Не удалось скачать %s — %s", url, e)
        return None

# ---- основной код ----
def main():
    db = SessionLocal()
    try:
        events = db.query(Event).all()
    except Exception as e:
        logging.error("Ошибка при запросе событий: %s", e)
        db.close()
        return

    logging.info("Найдено %d событий в БД", len(events))
    updated = 0
    for ev in events:
        # если нет image_url — пропускаем
        if not getattr(ev, "image_url", None):
            logging.debug("Событие %s не содержит image_url — пропускаем", getattr(ev, "id", "<no id>"))
            continue

        # если уже есть image_hash — пропускаем
        if getattr(ev, "image_hash", None):
            logging.debug("Событие %s уже проиндексировано", ev.id)
            continue

        img_bytes = fetch_image_bytes(ev.image_url)
        if not img_bytes:
            continue

        ph = compute_phash_from_bytes(img_bytes)
        if not ph:
            continue

        # записать в БД
        try:
            ev.image_hash = ph
            db.add(ev)
            db.commit()
            updated += 1
            logging.info("Indexed event %s -> %s", ev.id, ph)
            # небольшой sleep чтобы не забивать внешние хосты
            time.sleep(0.1)
        except Exception as e:
            logging.error("Ошибка записи в БД для event %s: %s", ev.id, e)
            db.rollback()

    logging.info("Индексация завершена: обновлено %d записей", updated)
    db.close()

if __name__ == "__main__":
    main()
