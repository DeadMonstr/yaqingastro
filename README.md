# Yaqin Gastro Cafe

Сайт кафе Yaqin Gastro Cafe (NRG U-Tower, Ташкент) на трёх языках (UZ, RU, EN) и кабинет `/admin`, в котором владелец сам ведёт меню и содержимое главной страницы.

Node.js 22, Fastify, SQLite (`better-sqlite3`), обработка фото через `sharp`.

## Запуск локально

Нужен Node.js 22 или новее.

```bash
npm i
cp .env.example .env
```

Откройте `.env` и для локального запуска поменяйте:

```
NODE_ENV=development
PUBLIC_URL=http://localhost:3000
TRUST_PROXY=false
ADMIN_LOGIN=admin
ADMIN_PASSWORD=<пароль не короче 8 символов>
```

`SESSION_SECRET` в режиме `development` можно не задавать. Запуск с перечитыванием при правках:

```bash
node --env-file=.env --watch src/server.js
```

Это то же самое, что `npm run dev`, но с чтением `.env`: сам `npm run dev` файл `.env` не читает, поэтому без `--env-file` переменные придётся передавать в командной строке:

```bash
ADMIN_LOGIN=admin ADMIN_PASSWORD='пароль-не-короче-8' npm run dev
```

Сайт откроется на <http://localhost:3000>, кабинет — на <http://localhost:3000/admin>. База и фото лежат в `./data`. Тесты: `npm test`.

## Запуск на VPS (Docker)

Нужны Docker и Docker Compose.

```bash
git clone <адрес репозитория> yaqin && cd yaqin
mkdir -p data
cp .env.example .env
```

1. Создайте папку `data` сами, до первого запуска. Если её нет, Docker создаст её от имени root, а приложение работает от пользователя `node` (uid 1000) и не сможет открыть базу. Если ваш пользователь на сервере не uid 1000, выполните `sudo chown 1000:1000 data`.
2. Заполните `.env`:
   - `SESSION_SECRET` обязателен: приложение в режиме `production` без него не запустится. Получить значение: `openssl rand -hex 32`. Не публикуйте его; при смене секрета все администраторы будут разлогинены.
   - `ADMIN_LOGIN` и `ADMIN_PASSWORD` задают первого администратора. Пароль не короче 8 символов. Администратор создаётся один раз, пока в базе нет ни одного пользователя; позже пароль меняется в кабинете или командой `set-password` (ниже).
   - `PUBLIC_URL` — адрес сайта, например `https://yaqin.uz`, без слэша в конце.
   - `TRUST_PROXY=true` оставьте, если перед сайтом стоит Caddy: тогда лимит попыток входа считается по настоящему IP.
3. Запустите:

```bash
docker compose up -d --build
```

Контейнер слушает только `127.0.0.1:3000`, наружу его открывает обратный прокси (следующий раздел). При первом запуске применяются миграции и в пустую базу загружается меню из макета: 5 категорий и 24 блюда без фото.

Полезные команды:

```bash
docker compose logs -f app     # журнал
docker compose restart app     # перезапуск
docker compose down            # остановка
```

Обновление: `git pull && docker compose up -d --build`. Данные в `./data` при этом не затрагиваются.

## HTTPS через Caddy

Сертификат Caddy выпускает сам. Установите Caddy на сервер, направьте DNS-запись домена на VPS и положите в `/etc/caddy/Caddyfile` содержимое `Caddyfile.example`:

```
yaqin.uz {
	encode zstd gzip
	reverse_proxy localhost:3000
}
```

Затем `sudo systemctl reload caddy`. Замените `yaqin.uz` на свой домен и проверьте, что `PUBLIC_URL` в `.env` совпадает с ним.

## Где лежат данные

Всё, что создаёт приложение, находится в папке `data/` рядом с `docker-compose.yml` (в контейнере это `/app/data`). Папка не попадает в git.

| Путь | Что это |
|---|---|
| `data/yaqin.db` (и `yaqin.db-wal`, `yaqin.db-shm`) | база SQLite: меню, тексты главной, администратор |
| `data/uploads/` | загруженные фото в формате WebP |
| `data/backups/` | копии базы, которые делает `npm run backup` |

## Бэкап

```bash
docker compose exec app npm run backup
```

Команда кладёт целую копию базы в `data/backups/yaqin-ГГГГ-ММ-ДД-ЧЧММ.db` и печатает путь. Работающий сайт при этом не останавливается. Время в имени файла — по часам контейнера, то есть UTC.

Для полного бэкапа копируйте папку `data/` целиком (база и фото). Копию базы без остановки сайта берите из `data/backups/`, а не из `data/yaqin.db`: рядом с рабочим файлом лежит журнал `yaqin.db-wal`, и без него копия может оказаться неполной.

Восстановление из копии:

```bash
docker compose down
cp data/backups/yaqin-2026-10-14-0933.db data/yaqin.db
rm -f data/yaqin.db-wal data/yaqin.db-shm
docker compose up -d
```

Копии из `data/backups/` никто не удаляет, подчищайте их время от времени.

## Забытый пароль

```bash
docker compose exec app npm run set-password -- admin
```

Вместо `admin` укажите логин. Команда запросит новый пароль (при вводе символы не отображаются), сохранит его и завершит все сессии этого пользователя. Пароль не короче 8 символов. Без запроса пароль можно передать переменной: `docker compose exec -e NEW_PASSWORD='новый-пароль' app npm run set-password -- admin`, но тогда он останется в истории команд.

## Кабинет на экране «Домой»

Кабинет можно закрепить на телефоне как приложение с иконкой Yaqin. Откройте `https://<ваш домен>/admin` в браузере телефона и войдите.

- iPhone, Safari: кнопка «Поделиться», затем «На экран „Домой“».
- Android, Chrome: меню с тремя точками, затем «Добавить на главный экран» (или «Установить приложение»).

Иконка откроет кабинет в полноэкранном режиме. Вход сохраняется на 30 дней.
