# Frontend Release-Ready Checklist

Статус проставляется как `PASS` / `FAIL` / `BLOCKED`.

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

