"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

interface LoadingScreenProps {
    title?: string;
    subtitle?: string;
}

export default function LoadingScreen({ 
    title = "Processando Dados", 
    subtitle = "Sincronizando informações em tempo real..." 
}: LoadingScreenProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 94) {
                    clearInterval(interval);
                    return prev;
                }
                const increment = prev < 65 ? 4 : 0.4;
                return Math.min(prev + increment, 94);
            });
        }, 80);

        return () => clearInterval(interval);
    }, []);

    return (
        <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white fixed inset-0 z-[9999] backdrop-blur-xl">
            <div className="w-full max-w-md text-center">
                <div className="mb-8 flex justify-center">
                    <div className="bg-indigo-500/20 p-4 rounded-3xl animate-pulse">
                        <Activity className="text-indigo-400" size={48} />
                    </div>
                </div>
                
                <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">{title}</h2>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-8">{subtitle}</p>
                
                <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                
                <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="animate-pulse">Otimizando experiência...</span>
                    <span className="text-indigo-400">{Math.round(progress)}%</span>
                </div>
            </div>
        </main>
    );
}
