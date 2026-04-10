ALTER TABLE "Order"
ALTER COLUMN "linesSnapshot" SET DEFAULT '[]'::jsonb;
