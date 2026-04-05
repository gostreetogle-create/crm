Скопируй всё ниже и полностью замени содержимое файла deploy/README.md:
Markdown# Как обновлять сайт

### Обновление на сервере (основная инструкция)

1. На компьютере выполни по порядку:
   ```powershell
   cd D:\crm
   cd crm-web
   node scripts/sync-canonical-roles.cjs
   npx nx run crm-web:build:production
   cd ..
   powershell -ExecutionPolicy Bypass -File deploy/scripts/pack-prebuilt-web.ps1

Скопируй файл deploy\prebuilt-web.zip на сервер в папку /opt/crm/deploy/
На сервере выполни:Bashcd /opt/crm/deploy
./deploy.sh


Локальный перезапуск (на компьютере)
PowerShellcd 
D:\crm
docker compose -f deploy\docker-compose.yml --env-file deploy\.env down
docker compose -f deploy\docker-compose.yml --env-file deploy\.env up -d

Полезные команды

Посмотреть логи бэкенда: docker compose logs -f backend
Перезапустить только бэкенд: docker compose restart backend

Первый раз на сервере: скопируй .env.example в .env и заполни данные.

### Резервное копирование базы

Для корректной работы авто-бэкапов рекомендуется добавить в `deploy/.env`:

```
BACKUP_DATABASE_URL=postgresql://crm:ВАШ_ПАРОЛЬ@postgres:5432/crm
```

Строка **без кавычек**. После правки `deploy/.env` пересоздай backend: `docker compose --env-file deploy/.env up -d --force-recreate backend`. Если в логах всё ещё `localhost` — переменная не попала в контейнер (или API крутится не в Docker — тогда тот же ключ нужен в `backend/.env` с хостом `localhost`).