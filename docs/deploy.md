# Развёртывание на сервере

Как устроен рабочий сервер и как поднять такой же с нуля. Сам запуск приложения в Docker, переменные `.env`, бэкап и сброс пароля описаны в [README](../README.md). Здесь — всё, что вокруг: nginx, HTTPS, firewall, бэкап по расписанию и переход на домен.

## Сейчас

| | |
|---|---|
| Сервер | Ubuntu 26.04, `46.8.114.10`, пользователь `ubuntu` |
| Адрес сайта | <https://46.8.114.10>, пока не работает домен `yaqingastro.uz` |
| Схема | nginx (порты 80 и 443) → контейнер на `127.0.0.1:3000` → папка `data/` |

Сервер стоит за NAT провайдера: `ip addr` показывает внутренний адрес `10.10.33.34`, а входящие соединения на `46.8.114.10` провайдер пробрасывает на него.

## Что где лежит

| Путь на сервере | Что это | В репозитории |
|---|---|---|
| `/opt/yaqin` | код (клон репозитория), `.env`, `data/` | — |
| `/etc/nginx/sites-available/yaqin` | конфиг nginx, включён ссылкой из `sites-enabled/` | `deploy/nginx/ip.conf`, после перехода на домен — `deploy/nginx/yaqingastro.uz.conf` |
| `/var/www/acme` | папка для проверок Let's Encrypt | — |
| `/etc/letsencrypt/` | сертификаты и настройки их продления | — |
| `/etc/cron.d/yaqin-backup` | ежедневный бэкап базы | `deploy/cron/yaqin-backup` |
| `/etc/fail2ban/jail.local` | бан IP за подбор пароля SSH | текст ниже |

## Подготовка сервера с нуля

Команды для Ubuntu 26.04 от пользователя с правом `sudo`.

### Пакеты

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 nginx fail2ban git
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot
sudo usermod -aG docker $USER
```

certbot ставится из snap: в apt лежит версия 4.0, а сертификат на IP-адрес (флаг `--ip-address`) умеет выпускать только certbot 5. Группа `docker` позволяет запускать `docker compose` без `sudo` и начинает действовать после повторного входа на сервер.

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Порт 3000 открывать не нужно: контейнер слушает только `127.0.0.1`. Порт 80 не закрывайте и после перехода на HTTPS: через него Let's Encrypt проверяет сервер при каждом продлении сертификата.

### fail2ban

Защита SSH в Ubuntu включена сразу после установки, `jail.local` только удлиняет бан с 10 минут до часа:

```bash
sudo tee /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
EOF
sudo systemctl restart fail2ban
```

Если забанило вас самих, разбаньте IP с другого адреса: `sudo fail2ban-client set sshd unbanip <IP>`.

### Приложение

```bash
sudo install -d -o $USER -g $USER /opt/yaqin
git clone https://github.com/DeadMonstr/yaqingastro.git /opt/yaqin
cd /opt/yaqin
mkdir -p data
cp .env.example .env
chmod 600 .env
```

Заполните `.env` по README, раздел «Запуск на VPS». В `PUBLIC_URL` укажите адрес, по которому сайт открывается сейчас: `https://46.8.114.10`, пока не работает домен. Затем:

```bash
docker compose up -d --build
curl -I http://127.0.0.1:3000/ru
```

`curl` должен ответить `200`.

### nginx и HTTPS по IP

Let's Encrypt выдаёт сертификаты и на IP-адрес, но только короткие, на 6 дней (профиль `shortlived`). certbot продлевает их сам.

Чтобы выпустить первый сертификат, nginx должен отдавать проверки Let's Encrypt по HTTP. Временный конфиг:

```bash
sudo install -d -m 755 /var/www/acme
sudo tee /etc/nginx/sites-available/yaqin <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    location /.well-known/acme-challenge/ {
        root /var/www/acme;
    }
}
EOF
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/yaqin /etc/nginx/sites-enabled/yaqin
sudo nginx -t && sudo systemctl reload nginx
```

Сертификат:

```bash
sudo certbot certonly --webroot -w /var/www/acme \
  --ip-address 46.8.114.10 --required-profile shortlived --cert-name yaqin-ip \
  --agree-tos --register-unsafely-without-email --non-interactive \
  --deploy-hook "systemctl reload nginx"
```

`--deploy-hook` запоминается в настройках продления: получив новый сертификат, certbot сам перезагружает nginx. Почта не нужна: Let's Encrypt больше не рассылает напоминаний об истечении сертификатов.

Рабочий конфиг:

```bash
sudo cp /opt/yaqin/deploy/nginx/ip.conf /etc/nginx/sites-available/yaqin
sudo nginx -t && sudo systemctl reload nginx
```

nginx переадресует HTTP на HTTPS, сжимает CSS, JS и SVG и принимает загрузку фото до 64 МБ (кабинет принимает до 4 фото по 15 МБ). Заголовок `X-Forwarded-For` nginx записывает заново, а не дописывает: приложение с `TRUST_PROXY=true` верит ему, и иначе посетитель мог бы подставить чужой IP и обойти лимит попыток входа.

