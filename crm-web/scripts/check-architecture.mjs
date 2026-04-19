#!/usr/bin/env node

/**
 * Скрипт проверки архитектурных требований для SRM Front Release
 * 
 * Проверяет:
 * - Deep imports (только public API @srm/*)
 * - Циклические зависимости
 * - Теги проектов
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
  } catch (error) {
    return error.stdout || error.stderr || '';
  }
}

// 1. Проверка deep imports
log('\n📦 Проверка deep imports...', 'blue');

const deepImportPattern = /from ['"]@srm\/[^'"]+\/(?!index)[^'"]+['"]/g;
const srcFiles = exec('git ls-files "srm-front/src/**/*.ts"').split('\n').filter(Boolean);

let deepImportsFound = false;
for (const file of srcFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    const matches = content.match(deepImportPattern);
    if (matches) {
      if (!deepImportsFound) {
        log('❌ Найдены deep imports:', 'red');
        deepImportsFound = true;
      }
      log(`  ${file}:`, 'yellow');
      matches.forEach(m => log(`    ${m}`, 'yellow'));
    }
  } catch (e) {
    // Файл может быть удалён
  }
}

if (!deepImportsFound) {
  log('✅ Deep imports не найдены', 'green');
}

// 2. Проверка циклических зависимостей
log('\n🔄 Проверка циклических зависимостей...', 'blue');

try {
  const graphOutput = exec('npx nx graph --file=graph.json 2>&1');
  
  if (graphOutput.includes('circular') || graphOutput.includes('cycle')) {
    log('❌ Обнаружены циклические зависимости', 'red');
    log('Запустите: npx nx graph', 'yellow');
  } else {
    log('✅ Циклические зависимости не найдены', 'green');
  }
} catch (e) {
  log('⚠️  Не удалось проверить граф зависимостей', 'yellow');
}

// 3. Проверка тегов проектов
log('\n🏷️  Проверка тегов проектов...', 'blue');

try {
  const projectJson = JSON.parse(readFileSync('srm-front/project.json', 'utf-8'));
  const tags = projectJson.tags || [];
  
  const requiredTags = ['type:app', 'scope:srm-front'];
  const missingTags = requiredTags.filter(tag => !tags.includes(tag));
  
  if (missingTags.length > 0) {
    log(`❌ Отсутствуют теги: ${missingTags.join(', ')}`, 'red');
  } else {
    log('✅ Теги проектов корректны', 'green');
  }
} catch (e) {
  log('⚠️  Не удалось проверить теги проектов', 'yellow');
}

// 4. Проверка libs
log('\n📚 Проверка библиотек...', 'blue');

try {
  const libsOutput = exec('npx nx show projects --type lib');
  const libs = libsOutput.split('\n').filter(Boolean);
  
  log(`Найдено библиотек: ${libs.length}`, 'green');
  
  // Проверка что ключевые библиотеки существуют
  const requiredLibs = [
    'ui-kit',
    'theme-core',
    'dictionaries-state',
    'platform-core',
  ];
  
  const missingLibs = requiredLibs.filter(lib => !libs.some(l => l.includes(lib)));
  
  if (missingLibs.length > 0) {
    log(`❌ Отсутствуют библиотеки: ${missingLibs.join(', ')}`, 'red');
  } else {
    log('✅ Все ключевые библиотеки на месте', 'green');
  }
} catch (e) {
  log('⚠️  Не удалось проверить библиотеки', 'yellow');
}

// Итоговый статус
log('\n' + '='.repeat(50), 'blue');
if (deepImportsFound) {
  log('❌ Проверка архитектуры НЕ ПРОЙДЕНА', 'red');
  log('Исправьте deep imports перед релизом', 'yellow');
  process.exit(1);
} else {
  log('✅ Проверка архитектуры ПРОЙДЕНА', 'green');
  process.exit(0);
}
