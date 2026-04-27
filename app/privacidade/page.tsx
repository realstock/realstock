import React from "react";

export const metadata = {
  title: "Política de Privacidade | RealStock",
  description: "Política de privacidade da Plataforma RealStock. Saiba como seus dados são coletados, usados e protegidos.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 py-12 px-6">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-white/10 rounded-[28px] p-8 md:p-12 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Política de Privacidade</h1>
        <p className="text-slate-400 mb-8 border-b border-white/10 pb-6">
          Última atualização: {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>

        <div className="space-y-8 leading-relaxed font-sans cursor-default">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Informações Gerais</h2>
            <p>
              A presente Política de Privacidade regulamenta a forma como a <strong>RealStock</strong> coleta, utiliza, mantém e divulga informações originadas por seus usuários (cada um, um "Usuário"). Na RealStock, a privacidade e a segurança são prioridades. Nós nos comprometemos com a transparência no tratamento dos dados pessoais de quem escolhe utilizar nosso site, obedecendo às normativas da Lei Geral de Proteção de Dados Pessoais (LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Quais dados coletamos?</h2>
            <p className="mb-3">
              No ecossistema da nossa plataforma, coletamos informações em três esferas principais:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li><strong>Dados fornecidos diretamente:</strong> Nome, e-mail, telefone, e credenciais de login via parceiros autorizados quando você cria uma conta (por exemplo, OAuth Google). Além disso, dados dos imóveis que você cadastra voluntariamente, incluindo fotografias e logradouro.</li>
              <li><strong>Dados de Atendimento e Suporte o Marketplace:</strong> Registros e histórico de ofertas feitas e recebidas através da nossa ferramenta de Home Broker de imóveis, bem como tickets e e-mails enviados à central de atendimento.</li>
              <li><strong>Dados Coletados Automaticamente:</strong> Endereço IP do dispositivo, informações analíticas de uso, localização geográfica aproximada, horários de acesso e tipo de navegador visando prover segurança antifraude e melhorar a experiência (UX).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Uso de Cookies e Coleta por Terceiros</h2>
            <p className="mb-3">
              A Plataforma RealStock utiliza "cookies" (pequenos arquivos de texto adicionados ao seu dispositivo) para otimizar o site, analisar o tráfego e fornecer recursos e publicidade mais aderentes ao seu perfil.
            </p>
            <p>
              <strong>Google AdSense:</strong> Nós utilizamos os serviços de exibição de anúncios da terceira rede Google AdSense. Esta rede gerencia Cookies, especificamente o cookie DoubleClick DART (ou tecnologias similares), para exibir anúncios aos Usuários com base nas suas visitas pontuais neste e em outros sites da rede de internet. O usuário poderá optar por não usar cookies de rastreamento do Google Ads em seu navegador diretamente no painel de configurações de segurança do mesmo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Como protegemos os seus dados?</h2>
            <p>
              A RealStock adota práticas sólidas de armazenamento em nuvem segura, roteamento protegido e criptografia, impossibilitando que terceiros sem o respectivo "Token de Autorização" interceptem informações transacionadas, como os dados cadastrais sensíveis e propostas financeiras imobiliárias geradas no decorrer do uso do software.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Compartilhamento de Informações</h2>
            <p>
              Jamais comercializamos ativamente os dados da sua conta para empresas de telemarketing. Os dados imobiliários voluntariamente classificados por você corriqueiramente para caráter "Público" são expostos abertamente e indexados em provedores de pesquisa. O compartilhamento do cadastro é puramente destinado apenas à ponta parceira: no caso, do comprador ao proprietário ou vice-versa, nas situações em que houver interesse ou propostas iniciadas sobre o ativo listado, visando concluir o meio negocial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Seus Direitos (LGPD)</h2>
            <p>
              A RealStock assegura a seus usuários seus plenos direitos nos termos do artigo 18 da Lei Geral de Proteção de Dados (Lei nº 13.709/18). É permitida ao usuário a confirmação da existência de tratamento, a exigência do anonimato, e o eventual bloqueio ou eliminação de informações ou anúncios indevidos desnecessários, devendo esta requisição ser feita por correio eletrônico dirigido à nossa administração.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Retenção de Dados</h2>
            <p>
              Conservamos seus dados pessoais somente pelo tempo necessário para cumprir as finalidades do nosso Marketplace (ex: histórico de quem efetuou impulsionamentos turbinados) ou manter os logs por requisições legais impostas pela lei de crimes cibernéticos ou legislações nacionais correspondentes (Marco Civil da Internet), para a devida proteção às partes no ato de eventuais resoluções e lides.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Contato e Responsável DPO</h2>
            <p>
              Em caso de dúvidas acerca desta Política de Privacidade ou do processamento de seus dados por parte do modelo de atuação da startup, sinta-se confortável para nos acionar a qualquer momento mediante o canal eletrônico em <strong>contato@realstock.com.br</strong>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
