import Image from "next/image";

export default function CearaBadge() {
  return (
    <div
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-white/15 shadow-xl shadow-black/40 backdrop-blur-md text-slate-200 select-none transition-all duration-300 hover:scale-105 hover:border-emerald-500/50 hover:bg-slate-900 group cursor-default"
      title="Plataforma desenvolvida no Ceará"
    >
      <div className="relative w-5 h-3.5 rounded-[2px] overflow-hidden shadow-sm shrink-0 border border-white/20">
        <Image
          src="/bandeira-ceara.svg"
          alt="Bandeira do Ceará"
          width={20}
          height={14}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="font-bold text-[11px] tracking-wide text-slate-200 group-hover:text-emerald-300 transition-colors">
        Do Ceará mesmo
      </span>
    </div>
  );
}
