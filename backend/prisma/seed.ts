import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Роль + пользователь `admin` / `admin` — всегда (идемпотентно), без привязки к «первому» прогону сида. */
async function ensureSeedAdminRoleAndUser(): Promise<void> {
  await prisma.role.upsert({
    where: { id: 'role-sys-admin' },
    create: {
      id: 'role-sys-admin',
      code: 'admin',
      name: 'Администратор',
      sortOrder: 1,
      isActive: true,
      isSystem: true,
    },
    update: {},
  });
  const adminHash = await bcrypt.hash('admin', 10);
  await prisma.user.upsert({
    where: { login: 'admin' },
    create: {
      id: 'user-seed-admin',
      login: 'admin',
      passwordHash: adminHash,
      fullName: 'Администратор',
      email: 'admin@example.local',
      phone: '',
      roleId: 'role-sys-admin',
    },
    update: { passwordHash: adminHash, roleId: 'role-sys-admin' },
  });
}

async function main(): Promise<void> {
  await ensureSeedAdminRoleAndUser();

  if ((await prisma.unit.count()) === 0) {
    await prisma.unit.createMany({
      data: [
        { id: 'u-1', name: 'пог. м', code: 'm_run', notes: 'Погонный метр', isActive: true },
        { id: 'u-2', name: 'шт', code: 'pcs', notes: 'Штуки', isActive: true },
        { id: 'u-3', name: 'кг', code: 'kg', notes: 'Килограммы', isActive: true },
      ],
    });
  }

  // Демо-данные справочников — один раз; роли уже могли появиться раньше без остального сида.
  if ((await prisma.color.count()) > 0) {
    return;
  }

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
