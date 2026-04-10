const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        commercialOfferId: true,
        linesSnapshot: true,
      },
    });

    let touchedOrders = 0;
    let touchedLines = 0;

    for (const order of orders) {
      const lines = Array.isArray(order.linesSnapshot) ? order.linesSnapshot.map((line) => ({ ...line })) : [];
      if (!lines.length) continue;

      const offerLines = await prisma.commercialOfferLine.findMany({
        where: { commercialOfferId: order.commercialOfferId },
        select: { lineNo: true, imageUrl: true },
      });
      const byLineNo = new Map(offerLines.map((line) => [line.lineNo, line.imageUrl]));

      let changed = false;
      for (const line of lines) {
        const hasImage =
          typeof line.imageUrl === 'string' && line.imageUrl.trim().length > 0
          || typeof line.photoUrl === 'string' && line.photoUrl.trim().length > 0
          || typeof line.thumbnailUrl === 'string' && line.thumbnailUrl.trim().length > 0
          || typeof line.photo === 'string' && line.photo.trim().length > 0;
        if (hasImage) continue;

        const fromOffer = byLineNo.get(Number(line.lineNo)) || null;
        if (typeof fromOffer === 'string' && fromOffer.trim().length > 0) {
          line.imageUrl = fromOffer.trim();
          touchedLines += 1;
          changed = true;
        }
      }

      if (changed) {
        await prisma.order.update({
          where: { id: order.id },
          data: { linesSnapshot: lines },
        });
        touchedOrders += 1;
      }
    }

    console.log(JSON.stringify({ ordersTotal: orders.length, touchedOrders, touchedLines }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
