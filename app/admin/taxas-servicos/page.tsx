"use client";

import { useEffect, useState } from "react";

type FeeType = "FIXED" | "PERCENTAGE";

type Fee = {
  id: number;
  name: string;
  type: FeeType;
  value: string;
  description?: string | null;
  isActive: boolean;
};

type Service = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  feeId?: number | null;
};

export default function TaxasServicosPage() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [feeForm, setFeeForm] = useState({
    name: "",
    type: "FIXED" as FeeType,
    value: "",
    description: "",
    isActive: true,
  });

  const [serviceForm, setServiceForm] = useState({
    name: "",
    slug: "",
    description: "",
    feeId: "",
    isActive: true,
  });

  async function loadData() {
    try {
      setLoading(true);

      const [feesRes, servicesRes] = await Promise.all([
        fetch("/api/admin/site-fees"),
        fetch("/api/admin/site-services"),
      ]);

      const feesData = await feesRes.json();
      const servicesData = await servicesRes.json();

      setFees(feesData);
      setServices(servicesData);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateFee(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch("/api/admin/site-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...feeForm,
          value: Number(feeForm.value),
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar taxa");

      setFeeForm({
        name: "",
        type: "FIXED",
        value: "",
        description: "",
        isActive: true,
      });

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar a taxa.");
    }
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch("/api/admin/site-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...serviceForm,
          feeId: serviceForm.feeId ? Number(serviceForm.feeId) : null,
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar serviço");

      setServiceForm({
        name: "",
        slug: "",
        description: "",
        feeId: "",
        isActive: true,
      });

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar o serviço.");
    }
  }

  async function handleFeeChange(serviceId: number, feeId: string) {
    try {
      const res = await fetch(`/api/admin/site-services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeId: feeId ? Number(feeId) : null,
        }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar taxa do serviço");

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar serviço.");
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-white">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Taxas e Serviços</h1>
          <p className="mt-2 text-sm text-slate-400">
            Cadastre as taxas do site, os serviços disponíveis e defina qual taxa será aplicada a cada serviço.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Cadastrar taxa</h2>

            <form onSubmit={handleCreateFee} className="space-y-4">
              <input
                type="text"
                placeholder="Nome da taxa"
                value={feeForm.name}
                onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 outline-none"
                required
              />

              <select
                value={feeForm.type}
                onChange={(e) =>
                  setFeeForm({ ...feeForm, type: e.target.value as FeeType })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 outline-none"
              >
                <option value="FIXED">Valor fixo</option>
                <option value="PERCENTAGE">Percentual</option>
              </select>

              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={feeForm.value}
                onChange={(e) => setFeeForm({ ...feeForm, value: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 outline-none"
                required
              />

              <textarea
                placeholder="Descrição"
                value={feeForm.description}
                onChange={(e) =>
                  setFeeForm({ ...feeForm, description: e.target.value })
                }
                className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 outline-none"
              />

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={feeForm.isActive}
                  onChange={(e) =>
                    setFeeForm({ ...feeForm, isActive: e.target.checked })
                  }
                />
                Ativa
              </label>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500"
              >
                Salvar taxa
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Cadastrar serviço</h2>

            <form onSubmit={handleCreateService} className="space-y-4">
              <input
                type="text"
                placeholder="Nome do serviço"
                value={serviceForm.name}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, name: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 outline-none"
                required
              />

              <input
                type="text"
                placeholder="Slug (ex: destaque-imovel)"
                value={serviceForm.slug}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, slug: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 outline-none"
                required
              />

              <textarea
                placeholder="Descrição"
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, description: e.target.value })
                }
                className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 outline-none"
              />

              <select
                value={serviceForm.feeId}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, feeId: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 outline-none"
              >
                <option value="">Selecione uma taxa</option>
                {fees.map((fee) => (
                  <option key={fee.id} value={fee.id}>
                    {fee.name} - {fee.type === "FIXED" ? "R$" : "%"} {fee.value}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={serviceForm.isActive}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, isActive: e.target.checked })
                  }
                />
                Ativo
              </label>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500"
              >
                Salvar serviço
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Taxas cadastradas</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="pb-3">Nome</th>
                  <th className="pb-3">Tipo</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="border-b border-white/5">
                    <td className="py-3">{fee.name}</td>
                    <td className="py-3">
                      {fee.type === "FIXED" ? "Fixa" : "Percentual"}
                    </td>
                    <td className="py-3">
                      {fee.type === "FIXED" ? "R$ " : ""}
                      {fee.value}
                      {fee.type === "PERCENTAGE" ? "%" : ""}
                    </td>
                    <td className="py-3">{fee.isActive ? "Ativa" : "Inativa"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Serviços cadastrados</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="pb-3">Serviço</th>
                  <th className="pb-3">Slug</th>
                  <th className="pb-3">Taxa aplicada</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-b border-white/5">
                    <td className="py-3">{service.name}</td>
                    <td className="py-3">{service.slug}</td>
                    <td className="py-3">
                      <select
                        value={service.feeId ?? ""}
                        onChange={(e) =>
                          handleFeeChange(service.id, e.target.value)
                        }
                        className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 outline-none"
                      >
                        <option value="">Sem taxa</option>
                        {fees.map((fee) => (
                          <option key={fee.id} value={fee.id}>
                            {fee.name} - {fee.type === "FIXED" ? "R$" : "%"} {fee.value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3">
                      {service.isActive ? "Ativo" : "Inativo"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}