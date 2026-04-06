-- Имя файла на диске (папка uploads/kp-photos/{organizationId}/); photoUrl — опционально (внешняя ссылка или legacy data URL).
ALTER TABLE "KpPhoto" ADD COLUMN IF NOT EXISTS "photoFileName" TEXT;
ALTER TABLE "KpPhoto" ALTER COLUMN "photoUrl" DROP NOT NULL;
