import React from "react";

export const metadata = {
  title: "Termos de Uso | RealStock",
  description: "Termos e condições de uso da plataforma RealStock.",
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 py-12 px-6">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-white/10 rounded-[28px] p-8 md:p-12 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Termos de Uso</h1>
        <p className="text-slate-400 mb-8 border-b border-white/10 pb-6">
          Última atualização: {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>

        <div className="space-y-8 leading-relaxed font-sans cursor-default">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar o site <strong>RealStock</strong> (https://www.realstock.com.br), doravante denominado "Plataforma", você concorda em cumprir e vincular-se a estes Termos de Uso. Caso não concorde com qualquer parte destes termos, você está proibido de utilizar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis aplicáveis de direitos autorais e marcas comerciais. 
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Natureza dos Serviços (Marketplace)</h2>
            <p className="mb-3">
              A <strong>RealStock</strong> atua exclusivamente como uma plataforma de aproximação (marketplace imobiliário), oferecendo um espaço digital para que proprietários, construtoras e corretores (Anunciantes) publiquem imóveis e investidores ou compradores (Usuários) pesquisem as ofertas.
            </p>
            <p>
              Não somos uma imobiliária, não prestamos assessoria jurídica, não cobramos comissões de corretagem sobre as vendas diretas originadas através das comunicações no site e não garantimos a veracidade absoluta das informações cadastradas por terceiros. Toda a devida diligência (Due Diligence) de documentação, visita ou vistoria do imóvel é de responsabilidade conjunta do Vendedor e Comprador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Responsabilidade dos Anunciantes</h2>
            <p>
              Os Anunciantes garantem ter o direito legal de colocar os imóveis à venda ou estarem devidamente autorizados pelo proprietário para atuar nesta finalidade (sob contrato de exclusividade ou parcerias autorizadas). O Anunciante compromete-se a não enviar imagens fraudulentas, inflacionar preços de maneira dissimulada ou utilizar a plataforma para anúncios inexistentes. A constatação de fraude resultará no banimento imediato e na comunicação das partes aos órgãos de proteção cível da jurisdição.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Direitos Autorais e Propriedade de Mídia</h2>
            <p>
              Todo o conteúdo original estrutural deste site (elementos gráficos, logotipos, arquitetura de software, layouts e design) pertence à RealStock. O conteúdo cadastrado pelo usuário (fotografias dos imóveis, textos descritivos e vídeos) permanecem como propriedade intelectual do usuário enviador. No entanto, ao submeter o anúncio, o usuário cede à RealStock a licença não exclusiva para dispor, compartilhar e divulgar referidas imagens em campanhas publicitárias dentro da plataforma Meta Ads (Instagram/Facebook) ou Google Ads visando impulsionar as prospecções.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Compras de Impulsionamentos e Assinaturas</h2>
            <p>
              Todos os valores para dar visibilidade extra e turbinar um anúncio através dos nossos programas integrados aos Provedores externos (Meta Platforms Inc ou Google Alphabet) estão descritos diretamente no momento do checkout e serão processados pelo parceiro de pagamentos oficial (PayPal). Devido à natureza irreversível da aquisição de espaço publicitário nestas redes, uma vez que a campanha esteja iniciada e creditada, não garantimos o reembolso de verbas de mídia digital.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Modificações dos Termos de Uso</h2>
            <p>
              A RealStock poderá revisar estes termos de serviço do site a qualquer momento, independente de aviso-prévio contínuo e massivo, bastando a atualização nesta página. Ao usar o site, você concorda em ficar vinculado pela versão atual e contínua destes termos de compromisso de serviço. Recomendamos revisitar a página de forma periódica.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Lei Aplicável e Jurisdição</h2>
            <p>
              Estes termos e condições são regidos e interpretados de acordo com as leis do Brasil e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais da sede administrativa principal da detentora do marketplace para a resolução judiciária de quaisquer conflitos.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
