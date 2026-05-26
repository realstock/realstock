"use client";

import { useState, useRef } from "react";
import { UploadCloud, CheckCircle, AlertTriangle, FileUp, Loader2 } from "lucide-react";

export default function ImportXMLPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    successCount?: number;
    failCount?: number;
    totalProcessed?: number;
    ignored?: number;
    error?: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xml')) {
        setFile(droppedFile);
        setResult(null);
      } else {
        alert("Por favor, envie apenas arquivos XML.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/minha-conta/importar-xml", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Erro no upload:", error);
      setResult({ success: false, error: "Erro na comunicação com o servidor." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <FileUp className="text-indigo-500" />
          Importar Imóveis em Lote
        </h1>
        <p className="text-slate-400 mt-2">
          Faça o upload do arquivo XML gerado pelo seu sistema imobiliário (padrão VivaReal/Zap). 
          Limite de 50 imóveis por vez para garantir o desempenho.
        </p>
      </div>

      {!result?.success ? (
        <div 
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
            isDragging 
              ? "border-indigo-500 bg-indigo-500/10" 
              : file 
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-600"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            accept=".xml" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
          />

          {!file ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <UploadCloud size={40} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Arraste seu arquivo XML aqui</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Suportamos arquivos exportados de CRMs como Universal Software, InGaia, Vista, entre outros.
              </p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
              >
                Selecionar do Computador
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
                <CheckCircle size={40} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Arquivo pronto!</h3>
              <p className="text-emerald-400 font-mono text-sm bg-emerald-950 px-4 py-2 rounded-lg border border-emerald-900">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
              
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Iniciar Importação"
                  )}
                </button>
              </div>
            </div>
          )}

          {result?.error && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-semibold">Falha na importação</h4>
                <p className="text-red-300 text-sm">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-3xl p-12 text-center">
          <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-400">
            <CheckCircle size={48} className="text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Importação Concluída!</h2>
          <p className="text-emerald-300 mb-8">Seu lote de imóveis foi processado.</p>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-10">
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <div className="text-3xl font-bold text-white mb-1">{result.totalProcessed}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Processados</div>
            </div>
            <div className="bg-emerald-950 rounded-2xl p-4 border border-emerald-900">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{result.successCount}</div>
              <div className="text-xs text-emerald-500 uppercase tracking-wider">Sucesso</div>
            </div>
            <div className="bg-red-950 rounded-2xl p-4 border border-red-900">
              <div className="text-3xl font-bold text-red-400 mb-1">{result.failCount}</div>
              <div className="text-xs text-red-500 uppercase tracking-wider">Falhas</div>
            </div>
          </div>

          {result.ignored && result.ignored > 0 && (
            <p className="text-slate-400 text-sm mb-8">
              {result.ignored} imóveis foram ignorados pois excederam o limite de 50 por lote.
            </p>
          )}

          <button 
            onClick={() => {
              setFile(null);
              setResult(null);
            }}
            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
          >
            Fazer nova importação
          </button>
        </div>
      )}
    </div>
  );
}
