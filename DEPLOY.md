# Как открыть и опубликовать сайт

## Быстрый просмотр на компьютере

Сайт нельзя корректно открыть двойным щелчком по `index.html` (браузер блокирует загрузку `events.json`).

**Вариант 1 — Python (если установлен):**

```powershell
Set-Location c:\Users\Sokol\Desktop\NewProdTG\site
python -m http.server 8080
```

(В PowerShell не используй `&&` — только две строки или `;` между командами.)

Открой в браузере: **http://localhost:8080**

**Вариант 2 — расширение Live Server в VS Code / Cursor:**  
ПКМ на `index.html` → Open with Live Server.

---

## Публикация в интернет (GitHub Pages, бесплатно)

1. Создай репозиторий на GitHub (например `russia-timeline`).
2. Залей **содержимое папки `site`** (не весь NewProdTG, а именно файлы из `site`: `index.html`, `css`, `js`, `data`, `images`).
3. На GitHub: **Settings → Pages → Source**: Deploy from branch.
4. Branch: `main`, folder: **`/ (root)`** (корень репозитория).
5. Через 1–2 минуты сайт будет по адресу:  
   `https://ТВОЙ_ЛОГИН.github.io/russia-timeline/`

### Если заливаешь всю папку NewProdTG

- В Settings → Pages укажи folder: **`/site`**.
- Адрес: `https://ЛОГИН.github.io/ИМЯ_РЕПО/site/`

---

## Обновление картинок

Положи новые файлы в `images/events/` с тем же именем (`putch-1991.jpg` и т.д.), затем скопируй папку `images` в `site/images` (или обнови только изменённые файлы).

---

## Структура

```
site/
  index.html
  css/styles.css
  js/app.js
  data/events.json
  images/
    events/    ← фото событий
    eras/      ← фоны 1990, 2000, 2010
```
