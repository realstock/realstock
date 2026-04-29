import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.kreduixqigopfbqkvicw:Flecheiras%402@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require',
    },
  },
});

async function main() {
  console.log('--- RESETTING OFFERS AND ACCOUNTING ---');

  try {
    // Deletar pagamentos de ofertas primeiro (chave estrangeira se houver, embora no schema não pareça ter relação formal de cascade no Property mas tem em models)
    const delOfferPayments = await prisma.offerPayment.deleteMany({});
    console.log(`Deleted ${delOfferPayments.count} offer payments`);

    // Deletar ofertas
    const delOffers = await prisma.offer.deleteMany({});
    console.log(`Deleted ${delOffers.count} offers`);

    // Deletar transações financeiras (Contabilidade)
    const delTransactions = await prisma.financialTransaction.deleteMany({});
    console.log(`Deleted ${delTransactions.count} financial transactions`);

    // Opcional: Deletar sessões de anúncios se o usuário considerar parte da contabilidade/reset
    const delGoogleSessions = await prisma.googleAdsSession.deleteMany({});
    console.log(`Deleted ${delGoogleSessions.count} Google Ads sessions`);

    const delMetaSessions = await prisma.metaAdsSession.deleteMany({});
    console.log(`Deleted ${delMetaSessions.count} Meta Ads sessions`);

    const delIgSessions = await prisma.instagramPreviewSession.deleteMany({});
    console.log(`Deleted ${delIgSessions.count} Instagram sessions`);

    const delFbSessions = await prisma.facebookFeedSession.deleteMany({});
    console.log(`Deleted ${delFbSessions.count} Facebook sessions`);

    console.log('--- RESET COMPLETE ---');
  } catch (error) {
    console.error('Error during reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
