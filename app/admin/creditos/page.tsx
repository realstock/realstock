"use client";

import { useState, useEffect } from "react";
import { Coins, Ticket, CheckCircle2, User, Gift, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";

export default function GestaoCreditosAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States para Atribuir Crédito Direto
  const [selectedUser, setSelectedUser] = useState("");
  const [creditService, setCreditService] = useState("VIRALIZAR");
  const [creditAmount, setCreditAmount] = useState(1);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState("");
  const [assignError, setAssignError] = useState("");

  // States para Criar Cupom
  const [couponCode, setCouponCode] = useState("");
  const [couponService, setCouponService] = useState("VIRALIZAR");
  const [maxUses, setMaxUses] = useState(1);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState("");
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, couponsRes] = await Promise.all([
        fetch("/api/admin/users"), // Assumindo que essa rota existe ou criaremos
        fetch("/api/admin/coupons")
      ]);
      
      const usersData = await usersRes.json();
      const couponsData = await couponsRes.json();
      
      if (usersData.success) setUsers(usersData.users || []);
      if (couponsData.success) setCoupons(couponsData.coupons || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCredit = async () => {
    if (!selectedUser) {
      setAssignError("Selecione um usuário.");
      return;
    }
    setAssigning(true);
    setAssignError("");
    setAssignSuccess("");

    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUser,
          serviceType: creditService,
          amount: creditAmount
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setAssignSuccess(data.message);
        // Atualiza a lista local de usuários para refletir o saldo
        fetchData();
      } else {
        setAssignError(data.error);
      }
    } catch (err: any) {
      setAssignError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!couponCode) {
      setCouponError("Digite um código para o cupom.");
      return;
    }
    setCreatingCoupon(true);
    setCouponError("");
    setCouponSuccess("");

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          serviceType: couponService,
          maxUses: maxUses
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setCouponSuccess("Cupom criado com sucesso!");
        setCouponCode("");
        fetchData();
      } else {
        setCouponError(data.error);
      }
    } catch (err: any) {
      setCouponError(err.message);
    } finally {
      setCreatingCoupon(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Carregando...</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2 flex items-center gap-3">
            <Coins className="text-emerald-400" size={32} /> Central de Créditos
          </h1>
          <p className="text-slate-400">Gerencie saldos e cupons promocionais dos usuários.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Atribuir Crédito Direto */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Gift size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Atribuir Crédito</h2>
              <p className="text-xs text-slate-400">Envie o saldo diretamente para a conta.</p>
            </div>
          </div>

          {assignSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/20 text-emerald-300 rounded-xl flex items-center gap-2 text-sm border border-emerald-500/30">
              <CheckCircle2 size={16} /> {assignSuccess}
            </div>
          )}
          {assignError && (
            <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded-xl flex items-center gap-2 text-sm border border-red-500/30">
              <AlertCircle size={16} /> {assignError}
            </div>
          )}

          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Selecione o Usuário</label>
              <select 
                value={selectedUser} 
                onChange={e => setSelectedUser(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">-- Buscar Usuário --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email}) - V: {u.viralizarCredits} | T: {u.turbinarCredits || 0}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Serviço</label>
                <select 
                  value={creditService} 
                  onChange={e => setCreditService(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="VIRALIZAR">Míssil / Viralizar</option>
                  <option value="TURBINAR">Turbinar Ads</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Qtd de Créditos</label>
                <input 
                  type="number" 
                  min="1"
                  value={creditAmount}
                  onChange={e => setCreditAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleAssignCredit}
            disabled={assigning}
            className="mt-6 w-full py-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {assigning ? "ENVIANDO..." : "ENVIAR CRÉDITO AGORA"} <Gift size={18} />
          </button>
        </div>

        {/* Gerar Cupom Promocional */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Ticket size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gerar Cupom</h2>
              <p className="text-xs text-slate-400">Crie um código de desconto que adiciona crédito.</p>
            </div>
          </div>

          {couponSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/20 text-emerald-300 rounded-xl flex items-center gap-2 text-sm border border-emerald-500/30">
              <CheckCircle2 size={16} /> {couponSuccess}
            </div>
          )}
          {couponError && (
            <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded-xl flex items-center gap-2 text-sm border border-red-500/30">
              <AlertCircle size={16} /> {couponError}
            </div>
          )}

          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Código do Cupom</label>
              <input 
                type="text" 
                placeholder="EX: PROMO100"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Para o Serviço</label>
                <select 
                  value={couponService} 
                  onChange={e => setCouponService(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="VIRALIZAR">Míssil / Viralizar</option>
                  <option value="TURBINAR">Turbinar Ads</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Limite de Usos</label>
                <input 
                  type="number" 
                  min="1"
                  value={maxUses}
                  onChange={e => setMaxUses(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleCreateCoupon}
            disabled={creatingCoupon}
            className="mt-6 w-full py-4 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {creatingCoupon ? "CRIANDO..." : "CRIAR CÓDIGO"} <Ticket size={18} />
          </button>
        </div>

      </div>

      {/* Lista de Cupons Existentes */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Cupons Cadastrados</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase text-xs">
                <th className="p-3">Código</th>
                <th className="p-3">Serviço</th>
                <th className="p-3">Usos</th>
                <th className="p-3">Status</th>
                <th className="p-3">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 font-bold text-white">{c.code}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${c.serviceType === 'VIRALIZAR' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                      {c.serviceType}
                    </span>
                  </td>
                  <td className="p-3">{c.currentUses} / {c.maxUses}</td>
                  <td className="p-3">
                    {c.isActive ? (
                      <span className="text-emerald-400 text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} /> ATIVO</span>
                    ) : (
                      <span className="text-red-400 text-xs font-bold">ESGOTADO/INATIVO</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-400">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">Nenhum cupom criado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
  );
}
