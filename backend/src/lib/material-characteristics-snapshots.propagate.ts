import { Prisma } from '@prisma/client';

/**
 * Пропагация денормализованных snapshot-полей из справочников
 * в связанные `MaterialCharacteristic`.
 *
 * Локально: справочник меняется, snapshot-поля не трогаем.
 * Глобально: после изменения/удаления обновляем/очищаем snapshot-поля во всех
 * связанных характеристиках.
 */

type AnyTx = Prisma.TransactionClient | unknown;

export async function propagateColorSnapshots(
  tx: AnyTx,
  params: { colorId: string; colorName: string; colorHex: string },
): Promise<number> {
  const client = tx as any;
  return client.materialCharacteristic.updateMany({
    where: { colorId: params.colorId },
    data: {
      colorName: params.colorName,
      colorHex: params.colorHex,
    },
  });
}

export async function clearColorSnapshots(tx: AnyTx, colorId: string): Promise<number> {
  const client = tx as any;
  return client.materialCharacteristic.updateMany({
    where: { colorId },
    data: {
      colorId: null,
      colorName: null,
      colorHex: null,
    },
  });
}

export async function propagateSurfaceFinishSnapshots(
  tx: AnyTx,
  params: { surfaceFinishId: string; finishType: string; roughnessClass: string; raMicron: number | null },
): Promise<number> {
  const client = tx as any;
  return client.materialCharacteristic.updateMany({
    where: { surfaceFinishId: params.surfaceFinishId },
    data: {
      finishType: params.finishType,
      roughnessClass: params.roughnessClass,
      raMicron: params.raMicron,
    },
  });
}

export async function clearSurfaceFinishSnapshots(
  tx: AnyTx,
  surfaceFinishId: string,
): Promise<number> {
  const client = tx as any;
  return client.materialCharacteristic.updateMany({
    where: { surfaceFinishId },
    data: {
      surfaceFinishId: null,
      finishType: null,
      roughnessClass: null,
      raMicron: null,
    },
  });
}

export async function propagateCoatingSnapshots(
  tx: AnyTx,
  params: {
    coatingId: string;
    coatingType: string;
    coatingSpec: string;
    coatingThicknessMicron: number | null;
  },
): Promise<number> {
  const client = tx as any;
  return client.materialCharacteristic.updateMany({
    where: { coatingId: params.coatingId },
    data: {
      coatingType: params.coatingType,
      coatingSpec: params.coatingSpec,
      coatingThicknessMicron: params.coatingThicknessMicron,
    },
  });
}

export async function clearCoatingSnapshots(tx: AnyTx, coatingId: string): Promise<number> {
  const client = tx as any;
  return client.materialCharacteristic.updateMany({
    where: { coatingId },
    data: {
      coatingId: null,
      coatingType: null,
      coatingSpec: null,
      coatingThicknessMicron: null,
    },
  });
}