### Бэкап по расписанию

```bash
sudo cp /opt/yaqin/deploy/cron/yaqin-backup /etc/cron.d/yaqin-backup
```

Каждый день в 03:00 по Ташкенту (22:00 UTC, часы сервера идут по UTC) в `data/backups/` появляется копия базы, копии старше 30 дней удаляются. Журнал: `journalctl -t yaqin-backup`. В файле указаны пользователь `ubuntu` и путь `/opt/yaqin`: на другом сервере поправьте их; пользователь должен состоять в группе `docker`.

Копии лежат на том же диске, что и сайт, и при поломке диска пропадут вместе с ним. Время от времени забирайте папку `data/` к себе:

```bash
rsync -a ubuntu@46.8.114.10:/opt/yaqin/data/ ./yaqin-data/
```

Базу для восстановления берите из `data/backups/`, а не `data/yaqin.db` — почему, сказано в README, раздел «Бэкап».

## Переход на домен yaqingastro.uz

1. **DNS.** У регистратора домена создайте две A-записи с адресом `46.8.114.10`: для `yaqingastro.uz` и для `www.yaqingastro.uz`. Проверьте, что они заработали:

   ```bash
   dig +short yaqingastro.uz
   dig +short www.yaqingastro.uz
   ```

   Обе команды должны напечатать `46.8.114.10`. Пока этого нет, следующий шаг не пройдёт: Let's Encrypt находит сервер по DNS.

2. **Сертификат на домен.** Текущий конфиг отдаёт проверки Let's Encrypt по любому имени, nginx до выпуска трогать не нужно:

   ```bash
   sudo certbot certonly --webroot -w /var/www/acme \
     -d yaqingastro.uz -d www.yaqingastro.uz --cert-name yaqingastro.uz \
     --agree-tos --register-unsafely-without-email --non-interactive \
     --deploy-hook "systemctl reload nginx"
   ```

   Этот сертификат обычный, на 90 дней, и тоже продлевается сам.

3. **nginx:**

   ```bash
   cd /opt/yaqin && git pull
   sudo cp deploy/nginx/yaqingastro.uz.conf /etc/nginx/sites-available/yaqin
   sudo nginx -t && sudo systemctl reload nginx
   ```

   После этого HTTP, `www` и HTTP по IP ведут на `https://yaqingastro.uz`. HTTPS по IP больше не открывается: сертификата на IP в этом конфиге нет, и nginx обрывает такие соединения.

4. **Адрес в приложении.** В `/opt/yaqin/.env` поставьте `PUBLIC_URL=https://yaqingastro.uz` и перезапустите контейнер:

   ```bash
   docker compose up -d --force-recreate
   ```

   Из `PUBLIC_URL` строятся sitemap, ссылки `hreflang` и превью для соцсетей.

5. **Проверка:**

   ```bash
   curl -I https://yaqingastro.uz/ru                  # 200
   curl -I http://yaqingastro.uz/ru                   # 301 на https://yaqingastro.uz/ru
   curl -I https://www.yaqingastro.uz/ru              # 301 на https://yaqingastro.uz/ru
   curl -s https://yaqingastro.uz/sitemap.xml | head  # адреса начинаются с https://yaqingastro.uz
   ```

6. **Сертификат на IP** удалите, чтобы certbot не продлевал его зря. Только после шага 3: старый конфиг `ip.conf` ссылается на этот сертификат, и без его файлов nginx не запустится.

   ```bash
   sudo certbot delete --cert-name yaqin-ip
   ```

7. **QR-коды на столах** печатайте с адресом `https://yaqingastro.uz/menu`. Адрес по IP временный, на QR-коды его не ставьте.

## Обновление

```bash
cd /opt/yaqin && git pull && docker compose up -d --build
```

Если в обновлении поменялись файлы в `deploy/`, скопируйте их на место заново, а nginx после копирования проверьте и перезагрузите: `sudo nginx -t && sudo systemctl reload nginx`.

## Проверки и неполадки

| Что | Команда |
|---|---|
| Сертификаты и их сроки | `sudo certbot certificates` |
| Пробное продление | `sudo certbot renew --dry-run` |
| Когда certbot проверит продление | `systemctl list-timers snap.certbot.renew.timer` |
| Конфиг и ошибки nginx | `sudo nginx -t`, `sudo tail /var/log/nginx/error.log` |
| Журнал приложения | `cd /opt/yaqin && docker compose logs -f app` |
| Firewall и баны | `sudo ufw status`, `sudo fail2ban-client status sshd` |
| Журнал бэкапов | `journalctl -t yaqin-backup` |

Если браузер начал ругаться на сертификат, значит, продление не сработало. Запустите `sudo certbot renew` и прочитайте вывод. Чаще всего причина в закрытом порте 80 или в конфиге nginx, из которого пропал блок `/.well-known/acme-challenge/`. Сертификат на IP живёт всего 6 дней, так что такая поломка проявится быстро.
