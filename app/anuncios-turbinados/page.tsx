"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Rocket, Eye, Camera, ArrowRight, Sparkles } from "lucide-react";

export default function AnunciosTurbinadosPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/vitrine-turbinada")
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setItems(data.items);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Rocket className="text-pink-500 animate-bounce" size={48} />
                    <p className="text-xl font-bold tracking-widest uppercase">Carregando Vitrine em Alta...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white px-4 py-12 md:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 shadow-lg shadow-pink-500/20">
                        <Sparkles size={12} /> Exclusivo RealStock
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 leading-tight">
                        EM ALTA NA META
                    </h1>
                    <div className="max-w-3xl mx-auto">
                        <p className="text-slate-300 text-lg md:text-xl font-medium mb-3">
                            Confira os imóveis que estão dominando o Instagram e Facebook no momento.
                        </p>
                        <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
                            Estas visualizações representam <span className="text-indigo-400 font-bold">usuários qualificados</span> filtrados por nossa Inteligência Artificial para entregar seu anúncio a quem realmente importa. Na RealStock, priorizamos a <span className="text-white font-bold">qualidade sobre a quantidade</span>, garantindo que sua venda alcance o máximo de clientes em potencial.
                        </p>
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                        <p className="text-slate-500 italic">Nenhum anúncio turbinado no momento. Seja o primeiro!</p>
                        <Link href="/anunciar" className="mt-4 inline-block text-pink-500 hover:underline">Turbine seu imóvel agora</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {items.map((item) => (
                            <div 
                                key={item.id}
                                className="group relative rounded-[2.5rem] p-[3px] transition-all hover:scale-[1.02] duration-500 shadow-2xl shadow-purple-500/10"
                                style={{ 
                                    background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)" // Borda Instagram
                                }}
                            >
                                <div className="absolute -top-4 -right-4 bg-gradient-to-tr from-purple-600 to-pink-500 text-white px-4 py-1 rounded-full font-black text-[9px] z-10 shadow-xl flex items-center gap-1 border border-white/20">
                                    <Rocket size={12} fill="white" /> EM ALTA NO INSTAGRAM
                                </div>

                                <div className="h-full w-full rounded-[2.4rem] overflow-hidden relative flex flex-col bg-slate-950">
                                    
                                    {/* Imagem do Item */}
                                    <div className="h-64 w-full relative group">
                                        <img 
                                            src={item.image} 
                                            alt={item.title} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        
                                        <div className="absolute bottom-4 left-6 flex items-center gap-4 group/stats">
                                            <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/20">
                                                <Camera size={20} className="text-white" />
                                            </div>
                                            <div className="flex gap-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-tighter leading-none">Meta Ads</span>
                                                    <span className="text-xl font-black text-white flex items-center gap-1.5 leading-none">
                                                        {(item.paidViews || 0).toLocaleString()} <Rocket size={14} className="text-pink-400" />
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-tighter leading-none">Orgânico</span>
                                                    <span className="text-xl font-black text-white flex items-center gap-1.5 leading-none">
                                                        {(item.organicViews || 0).toLocaleString()} <Eye size={16} className="text-indigo-400" />
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Tooltip Persuasivo de IA */}
                                            <div className="absolute bottom-full left-0 mb-4 w-64 p-4 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/stats:opacity-100 group-hover/stats:translate-y-0 transition-all duration-300 z-50">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="bg-indigo-500/20 p-1 rounded-lg">
                                                        <Rocket size={14} className="text-indigo-400" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Impacto Inteligente</span>
                                                </div>
                                                <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                                                    Achou pouco? Estas <span className="text-white font-bold">{(item.paidViews + item.organicViews).toLocaleString()}</span> pessoas são <span className="text-indigo-300">clientes qualificados</span> selecionados pela nossa IA. Não buscamos quantidade, buscamos os compradores que dão resultado!
                                                </p>
                                                <div className="absolute top-full left-6 w-3 h-3 bg-slate-900 border-r border-b border-indigo-500/30 rotate-45 -mt-1.5"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalhes */}
                                    <div className="p-8 flex flex-col flex-1 justify-between">
                                        <div>
                                            <h2 className="text-2xl font-black text-white leading-tight line-clamp-2 mb-4 drop-shadow-md">
                                                {item.title}
                                            </h2>
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                <span className="bg-black/20 px-3 py-1 rounded-full text-[10px] font-bold text-white/80 border border-white/10 uppercase">
                                                    {item.type === 'LOT' ? 'Lote Verificado' : 'Destaque Individual'}
                                                </span>
                                                <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase italic">
                                                    Rodando agora
                                                </span>
                                            </div>
                                        </div>

                                        <a 
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group/btn flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white text-black font-black uppercase text-sm transition-all hover:bg-yellow-400 hover:shadow-xl active:scale-95"
                                        >
                                            Ver Detalhes do Anúncio
                                            <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer / CTA */}
                <div className="mt-24 text-center p-12 rounded-[3.5rem] bg-gradient-to-br from-indigo-900/20 to-slate-900/50 border border-white/10">
                    <h2 className="text-3xl font-bold mb-4">Quer seu imóvel nesta vitrine?</h2>
                    <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                        Inicie um turbinamento agora e apareça para milhares de pessoas interessadas no Facebook e Instagram.
                    </p>
                    <Link href="/minha-conta/anuncios" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold transition-all inline-flex items-center gap-2">
                        Turbinar meu anúncio <ArrowRight size={20} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
