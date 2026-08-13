import React from "react";
import Link from "next/link";
import {
  FiPlusCircle,
  FiEdit3,
  FiTrendingUp,
  FiShare2,
  FiTarget,
  FiDollarSign,
  FiStar,
  FiHome,
  FiCalendar,
  FiMessageSquare,
  FiShield,
  FiCheckSquare,
} from "react-icons/fi";
import { Rocket } from "lucide-react";

const instructionsList = [
  {
    id: "anunciar",
    title: "Como Anunciar um Imóvel",
    icon: <FiPlusCircle className="w-8 h-8 text-sky-400" />,
    content: "Para cadastrar um novo imóvel e capturar clientes no RealStock, acesse o botão 'Anunciar' no topo da página ou através do seu menu. Preencha os campos exigidos como Título, Descrição, Fotos e Valores. Nossa tecnologia de geolocalização auxiliará na construção do seu anúncio perfeito. Após salvar, seu imóvel entrará imediatamente anunciado na rede RealStock.",
    link: "/anunciar"
  },
  {
    id: "aluguel_temporada",
    title: "Aluguel por Temporada",
    icon: <FiHome className="w-8 h-8 text-sky-400" />,
    content: "Anuncie seus imóveis na modalidade Aluguel por Temporada definindo o valor da diária padrão, capacidade máxima de hóspedes, mínimo de noites por estadia, porcentagem de sinal e sua Chave Pix. Seu anúncio é disponibilizado na busca do mapa com seletor interativo de datas de entrada (check-in) e saída (check-out) calculando o valor total da estadia automaticamente.",
    link: "/anunciar"
  },
  {
    id: "calendario_tarifas",
    title: "Calendário & Preços por Data",
    icon: <FiCalendar className="w-8 h-8 text-emerald-400" />,
    content: "Gerencie o calendário do seu imóvel de temporada com flexibilidade total. Defina preços diferenciados para datas específicas (feriados, fins de semana e alta temporada), altere a exigência mínima de noites por período, feche dias para manutenção ou sincronize reservas com plataformas externas (Airbnb, Booking.com) via importação/exportação de links iCal.",
    link: "/minha-conta/anuncios"
  },
  {
    id: "gestao_reservas",
    title: "Fluxo de Aprovação de Reservas",
    icon: <FiCheckSquare className="w-8 h-8 text-indigo-400" />,
    content: "Acompanhe seus pedidos de reserva em um fluxo transparente em 4 etapas: 1) O hóspede solicita o período; 2) O anfitrião aceita o pedido pagando a taxa administrativa de 1% do site; 3) O hóspede recebe a Chave Pix e paga o sinal da reserva; 4) O comprovante Pix é auditado e a reserva é confirmada no sistema.",
    link: "/minha-conta/ofertas"
  },
  {
    id: "chat_direto",
    title: "Chat Direto (Hóspede x Anfitrião)",
    icon: <FiMessageSquare className="w-8 h-8 text-teal-400" />,
    content: "Comunique-se em tempo real diretamente pelo portal! Assim que o anfitrião aceita a reserva e paga a taxa de 1%, a Central de Chat é aberta automaticamente com uma mensagem inicial pré-formatada contendo as datas da estadia. Anfitriões e hóspedes trocam mensagens para alinhar horário de check-in, regras da casa e tirar dúvidas rapidamente.",
    link: "/minha-conta/chat"
  },
  {
    id: "validacao_pix_ia",
    title: "Validação Automática de Pix por IA",
    icon: <FiShield className="w-8 h-8 text-emerald-400" />,
    content: "Segurança total no pagamento do sinal! Quando o hóspede envia o comprovante Pix na página da reserva, a Inteligência Artificial do RealStock analisa o documento em segundos. Ela audita o valor da transação, o nome do recebedor, a data/hora e o código de autenticação bancária, garantindo transparência para o anfitrião.",
    link: "/minha-conta/ofertas"
  },
  {
    id: "editar",
    title: "Editando ou Excluindo Anúncios",
    icon: <FiEdit3 className="w-8 h-8 text-emerald-400" />,
    content: "O mercado muda, e o seu anúncio acompanha. Navegue até 'Meus Anúncios'. Cada propriedade exibe um botão de 'Editar' na tabela, onde você pode reconfigurar fotos, baixar o preço ou alterar descrições. Caso a propriedade já tenha sido vendida, você possui o poder de excluí-la permanentemente em apenas um clique para manter o portfólio limpo.",
    link: "/minha-conta/anuncios"
  },
  {
    id: "viralizar",
    title: "Míssil Viralizar",
    icon: <Rocket className="w-8 h-8 text-purple-400" />,
    content: "O botão Viralizar é o seu maior aliado para lançar o imóvel no mercado de forma explosiva! Com apenas um clique, a nossa Inteligência Artificial gera um vídeo animado (Reels) com as fotos e detalhes da sua propriedade, publica automaticamente no Feed e Reels do Instagram, Facebook e X (Twitter). Esse comando deixa o seu anúncio estruturado e perfeitamente pronto para ser impulsionado (Turbinado) em todas as redes sociais.",
    link: "/minha-conta/anuncios"
  },
  {
    id: "propostas",
    title: "Avaliando Ofertas (Propostas)",
    icon: <FiDollarSign className="w-8 h-8 text-yellow-400" />,
    content: "Quando um investidor se interessa pela sua propriedade, ele não precisa ligar imediatamente. Através da aba lateral do imóvel, compradores podem enviar propostas formais contendo Nome, Mensagem, Valor Oferecido e Meio de Contato. Você será notificado e essa intenção de compra irá para o seu painel de 'Minhas Ofertas', onde você escolhe se aceita entrar em negociação ou recusa.",
    link: "/minha-conta/ofertas"
  },
  {
    id: "google_ads",
    title: "Turbinando no Google Ads",
    icon: <FiTarget className="w-8 h-8 text-orange-400" />,
    content: "Precisando vender rápido? Com a integração nativa ao Google Ads e Meta Ads construída no RealStock, você não precisa ser um expert em marketing. Basta acessar o painel de Anúncios e clicar em 'Turbinar via Google' ou 'Turbinar via Instagram'. Escolha seu Orçamento Diário, efetue o pagamento seguro via PayPal, e nós arquitetamos campanhas automáticas na rede de pesquisa do Google e Meta, segmentando ativamente clientes do estado do anúncio na mesma hora.",
    link: "/minha-conta/anuncios"
  },
  {
    id: "instagram",
    title: "Postando & Impulsionando no Instagram",
    icon: <FiShare2 className="w-8 h-8 text-fuchsia-400" />,
    content: "Transforme o seu imóvel em uma verdadeira obra de arte das redes sociais. Acesse a funcionalidade 'Instagram' ou 'Facebook' do seu anúncio, e o RealStock enviará um incrível carrossel de fotografias acompanhado da Ficha Técnica diretamente para o Perfil Oficial. Além do mais, você pode aplicar taxas de impulsionamento para a API da Meta patrocinar este Carrossel em todo estado do anúncio!",
    link: "/minha-conta/anuncios"
  },
  {
    id: "dashboards",
    title: "Análise de Métricas (Insights)",
    icon: <FiTrendingUp className="w-8 h-8 text-indigo-400" />,
    content: "Um bom investidor possui uma visão além do alcance visual. O RealStock utiliza ferramentas automáticas de GAQL (Google Ads Query Language) e sensores internos para rastrear todo mundo que passar os olhos na sua propriedade. Dentro da visão de Insights do seu painel, revelamos Clíques, CPC, Custo Total de Visualizações por Data, engajamentos com propostas, e toda a telemetria do seu investimento em uma única tela futurista.",
    link: "/minha-conta/anuncios"
  },
  {
    id: "patrocinar",
    title: "Selo de Imóvel Patrocinado",
    icon: <FiStar className="w-8 h-8 text-amber-400" />,
    content: "Destaque seu imóvel perante os concorrentes! Ao adquirir o plano de Patrocínio, seu anúncio ganha um selo premium e é automaticamente injetado no pool rotativo de impulsionamentos oficiais da RealStock. Sendo exibido no nosso carrossel principal, postagens oficiais e em todas as campanhas coletivas nas Redes Sociais com altíssima visibilidade, além de er posicionado em destaque no topo dos resultados de busca.",
    link: "/minha-conta/anuncios"
  }
];

