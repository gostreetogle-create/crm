#!/usr/bin/env node
/**
 * Генерирует docs/backend-map/OVERVIEW.generated.md из всех *.json в docs/backend-map/
 * (кроме файлов, имя которых начинается с точки или заканчивается иначе).
 *
 * Запуск из корня репозитория:
 *   node scripts/generate-backend-map-overview.cjs
 */

const fs = require("fs");
const path = require("path");

const BACKEND_MAP_DIR = path.join(__dirname, "..", "docs", "backend-map");
const OUT_FILE = path.join(BACKEND_MAP_DIR, "OVERVIEW.generated.md");

function escCell(s) {
  if (s == null || s === "") return "—";
  return String(s)
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function listJsonFiles() {
  if (!fs.existsSync(BACKEND_MAP_DIR)) {
    console.error("Нет папки:", BACKEND_MAP_DIR);
    process.exit(1);
  }
  return fs
    .readdirSync(BACKEND_MAP_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("."))
    .sort();
}

function loadJson(relName) {
  const p = path.join(BACKEND_MAP_DIR, relName);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function sectionSourceFiles(files) {
  const rows = [["Файл", "Версия", "Назначение (_meta.purpose)"]];
  for (const f of files) {
    const data = loadJson(f);
    const ver = data.version != null ? String(data.version) : "—";
    const purpose = data._meta && data._meta.purpose ? data._meta.purpose : "—";
    rows.push([f, ver, purpose]);
  }
  let md = "## Реестр JSON-источников\n\n";
  md += "| " + rows[0].join(" | ") + " |\n";
  md += "|" + rows[0].map(() => "---").join("|") + "|\n";
  for (let i = 1; i < rows.length; i++) {
    md += "| " + rows[i].map(escCell).join(" | ") + " |\n";
  }
  return md + "\n";
}

function sectionDictionariesFromFile(filename, data) {
  const dicts = data.dictionaries;
  if (!dicts || typeof dicts !== "object") return "";

  let md = `### Малые справочники — \`${filename}\`\n\n`;

  const names = Object.keys(dicts).sort();
  for (const name of names) {
    const block = dicts[name];
    const title = block.rus ? escCell(block.rus) : name;
    md += `#### \`${name}\` — ${title}\n\n`;
    if (block.description) {
      md += `*${escCell(block.description)}*\n\n`;
    }
    const items = Array.isArray(block.items) ? block.items : [];
    if (items.length === 0) {
      md += "*нет элементов*\n\n";
      continue;
    }
    md += "| key | rus | description |\n| --- | --- | --- |\n";
    for (const it of items) {
      md +=
        "| " +
        [escCell(it.key), escCell(it.rus), escCell(it.description)].join(" | ") +
        " |\n";
    }
    md += "\n";
  }
  return md;
}

function sectionEntitiesFromFile(filename, data) {
  const entities = data.entities;
  if (!entities || typeof entities !== "object") return "";

  let md = `### Сущности (таблицы) — \`${filename}\`\n\n`;

  const ids = Object.keys(entities).sort();
  for (const id of ids) {
    const ent = entities[id];
    const title = ent.name ? escCell(ent.name) : id;
    md += `#### \`${id}\` — ${title}\n\n`;
    if (ent.description) {
      md += `*${escCell(ent.description)}*\n\n`;
    }
    const fields = Array.isArray(ent.fields) ? ent.fields : [];
    if (fields.length === 0) {
      md += "*нет полей*\n\n";
      continue;
    }
    md += "| key | rus | type | required | description |\n| --- | --- | --- | --- | --- |\n";
    for (const fld of fields) {
      const req =
        fld.required === true ? "да" : fld.required === false ? "нет" : "—";
      md +=
        "| " +
        [
          escCell(fld.key),
          escCell(fld.rus),
          escCell(fld.type),
          req,
          escCell(fld.description),
        ].join(" | ") +
        " |\n";
    }
    md += "\n";
  }
  return md;
}

function collectOpenQuestions(files) {
  const all = [];
  for (const f of files) {
    const data = loadJson(f);
    if (Array.isArray(data._open_questions)) {
      for (const q of data._open_questions) {
        all.push({ file: f, text: q });
      }
    }
  }
  return all;
}

const KNOWN_ROOT_KEYS = new Set([
  "_meta",
  "version",
  "dictionaries",
  "entities",
  "_open_questions",
]);

function sectionOtherRoots(filename, data) {
  const keys = Object.keys(data).filter((k) => !KNOWN_ROOT_KEYS.has(k));
  if (keys.length === 0) return "";

  let md = `### Прочие разделы — \`${filename}\`\n\n`;
  md +=
    "*В этом файле есть корневые ключи кроме `dictionaries` / `entities` — ниже сырой вид для синхронизации; при стабилизации формата можно добавить отдельный рендер таблиц.*\n\n";
  for (const k of keys.sort()) {
    md += `#### \`${k}\`\n\n\`\`\`json\n`;
    md += JSON.stringify(data[k], null, 2);
    md += "\n```\n\n";
  }
  return md;
}

function main() {
  const files = listJsonFiles();
  if (files.length === 0) {
    console.error("В docs/backend-map нет .json файлов.");
    process.exit(1);
  }

  const generatedAt = new Date().toISOString();

  let body = `# Название файла: .md — Обзор backend-map (автогенерация)\n\n`;
  body += `> **Сгенерировано:** \`${generatedAt}\`  \n`;
  body += `> **Не править вручную.** Источник правды — JSON в этой же папке. Обновление: \`node scripts/generate-backend-map-overview.cjs\`\n\n`;
  body += "---\n\n";

  body += "## Точка входа для «картинки»\n\n";
  body +=
    "Ниже — **все малые справочники** (по файлам) и **все сущности с полями** (по файлам). При добавлении нового \`.json\` в \`docs/backend-map/\` перезапусти генератор — раздел появится автоматически.\n\n";
  body += "---\n\n";

  body += sectionSourceFiles(files);

  body += "## Малые справочники\n\n";
  for (const f of files) {
    const data = loadJson(f);
    const part = sectionDictionariesFromFile(f, data);
    if (part) body += part;
  }

  body += "## Сущности и поля\n\n";
  for (const f of files) {
    const data = loadJson(f);
    const part = sectionEntitiesFromFile(f, data);
    if (part) body += part;
  }

  const questions = collectOpenQuestions(files);
  if (questions.length > 0) {
    body += "## Открытые вопросы\n\n";
    body += "| Источник | Вопрос |\n| --- | --- |\n";
    for (const { file, text } of questions) {
      body += "| " + escCell(file) + " | " + escCell(text) + " |\n";
    }
    body += "\n";
  }

  body += "## Дополнительные JSON-файлы (произвольная структура)\n\n";
  let anyOther = false;
  for (const f of files) {
    const data = loadJson(f);
    const part = sectionOtherRoots(f, data);
    if (part) {
      body += part;
      anyOther = true;
    }
  }
  if (!anyOther) {
    body +=
      "*Пока все `.json` используют только стандартные ключи. Третий файл с новыми корнями появится здесь автоматически.*\n\n";
  }

  fs.writeFileSync(OUT_FILE, body, "utf8");
  console.log("OK:", path.relative(process.cwd(), OUT_FILE));
}

main();
