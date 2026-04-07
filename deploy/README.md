# Деплой CRM — краткая инструкция

## Где что лежит

| Путь | Назначение |
|------|------------|
| **`docker-compose.yml`** (корень репозитория) | Описание сервисов Postgres / backend / web |
| **`deploy/deploy.sh`** | Скрипт деплоя (из каталога `deploy/`) |
| **`deploy/.env`** | Секреты и порты (в git не коммитится, шаблон — `.env.example`) |
| **`deploy/prebuilt-web/`** | Статика SPA для nginx (в git не коммитится) |
| **`deploy/prebuilt-web.zip`** | Один архив со статикой для заливки на сервер (в git не коммитится) |

Контейнер **web** монтирует **`./deploy/prebuilt-web`** относительно **корня репозитория** (см. `docker-compose.yml`).

---

## 1. Собрать фронт на ПК

Из **корня репозитория**:

```powershell
cd crm-web
node scripts/sync-canonical-roles.cjs
npx nx run crm-web:build:production
cd ..
powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1
```

Появится **`deploy/prebuilt-web.zip`** и (после успешного pack) содержимое должно совпадать с **`crm-web/dist/crm-web/browser/`**.

### Репозиторий на сетевом диске (`\\сервер\…`, Synology Drive)

**Nx не запускается**, если текущий каталог — UNC. Варианты:

1. **Буква диска:**  
   `subst T: \\сервер\путь\crm` → работать из `T:\crm-web` (см. подробности в `README.detailed.md`).

2. **Сборка на локальный диск**, затем копирование в `deploy/prebuilt-web`:

   ```powershell
   npx nx run crm-web:build:production --outputPath=C:\Users\ВАШ_ПОЛЬЗОВАТЕЛЬ\AppData\Local\Temp\crm-web-nx-out
   robocopy C:\Users\ВАШ_ПОЛЬЗОВАТЕЛЬ\AppData\Local\Temp\crm-web-nx-out\browser deploy\prebuilt-web /MIR
   powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1
   ```

Если `pack-prebuilt-web.ps1` ругается на отсутствие `dist\crm-web\browser`, после `robocopy` архив можно собрать вручную из **`deploy/prebuilt-web`** (см. скрипт — те же пути в zip через `/`).

---

## 2. Залить на сервер и поднять

**Вариант A — ZIP:** положите **`prebuilt-web.zip`** в **`…/deploy/`** рядом с **`deploy.sh`**, затем:

```bash
cd /путь/к/репо/deploy
bash ./deploy.sh
```

**Вариант B — только папка:** синхронизируйте содержимое **`deploy/prebuilt-web/`** на сервер, затем из **корня репо**:

```bash
export HOME=/путь/к/репо
cd /путь/к/репо
docker compose -f docker-compose.yml --env-file deploy/.env up -d --force-recreate web
```

Подставьте свой путь (например **`/volume1/docker/crm`** на Synology).

---

## 3. Synology (коротко)

- **Git** на NAS не обязателен: обновляйте код с ПК (сеть / Drive) и пересобирайте контейнеры.
- Перед **`docker compose build`** при ошибках вроде `mkdir /var/services/homes`:  
  `export HOME=/volume1/docker/crm` и при необходимости `export DOCKER_BUILDKIT=0`.
- Если **`permission denied`** к **`/var/run/docker.sock`** при том, что пользователь в группе **`docker`**:  
  `sudo chown root:docker /var/run/docker.sock` и `sudo chmod 660 /var/run/docker.sock` (после перезагрузки может сброситься).
- **`CORS_ORIGIN`** в **`deploy/.env`** должен совпадать с URL в браузере (не только `localhost`, если заходите по IP или через туннель).

Подробнее: **`deploy/README.detailed.md`**.
