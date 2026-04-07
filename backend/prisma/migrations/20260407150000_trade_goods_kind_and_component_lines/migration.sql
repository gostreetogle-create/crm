-- Create enum for commercial trade good kind
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TradeGoodKind') THEN
    CREATE TYPE "TradeGoodKind" AS ENUM ('ITEM', 'COMPLEX');
  END IF;
END $$;

-- Add kind to trade goods with backfill default
ALTER TABLE "trade_goods"
  ADD COLUMN IF NOT EXISTS "kind" "TradeGoodKind" NOT NULL DEFAULT 'ITEM';

-- Trade good lines can now reference either manufactured product or nested trade good
ALTER TABLE "trade_good_lines"
  ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "trade_good_lines"
  ADD COLUMN IF NOT EXISTS "component_trade_good_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trade_good_lines_component_trade_good_id_fkey'
  ) THEN
    ALTER TABLE "trade_good_lines"
      ADD CONSTRAINT "trade_good_lines_component_trade_good_id_fkey"
      FOREIGN KEY ("component_trade_good_id")
      REFERENCES "trade_goods"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "trade_good_lines_component_trade_good_id_idx"
  ON "trade_good_lines"("component_trade_good_id");

-- Exactly one reference must be set (product OR component trade good)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trade_good_lines_one_component_check'
  ) THEN
    ALTER TABLE "trade_good_lines"
      ADD CONSTRAINT "trade_good_lines_one_component_check"
      CHECK (
        (CASE WHEN "productId" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "component_trade_good_id" IS NULL THEN 0 ELSE 1 END) = 1
      );
  END IF;
END $$;

-- Prevent direct self-reference in one line
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trade_good_lines_not_self_component_check'
  ) THEN
    ALTER TABLE "trade_good_lines"
      ADD CONSTRAINT "trade_good_lines_not_self_component_check"
      CHECK (
        "component_trade_good_id" IS NULL OR "component_trade_good_id" <> "tradeGoodId"
      );
  END IF;
END $$;
