"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Globe, Home, Layers, MapPin, RefreshCw, Share2, Sparkles, Star, Users, Video } from "lucide-react";

export default function GoogleVacationRentalsPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const propertyId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [gvrData, setGvrData] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedGoogle, setCopiedGoogle] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/google-vacation-rentals`);
      const data = await res.json();
      if (data.success) {
        setProperty(data.property);
        setGvrData(data.gvr);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do GVR:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && propertyId) {
      loadData();
    }
  }, [status, propertyId]);

  async function handleRegisterGVR() {
    try {
      setIsRegistering(true);
      setSuccessMsg("");
      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/google-vacation-rentals`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        loadData();
      } else {
        alert("Erro no cadastro: " + data.error);
      }
    } catch (err: any) {
      alert("Erro ao conectar ao servidor: " + err.message);
    } finally {
      setIsRegistering(false);
    }
  }

  function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading || status === "loading") {
    return <LoadingScreen title="Google Vacation Rentals (PMS)" subtitle="Carregando dados da integração..." />;
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-red-400 font-bold">Imóvel não encontrado.</p>
          <Link href="/minha-conta/anuncios" className="inline-block px-4 py-2 bg-white/10 rounded-xl text-sm">
            Voltar para Meus Anúncios
          </Link>
        </div>
      </div>
    );
  }

  const priceVal = Number(property.price || 0);
  const formattedPrice = `R$ ${priceVal.toLocaleString("pt-BR")}`;
  const images = property.images || [];
  const mainImage = images[0]?.imageUrl || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80";
  const secondImage = images[1]?.imageUrl || mainImage;
  const thirdImage = images[2]?.imageUrl || mainImage;
  
  // Garantir estritamente que NUNCA use localhost nas URLs oficiais
  const siteUrl = "https://www.realstock.com.br";
  const directLinkUrl = `${siteUrl}/imovel/${property.id}`;
  const feedXmlUrl = `${siteUrl}/api/properties/${property.id}/gvr-feed?format=xml`;
  const googleDirectUrl = gvrData?.googleDirectUrl || `https://www.google.com.br/travel/rentals?q=${encodeURIComponent(property.title + ' ' + (property.city || ''))}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <Link href="/minha-conta/anuncios" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors mb-2">
              <ArrowLeft size={14} /> Voltar para Meus Anúncios
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 p-0.5 shadow-lg shadow-sky-500/20 flex items-center justify-center">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
                  Google Vacation Rentals <span className="text-xs font-normal normal-case px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">PMS Channel Manager</span>
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm">Sistema de Gestão & Distribuição de Aluguel por Temporada no Google Travel</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <a
              href={googleDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
              Abrir Anúncio Direto no Google <ExternalLink size={14} />
            </a>

            <button
              onClick={handleRegisterGVR}
              disabled={isRegistering}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider hover:opacity-95 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRegistering ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Sincronizando...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Cadastrar & Sincronizar no Google (PMS)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mensagem de Sucesso */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center gap-3 animate-fade-in">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Painel Status Channel Manager */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status do Channel Manager</div>
              <div className="text-sm font-bold text-emerald-400">
                {gvrData?.status === "ACTIVE" ? "🟢 Ativo no Google Vacation Rentals" : "🔵 Pronto para Cadastrar"}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Layers size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tecnologia PMS Integrada</div>
              <div className="text-sm font-bold text-slate-200">RealStock OpenTravel OTA Engine</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Globe size={24} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reserva Direta (Sem Comissão)</div>
              <div className="text-sm font-bold text-purple-300">www.realstock.com.br</div>
            </div>
          </div>
        </div>

        {/* SIMULAÇÃO DA INTERFACE DO GOOGLE VACATION RENTALS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white uppercase italic flex items-center gap-2">
              <Globe size={18} className="text-sky-400" /> Prévia do Anúncio no Google Travel / Vacation Rentals
            </h2>
            <a 
              href={googleDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-sky-400 hover:underline flex items-center gap-1"
            >
              Abrir busca oficial no Google <ExternalLink size={12} />
            </a>
          </div>

          {/* Container simulando a janela do Google Chrome / Google Travel */}
          <div className="rounded-3xl border border-slate-700 bg-white text-slate-900 shadow-2xl overflow-hidden">
            {/* Barra de endereço simulada do Google */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <a 
                href={googleDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1 text-slate-700 hover:text-blue-600 hover:border-blue-400 flex items-center gap-2 font-mono text-[11px] transition-colors"
                title="Clique para abrir diretamente no Google"
              >
                <span className="text-emerald-600 font-bold">https://</span>google.com.br/travel/rentals?q={encodeURIComponent(property.title)}
                <ExternalLink size={12} className="ml-auto text-slate-400" />
              </a>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                Aluguel por temporada
              </span>
            </div>

            {/* Conteúdo da interface Google Vacation Rentals */}
            <div className="p-6 md:p-8 space-y-6">
              
              {/* Título & Top Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                    {property.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin size={14} className="text-slate-400" /> {[property.neighborhood, property.city, property.state].filter(Boolean).join(", ") || "Fortaleza - CE"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1">
                    <Share2 size={13} /> Compartilhar
                  </button>
                </div>
              </div>

              {/* Badges de Estrutura */}
              <div className="flex flex-wrap items-center gap-6 text-xs text-slate-700 font-medium bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="flex items-center gap-1.5">
                  <Home size={16} className="text-slate-500" /> Todo o imóvel ({property.propertyType || "Apartamento"})
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={16} className="text-slate-500" /> Acomodação para: {property.maxGuests || 6} hóspedes
                </span>
                <span className="flex items-center gap-1.5">
                  <strong>{property.bedrooms || 2}</strong> quartos
                </span>
                <span className="flex items-center gap-1.5">
                  <strong>{property.bathrooms || 1}</strong> banheiros
                </span>
              </div>

              {/* Grid de Fotos (Estilo Google Travel 3 Fotos) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-2xl overflow-hidden h-72">
                <div className="md:col-span-2 h-full relative">
                  <img src={mainImage} alt="Foto Principal" className="w-full h-full object-cover" />
                </div>
                <div className="hidden md:flex flex-col gap-2 h-full">
                  <div className="h-1/2 relative">
                    <img src={secondImage} alt="Foto 2" className="w-full h-full object-cover" />
                  </div>
                  <div className="h-1/2 relative">
                    <img src={thirdImage} alt="Foto 3" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white font-bold text-xs">
                      + {images.length} fotos
                    </div>
                  </div>
                </div>
              </div>

              {/* Seletor de Datas & Hóspedes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fazer check-in</label>
                  <input type="text" readOnly value="Seg., 26 de out." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fazer check-out</label>
                  <input type="text" readOnly value="Seg., 02 de nov." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Hóspedes</label>
                  <input type="text" readOnly value="2 hóspedes" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800" />
                </div>
              </div>

              {/* SEÇÃO PRINCIPAL: Opções de Reserva no Google Vacation Rentals */}
              <div className="space-y-3 pt-2">
                <h4 className="text-base font-bold text-slate-900">Opções de reserva no Google</h4>
                
                <div className="space-y-2">
                  {/* Opção 1: REALSTOCK (Parceiro Direto PMS Channel Manager) */}
                  <div className="p-4 rounded-2xl bg-blue-50/80 border-2 border-blue-500 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 p-1 flex items-center justify-center shrink-0">
                        <img src="/logo-realstock.jpg" alt="RealStock" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-blue-950 flex items-center gap-2">
                          www.realstock.com.br <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">Reserva Direta PMS</span>
                        </div>
                        <div className="text-xs text-slate-600">Sem taxa oculta de intermediação</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-lg font-black text-blue-900">{formattedPrice}</div>
                        <div className="text-[11px] text-slate-500">diária / total do período</div>
                      </div>
                      <a
                        href={directLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                      >
                        Acessar site <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>

                  {/* Opção 2 Simulada: Vrbo */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 opacity-75">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-900 text-white font-black text-xs flex items-center justify-center">V</div>
                      <span className="text-sm font-bold text-slate-800">Vrbo.com</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="text-sm font-bold text-slate-700">{formattedPrice}</div>
                      <span className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 bg-white">Acessar site</span>
                    </div>
                  </div>

                  {/* Opção 3 Simulada: Expedia */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 opacity-75">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">E</div>
                      <span className="text-sm font-bold text-slate-800">Expedia.com.br</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="text-sm font-bold text-slate-700">{formattedPrice}</div>
                      <span className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 bg-white">Acessar site</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Caixas de Ação do Channel Manager PMS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Link Direto do Google Travel */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" /> Link Direto no Google
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Abra a pesquisa oficial do imóvel diretamente no ecossistema do Google Travel / Vacation Rentals.
            </p>
            <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-2 font-mono text-xs text-sky-300 overflow-hidden">
              <span className="truncate">{googleDirectUrl}</span>
              <a
                href={googleDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold shrink-0 flex items-center gap-1"
              >
                Abrir <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Feed XML para o Google */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-sky-400" /> Feed XML PMS (Google Feed)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Endpoint XML nativo no padrão OpenTravel consultado pelo Google para atualizar diárias e disponibilidade.
            </p>
            <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-2 font-mono text-xs text-sky-300 overflow-hidden">
              <span className="truncate">{feedXmlUrl}</span>
              <button
                onClick={() => copyToClipboard(feedXmlUrl, setCopiedFeed)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold shrink-0 flex items-center gap-1"
              >
                <Copy size={12} /> {copiedFeed ? "Copiado!" : "Copiar XML"}
              </button>
            </div>
          </div>

          {/* Link Direto de Reserva */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ExternalLink size={18} className="text-emerald-400" /> Link Direto na RealStock
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Link direto sem comissão de intermediação (`www.realstock.com.br`) apontado no botão "Acessar site" do Google.
            </p>
            <div className="bg-black/50 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-2 font-mono text-xs text-emerald-300 overflow-hidden">
              <span className="truncate">{directLinkUrl}</span>
              <button
                onClick={() => copyToClipboard(directLinkUrl, setCopiedLink)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold shrink-0 flex items-center gap-1"
              >
                <Copy size={12} /> {copiedLink ? "Copiado!" : "Copiar Link"}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
