# PLANDA — Новогодний корпоратив с программой под ключ

Премиальный одностраничный лендинг для event-агентства PLANDA. Сделан по ТЗ `tz-lending-ny-korporativ` и аудиту 20 конкурентов.

**Live:** https://airdriverv-cloud.github.io/planda-ny-landing/  
**Repo:** https://github.com/airdriverv-cloud/planda-ny-landing

![Первый экран](preview.jpg)

## Стек

- Статический HTML + CSS + vanilla JS, без сборки и зависимостей.
- Адаптив: 1440 / 1024 / 768 / 390 / 360.
- Интерактив: квиз из 5 шагов, калькулятор сметы, табы программы, FAQ, мобильное меню, cookie-баннер.
- Готов к GitHub Pages / Netlify / Vercel / любому nginx.

## Локальный запуск

```bash
python -m http.server 8000
# открыть http://127.0.0.1:8000
```

Или просто открыть `index.html` в браузере (всё работает без сервера, кроме внешних форм).

## Структура

```
index.html          — разметка и контент
styles.css          — дизайн-система и адаптив
app.js              — меню, табы, калькулятор, квиз, отправка заявки
config.js           — адрес API для заявок
api/lead.js         — serverless-функция: Telegram + email + CRM
.env.example        — переменные окружения для Vercel
vercel.json         — конфиг деплоя
assets/img/         — изображения (AI-generated демо-визуалы)
```

## Заявки: как подключить

На GitHub Pages нет backend, поэтому live-версия **честно показывает ошибку**, если API ещё не подключён. Демо-успех можно включить только локально: `http://localhost:8000/?demo=1`.

Рабочая схема — Vercel Function `api/lead.js`:

1. Импортируйте репозиторий в Vercel (Framework Preset: **Other**, root — корень проекта).
2. Добавьте переменные окружения из `.env.example`. Нужен хотя бы один канал: Telegram, Resend или CRM-webhook.
3. Задеплойте. Адрес функции будет `https://<project>.vercel.app/api/lead`.
4. Впишите его в `config.js`:

```js
window.PLANDA_CONFIG = {
  leadEndpoint: "https://<project>.vercel.app/api/lead",
  demoMode: false
};
```

5. Запушьте `config.js` — GitHub Pages обновится, форма начнёт отправлять заявки.

Для Vercel-домена `*.vercel.app` endpoint подхватывается автоматически (`/api/lead`), но для своего домена лучше указать явно.

Поддерживаемые каналы:

- **Telegram** — `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- **Email** — `RESEND_API_KEY`, `LEAD_EMAIL_TO`, `LEAD_EMAIL_FROM`.
- **CRM** — `CRM_WEBHOOK_URL`, опционально `CRM_AUTH_HEADER`.

Функция проверяет имя, телефон, согласие, число гостей, honeypot и CORS. Если ни один канал не настроен — возвращает `503`, а не фейковый успех.

## Что важно перед публикацией

1. **Заявки.** Пока `leadEndpoint` пуст, live-форма не отправляет данные. Подключите Vercel-функцию по инструкции выше.
2. **Кейсы, отзывы и цифры — демонстрационный контент.** Перед продакшеном замените на подтверждённые кейсы, реальные отзывы и согласованные цифры. Логотипы клиентов публикуйте только с разрешения.
3. **Фото — AI-generated демо-визуалы.** Для продакшена замените на реальные съёмки PLANDA (зимние, вечерние, с гостями и площадками).
4. **Цены — рыночные ориентиры из ТЗ.** Подтвердите у коммерческого директора; не публикуйте без согласования.
5. **Юридика.** Добавьте реальные ссылки на политику, согласие и cookie; проверьте 152-ФЗ.
6. **Аналитика.** Подключите Метрику, цели `quiz_complete`, `lead`, `phone_click`, `messenger_click`, `calc_use`; UTM-метки и CRM.

## Деплой на GitHub Pages

```bash
git init
git add .
git commit -m "feat: PLANDA New Year corporate landing"
gh repo create planda-ny-landing --public --source=. --remote=origin --push
```

Затем в настройках репозитория: **Settings → Pages → Deploy from a branch → main / root**.

## Лицензия

Код — для внутреннего использования PLANDA. Изображения сгенерированы для демо и не являются документальными фотографиями событий.
