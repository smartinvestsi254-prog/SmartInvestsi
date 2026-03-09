const orphanTx = await db.transaction.findMany({
  where: { order_id: null }
});

matchAndAttach(orphanTx);
