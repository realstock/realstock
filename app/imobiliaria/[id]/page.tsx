import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, MapPin } from "lucide-react";

export default async function ImobiliariaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);

  if (!userId || Number.isNaN(userId)) notFound();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      properties: {
        where: {
          // Opcional: apenas imóveis ativos se houver status
        },
        include: {
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" }
          }
        }
      }
    }
  });

  if (!user) notFound();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header da Imobiliária */}
      <section className="border-b border-white/10 bg-white/5 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-32 w-48 overflow-hidden rounded-2xl bg-white p-4 shadow-2xl">
              {user.companyLogo ? (
                <img src={user.companyLogo} alt={user.name} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <Building2 size={48} />
                </div>
              )}
            </div>
            
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-bold">{user.name}</h1>
              <p className="mt-2 text-slate-400">Parceiro Oficial RealStock</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-4 py-1 text-xs font-bold text-sky-400 border border-sky-500/20">
                 {user.properties.length} Imóveis Disponíveis
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lista de Imóveis */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="text-2xl font-bold mb-8">Todos os anúncios desta imobiliária</h2>
        
        {user.properties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-500">
             Esta imobiliária ainda não possui imóveis públicos.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {user.properties.map((property) => (
              <Link
                key={property.id}
                href={`/imovel/${property.id}`}
                className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/5 transition-all hover:border-white/20"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {property.images[0] ? (
                    <img
                      src={property.images[0].imageUrl}
                      alt={property.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-900 text-slate-500">
                      Sem foto
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 rounded-xl bg-slate-900/80 px-3 py-1.5 text-sm font-bold backdrop-blur-md">
                    R$ {Number(property.price).toLocaleString("pt-BR")}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="line-clamp-1 font-bold">{property.title}</h3>
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                    <MapPin size={12} />
                    {property.city && property.state ? `${property.city}, ${property.state}` : property.city || "Localização não informada"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
