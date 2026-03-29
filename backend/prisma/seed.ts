import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  if ((await prisma.unit.count()) === 0) {
    await prisma.unit.createMany({
      data: [
        { id: 'u-1', name: 'пог. м', code: 'm_run', notes: 'Погонный метр', isActive: true },
        { id: 'u-2', name: 'шт', code: 'pcs', notes: 'Штуки', isActive: true },
        { id: 'u-3', name: 'кг', code: 'kg', notes: 'Килограммы', isActive: true },
      ],
    });
  }

  if ((await prisma.role.count()) > 0) {
    return;
  }

  await prisma.role.createMany({
    data: [
      {
        id: 'role-sys-admin',
        code: 'admin',
        name: 'Администратор',
        sortOrder: 1,
        isActive: true,
        isSystem: true,
      },
      {
        id: 'role-seed-director',
        code: 'director',
        name: 'Директор',
        sortOrder: 2,
        notes: 'Пример: задайте права в «Админ-настройках».',
        isActive: true,
        isSystem: false,
      },
      {
        id: 'role-seed-accountant',
        code: 'accountant',
        name: 'Бухгалтер',
        sortOrder: 3,
        notes: 'Пример: задайте права в «Админ-настройках».',
        isActive: true,
        isSystem: false,
      },
      {
        id: 'role-sys-editor',
        code: 'editor',
        name: 'Редактор',
        sortOrder: 4,
        notes: 'Пример: права задаются в «Админ-настройках» (как у любой роли).',
        isActive: true,
        isSystem: false,
      },
      {
        id: 'role-sys-viewer',
        code: 'viewer',
        name: 'Только просмотр',
        sortOrder: 5,
        notes: 'Пример: можно удалить или переименовать — не зашито в систему.',
        isActive: true,
        isSystem: false,
      },
    ],
  });

  const demoHash = await bcrypt.hash('demo', 10);
  await prisma.user.create({
    data: {
      id: 'user-seed-demo',
      login: 'demo',
      passwordHash: demoHash,
      fullName: 'Демо пользователь',
      email: 'demo@example.local',
      phone: '',
      roleId: 'role-sys-admin',
    },
  });

  await prisma.color.createMany({
    data: [
      {
        id: 'c-seed-ral-1000',
        ralCode: 'RAL 1000',
        name: 'Green beige',
        hex: '#CDBA88',
        rgbR: 205,
        rgbG: 186,
        rgbB: 136,
      },
      {
        id: 'c-seed-ral-7035',
        ralCode: 'RAL 7035',
        name: 'Light grey',
        hex: '#CBD0CC',
        rgbR: 203,
        rgbG: 208,
        rgbB: 204,
      },
      {
        id: 'c-seed-ral-9005',
        ralCode: 'RAL 9005',
        name: 'Jet black',
        hex: '#0A0A0D',
        rgbR: 10,
        rgbG: 10,
        rgbB: 13,
      },
      {
        id: 'c-seed-gray-custom',
        name: 'Серый',
        hex: '#6B7280',
        rgbR: 107,
        rgbG: 114,
        rgbB: 128,
      },
      {
        id: 'c-seed-silver-custom',
        name: 'Серебристый',
        hex: '#C0C0C0',
        rgbR: 192,
        rgbG: 192,
        rgbB: 192,
      },
    ],
  });

  await prisma.surfaceFinish.createMany({
    data: [
      { id: 'sf-seed-glossy', finishType: 'Glossy', roughnessClass: 'Ra 0.4', raMicron: 0.4 },
      { id: 'sf-seed-semi-gloss', finishType: 'Semi-gloss', roughnessClass: 'Ra 1.6', raMicron: 1.6 },
      { id: 'sf-seed-matte', finishType: 'Matte', roughnessClass: 'Ra 3.2', raMicron: 3.2 },
    ],
  });

  await prisma.coating.createMany({
    data: [
      {
        id: 'coat-seed-powder',
        coatingType: 'Powder coating',
        coatingSpec: 'RAL polyester',
        thicknessMicron: 80,
      },
      {
        id: 'coat-seed-anodizing',
        coatingType: 'Anodizing',
        coatingSpec: 'Clear anodized',
        thicknessMicron: 20,
      },
      {
        id: 'coat-seed-galvanized',
        coatingType: 'Galvanized',
        coatingSpec: 'Zn hot-dip',
        thicknessMicron: 60,
      },
    ],
  });

  await prisma.geometry.createMany({
    data: [
      {
        id: 'geo-seed-profile-6040',
        name: 'Профиль 60x40x2',
        shapeKey: 'rectangular',
        lengthMm: 3000,
        widthMm: 40,
        heightMm: 60,
        thicknessMm: 2,
        notes: 'Базовый профиль',
        isActive: true,
      },
      {
        id: 'geo-seed-tube-32',
        name: 'Круглая труба 32x2',
        shapeKey: 'tube',
        diameterMm: 32,
        thicknessMm: 2,
        lengthMm: 6000,
        notes: '',
        isActive: true,
      },
    ],
  });

  await prisma.productionWorkType.createMany({
    data: [
      {
        id: 'pwt-seed-weld',
        name: 'Сварка',
        shortLabel: 'Св.',
        hourlyRateRub: 600,
        isActive: true,
      },
      {
        id: 'pwt-seed-paint',
        name: 'Покраска',
        shortLabel: 'Покр.',
        hourlyRateRub: 550,
        isActive: true,
      },
      {
        id: 'pwt-seed-asm',
        name: 'Сборка узла',
        shortLabel: 'Сб.',
        hourlyRateRub: 520,
        isActive: true,
      },
    ],
  });

  await prisma.materialCharacteristic.createMany({
    data: [
      {
        id: 'mc-seed-steel-09g2s',
        name: 'Сталь 09Г2С',
        code: 'ST-09G2S',
        densityKgM3: 7850,
        colorId: 'c-seed-gray-custom',
        colorName: 'Серый',
        colorHex: '#6B7280',
        surfaceFinishId: 'sf-seed-matte',
        finishType: 'Matte',
        roughnessClass: 'Ra 3.2',
        raMicron: 3.2,
        coatingId: 'coat-seed-powder',
        coatingType: 'Powder coating',
        coatingSpec: 'RAL polyester',
        coatingThicknessMicron: 80,
        notes: 'Базовый вариант для корпуса',
        isActive: true,
      },
      {
        id: 'mc-seed-al-amg5',
        name: 'Алюминий АМг5',
        code: 'AL-AMG5',
        densityKgM3: 2700,
        colorId: 'c-seed-silver-custom',
        colorName: 'Серебристый',
        colorHex: '#C0C0C0',
        surfaceFinishId: 'sf-seed-semi-gloss',
        finishType: 'Semi-gloss',
        roughnessClass: 'Ra 1.6',
        raMicron: 1.6,
        coatingId: 'coat-seed-anodizing',
        coatingType: 'Anodizing',
        coatingSpec: 'Clear anodized',
        coatingThicknessMicron: 20,
        notes: 'Лёгкий материал',
        isActive: true,
      },
    ],
  });

  await prisma.material.createMany({
    data: [
      {
        id: 'mat-seed-steel-profile',
        name: 'Сталь 09Г2С — профиль 60×40',
        code: 'POS-ST-6040',
        unitId: 'u-3',
        purchasePriceRub: 95,
        materialCharacteristicId: 'mc-seed-steel-09g2s',
        geometryId: 'geo-seed-profile-6040',
        notes: 'Складская позиция',
        isActive: true,
      },
      {
        id: 'mat-seed-al-tube',
        name: 'Алюминий АМг5 — труба ⌀32',
        code: 'POS-AL-T32',
        unitId: 'u-3',
        purchasePriceRub: 320,
        materialCharacteristicId: 'mc-seed-al-amg5',
        geometryId: 'geo-seed-tube-32',
        notes: 'Складская позиция',
        isActive: true,
      },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