export default function InstrucoesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-sky-500/30">

      {/* Decorative gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] left-[20%] w-[500px] h-[500px] rounded-full bg-sky-900/20 blur-[120px]" />
        <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] rounded-full bg-emerald-900/10 blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">

        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm text-slate-300 font-medium mb-6">
            <span className="text-sky-400">←</span> Voltar ao início
          </Link>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
            Guia <span className="text-transparent bg-clip-text bg-gradient-to-br from-sky-400 to-indigo-400">RealStock</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
            Descubra todos os poderes da plataforma e acelere suas vendas utilizando as tecnologias automáticas e ferramentas da nossa engenharia moderna.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {instructionsList.map((item, index) => (
            <Link
              href={item.link}
              key={item.id}
              className="block group relative backdrop-blur-xl bg-slate-900/50 border border-white/10 hover:border-white/30 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-sky-900/40 overflow-hidden cursor-pointer"
            >
              {/* Subtle hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10 flex min-h-full flex-col">
                <div className="flex items-center gap-5 mb-6">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    {item.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 tracking-tight leading-tight group-hover:text-sky-400 transition-colors">
                    {item.title}
                  </h2>
                </div>

                <p className="text-slate-400 leading-relaxed text-[15px] flex-grow">
                  {item.content}
                </p>

                <div className="mt-6 flex justify-end">
                  <span className="inline-flex items-center text-sm font-medium text-sky-400 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    Acessar Ferramenta →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 p-10 backdrop-blur-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-fuchsia-500/10 border border-white/10 rounded-3xl text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-white mb-4">Ainda com dúvidas?</h3>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto">A tecnologia trabalha por você noite e dia. Caso você precise de assistência avançada, envie um ticket para o nosso time de suporte operatório.</p>
            <Link href="mailto:contato@realstock.com.br" className="inline-flex items-center justify-center px-8 py-4 bg-white text-slate-900 font-bold rounded-2xl hover:scale-105 transition shadow-xl shadow-white/10">
              Falar com o Suporte
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
