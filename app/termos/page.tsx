"use client";

import React from "react";
import Link from "next/link";
import { Download, ShieldCheck, ArrowLeft, FileText, Scale, AlertTriangle } from "lucide-react";

export default function TermosPage() {
  const handleDownloadTerms = () => {
    const textContent = `
================================================================================
REALSTOCK - TERMOS E CONDIÇÕES GERAIS DE USO DA PLATAFORMA
Última Atualização: 13 de Agosto de 2026
================================================================================

1. ACEITAÇÃO E NATUREZA JURÍDICA DA PLATAFORMA
A RealStock (https://www.realstock.com.br) é uma plataforma digital e marketplace tecnológico que oferece infraestrutura de software para a publicação de anúncios imobiliários, englobando a venda, locação tradicional e locação por temporada.
Ao utilizar a Plataforma, cadastrar anúncios ou solicitar reservas, o usuário declara ter lido, compreendido e aceito integralmente estes Termos de Uso.

2. INTERMEDIAÇÃO TECNOLÓGICA E ISENÇÃO TOTAL DE RESPONSABILIDADE SOBRE RESERVAS
2.1. A RealStock atua EXCLUSIVAMENTE como intermediadora tecnológica e vitrine digital de aproximação entre Anfitriões/Proprietários e Hóspedes/Compradores.
2.2. A RealStock NÃO é proprietária, possuidora, locadora, administradora, corretora ou garantidora de nenhum dos imóveis anunciados na plataforma.
2.3. A RealStock está ISENTA DE QUALQUER RESPONSABILIDADE civil, consumidora, criminal ou financeira em relação a:
     a) Condições físicas, higiênicas, sanitárias, de segurança ou manutenção dos imóveis;
     b) Exatidão, veracidade ou atualização de fotografias, descrições, valores de diárias e comodidades prestadas pelo Anfitrião;
     c) Cancelamentos, desistências, atrasos no check-in/check-out ou alterações de reserva promovidas por qualquer das partes;
     d) Pagamentos diretos efetuados entre Anfitrião e Hóspede (incluindo transferências Pix, sinais de reserva ou pagamentos em dinheiro);
     e) Furtos, roubos, danos patrimoniais, acidentes pessoais, lesões ou qualquer tipo de sinistro ocorrido durante a estadia;
     f) Descumprimentos contratuais, atrasos ou disputas judiciais/extrajudiciais entre Hóspede e Anfitrião.

3. OBRIGAÇÕES E RESPONSABILIDADES DO ANFITRIÃO
3.1. O Anfitrião declara e garante possuir capacidade legal e todos os direitos de propriedade, posse ou autorização expressa para disponibilizar o imóvel.
3.2. O Anfitrião é o único e exclusivo responsável por manter as informações do imóvel e o calendário de disponibilidade devidamente atualizados.
3.3. Cabe exclusivamente ao Anfitrião fornecer a Chave Pix correta, receber o sinal da reserva, disponibilizar o acesso/chaves ao hóspede e responder diretamente por eventuais vícios ou vícios ocultos do imóvel.

4. OBRIGAÇÕES E RESPONSABILIDADES DO HÓSPEDE / COMPRADOR
4.1. O Hóspede compromete-se a utilizar o imóvel com zelo e cuidado, respeitando o número máximo de hóspedes, as regras da casa e os horários de check-in/check-out estipulados pelo Anfitrião.
4.2. O Hóspede é o único responsável pelo pagamento do sinal acordado diretamente ao Anfitrião e pelo cumprimento das obrigações assumidas no pedido de reserva.

5. TAXAS DA PLATAFORMA E SERVIÇOS DE MARKETING
5.1. A taxa administrativa de 1% cobrada do Anfitrião refere-se exclusivamente à licença de uso da tecnologia e liberação do canal de comunicação/dados da reserva, não constituindo taxa de seguro, fiança ou garantia de estadia.
5.2. Serviços adicionais como Míssil Viralizar, Impulsionamentos Meta/Google Ads ou Patrocínio possuem caráter estritamente publicitário e de visibilidade de mídia.

6. PROPRIEDADE INTELECTUAL E CONTEÚDO DO USUÁRIO
Ao cadastrar fotos, vídeos ou descrições, o usuário concede à RealStock licença não exclusiva para exibição e promoção publicitária dos anúncios em redes sociais e buscadores.

7. LEI APLICÁVEL E FORO
Estes Termos são regidos pelas leis da República Federativa do Brasil, elegendo-se o foro da sede administrativa da RealStock para dirimir quaisquer controvérsias.

================================================================================
RealStock Tecnologia Imobiliária - Todos os direitos reservados.
    `.trim();

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Termos_e_Condicoes_RealStock.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 sm:px-6 lg:px-8 selection:bg-sky-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 hover:bg-white/10 transition"
              title="Voltar para a página inicial"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                <Scale className="text-sky-400" size={28} />
                <span>Termos e Condições de Uso</span>
              </h1>
              <p className="text-xs text-slate-400">
                Diretrizes contratuais de intermediação tecnológica da RealStock
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadTerms}
            className="w-full sm:w-auto rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Download size={16} />
            <span>Baixar Termos (TXT)</span>
          </button>
        </div>

        {/* ALERTA DE ISENÇÃO DE RESPONSABILIDADE */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-200 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
          <AlertTriangle size={24} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-amber-300 mb-1">Aviso Importante aos Usuários (Intermediação Tecnológica):</strong>
            O RealStock atua <strong>exclusivamente como intermediador tecnológico</strong> aproximando hóspedes e anfitriões. O portal não é proprietário, locador ou garantidor dos imóveis e <strong>não possui qualquer responsabilidade sobre o cumprimento das reservas, estadias, pagamentos de sinal via Pix ou condições físicas das propriedades</strong>.
          </div>
        </div>

        {/* CORPO DOS TERMOS */}
        <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-sm leading-relaxed text-slate-300">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-sky-400" />
              1. Aceitação e Natureza Jurídica da Plataforma
            </h2>
            <p>
              A <strong>RealStock</strong> (https://www.realstock.com.br) é uma plataforma digital e marketplace tecnológico que oferece infraestrutura de software para a publicação de anúncios imobiliários, englobando venda, locação tradicional e locação por temporada.
            </p>
            <p>
              Ao utilizar a Plataforma, cadastrar anúncios ou solicitar reservas, o usuário declara ter lido, compreendido e aceito integralmente estes Termos e Condições de Uso.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              2. Intermediação Tecnológica e Isenção Total de Responsabilidade
            </h2>
            <p>
              2.1. A RealStock atua <strong>EXCLUSIVAMENTE como intermediadora tecnológica</strong> e vitrine digital de aproximação entre Anfitriões/Proprietários e Hóspedes/Compradores.
            </p>
            <p>
              2.2. A RealStock <strong>NÃO é proprietária, possuidora, locadora, administradora, corretora ou garantidora</strong> de nenhum dos imóveis anunciados na plataforma.
            </p>
            <div className="rounded-xl border border-white/5 bg-slate-950 p-4 space-y-2 text-xs text-slate-300">
              <strong className="text-white block font-semibold mb-2">2.3. A RealStock está ISENTA DE QUALQUER RESPONSABILIDADE civil, consumidora, criminal ou financeira em relação a:</strong>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Condições físicas, higiênicas, sanitárias, de segurança ou manutenção dos imóveis;</li>
                <li>Exatidão, veracidade ou atualização de fotografias, descrições, valores de diárias e comodidades;</li>
                <li>Cancelamentos, desistências, atrasos no check-in/check-out ou alterações de reserva por qualquer das partes;</li>
                <li>Pagamentos diretos efetuados entre Anfitrião e Hóspede (transferências Pix, sinais de reserva ou saldo);</li>
                <li>Furtos, roubos, danos patrimoniais, acidentes pessoais ou lesões ocorridos durante a estadia;</li>
                <li>Descumprimentos contratuais ou disputas judiciais/extrajudiciais entre Hóspede e Anfitrião.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg font-bold text-white">3. Obrigações e Responsabilidades do Anfitrião</h2>
            <p>
              3.1. O Anfitrião declara e garante possuir capacidade legal e todos os direitos de propriedade, posse ou autorização expressa para disponibilizar o imóvel para locação por temporada ou venda.
            </p>
            <p>
              3.2. O Anfitrião é o único e exclusivo responsável por manter as informações do imóvel e o calendário de disponibilidade devidamente atualizados.
            </p>
            <p>
              3.3. Cabe exclusivamente ao Anfitrião fornecer a Chave Pix correta, receber o sinal da reserva, disponibilizar o acesso/chaves ao hóspede e responder diretamente por eventuais vícios do imóvel.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg font-bold text-white">4. Obrigações e Responsabilidades do Hóspede / Comprador</h2>
            <p>
              4.1. O Hóspede compromete-se a utilizar o imóvel com zelo e cuidado, respeitando o número máximo de hóspedes, as regras da casa e os horários de check-in/check-out estipulados pelo Anfitrião.
            </p>
            <p>
              4.2. O Hóspede é o único responsável pelo pagamento do sinal acordado diretamente ao Anfitrião e pelo cumprimento das obrigações assumidas no pedido de reserva.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg font-bold text-white">5. Taxas da Plataforma e Serviços de Marketing</h2>
            <p>
              5.1. A taxa administrativa de 1% cobrada do Anfitrião refere-se exclusivamente à licença de uso da tecnologia e liberação do canal de comunicação/dados da reserva, não constituindo taxa de seguro, fiança ou garantia de estadia.
            </p>
            <p>
              5.2. Serviços adicionais como Míssil Viralizar, Impulsionamentos Meta/Google Ads ou Patrocínio possuem caráter estritamente publicitário de alcance digital.
            </p>
          </section>

          <section className="space-y-3 border-t border-white/10 pt-6">
            <h2 className="text-lg font-bold text-white">6. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil, elegendo-se o foro da sede administrativa da RealStock para dirimir quaisquer controvérsias.
            </p>
          </section>

        </div>

        {/* BOTTOM DOWNLOAD CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl border border-white/10 bg-slate-900 text-center sm:text-left">
          <div>
            <h3 className="text-sm font-bold text-white">Precisa guardar uma cópia destes termos?</h3>
            <p className="text-xs text-slate-400">Clique ao lado para baixar o arquivo de texto completo dos Termos de Uso.</p>
          </div>
          <button
            onClick={handleDownloadTerms}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-xs font-bold text-slate-200 transition flex items-center gap-2 shrink-0"
          >
            <Download size={16} />
            <span>Baixar Arquivo TXT</span>
          </button>
        </div>

      </div>
    </main>
  );
}
