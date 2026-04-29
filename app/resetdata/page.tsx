import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ResetDataPage() {
  console.log('--- PUBLIC RESET TRIGGERED ---');

  try {
    // Executar resets diretamente no Server Component
    const delOfferPayments = await prisma.offerPayment.deleteMany({});
    const delOffers = await prisma.offer.deleteMany({});
    const delTransactions = await prisma.financialTransaction.deleteMany({});
    
    // Outros resets de sessões
    await prisma.googleAdsSession.deleteMany({});
    await prisma.metaAdsSession.deleteMany({});
    await prisma.instagramPreviewSession.deleteMany({});
    await prisma.facebookFeedSession.deleteMany({});

    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="mx-auto w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Reset Concluído!</h1>
          <p className="text-slate-400 mb-8">As ofertas e a contabilidade foram zeradas com sucesso no servidor.</p>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 p-4 rounded-2xl">
              <div className="text-2xl font-black">{delOffers.count}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Ofertas</div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl">
              <div className="text-2xl font-black">{delOfferPayments.count}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Pagos</div>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl">
              <div className="text-2xl font-black">{delTransactions.count}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Transações</div>
            </div>
          </div>

          <a 
            href="/"
            className="block w-full py-4 bg-white text-slate-950 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/50 rounded-3xl p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Erro no Reset</h1>
          <p className="text-slate-400 mb-4">{error.message}</p>
        </div>
      </div>
    );
  }
}
