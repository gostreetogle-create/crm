# Frontend Release-Ready Checklist

Статус проставляется как `PASS` / `FAIL` / `BLOCKED`.

## Текущий снимок (2026-03-31, ветка `recovery/nx-workspace-restore-2026-03-31`)

- Workspace integrity: `PASS`
- Architecture guards: `PASS`
- Quality gates: `PASS` (lint/test/build all projects; есть lint warnings в mock-репозиториях без падения CI)
- Runtime smoke: `PASS` (HTTP 200 для `/`, `/dictionaries`, `/materials`, `/geometries` в `crm-web` и `srm-front`)
- Docs sync: `PASS` (audit + release-checklist + новые контрактные тесты)
- Общий release-ready статус: `PASS (условно)` для фронтенд-workspace `crm-web`; вне области остаются массовые удаления в `backend/**`, `deploy/**`, части `docs/**`.

## 1. Workspace integrity

- [ ] `check:workspace-prereqs` -> PASS
- [ ] Nx core configs присутствуют (`nx.json`, `project.json`, `eslint.config.mjs`, `jest.preset.js`)

## 2. Architecture guards

- [ ] `check:route-parity` -> PASS
- [ ] `check:dictionaries-page-size` -> PASS

## 3. Quality gates

- [ ] `nx affected -t lint` -> PASS
- [ ] `nx affected -t test` -> PASS
- [ ] `nx affected -t build` -> PASS

## 4. Runtime smoke

- [ ] `nx serve` запускается для целевого app
- [ ] smoke по ключевым маршрутам пройден

## 5. Docs sync

- [ ] Обновлен `architecture-audit-master.md`
- [ ] Обновлен `pr-checklist.md` при изменении критериев
- [ ] Отклонения отражены в `temporary-deviations-log.md`

