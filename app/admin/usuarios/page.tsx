"use client";

import { useEffect, useState } from "react";
import AdminBackButton from "@/components/AdminBackButton";
type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/usuarios");
      const data = await res.json();

      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function toggleAdmin(userId: number, currentRole: string) {
    try {
      const res = await fetch("/api/admin/usuarios/role", {
        method: "POST",
        body: JSON.stringify({
          userId,
          role: currentRole === "admin" ? "user" : "admin",
        }),
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filtered = users.filter((user) =>
    `${user.name} ${user.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-6">

        <div className="mb-6">
          <AdminBackButton /> 
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-slate-400 mt-1">
            Controle total de usuários do sistema
          </p>
        </div>

        {/* BUSCA */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email"
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          />
        </div>

        {/* TABELA */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">

          <div className="grid grid-cols-[80px_1.5fr_1.5fr_1fr_1fr] gap-4 border-b border-white/10 px-4 py-3 text-sm text-slate-400">
            <div>ID</div>
            <div>Nome</div>
            <div>Email</div>
            <div>Role</div>
            <div>Ações</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-slate-400">
              Carregando usuários...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-slate-400">
              Nenhum usuário encontrado.
            </div>
          ) : (
            filtered.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[80px_1.5fr_1.5fr_1fr_1fr] gap-4 border-b border-white/5 px-4 py-4 text-sm items-center"
              >
                <div>#{user.id}</div>
                <div>{user.name}</div>
                <div>{user.email}</div>

                <div>
                  <span
                    className={`px-3 py-1 rounded-xl text-xs ${
                      user.role === "admin"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <div className="flex gap-2">

                  <button
                    onClick={() => toggleAdmin(user.id, user.role)}
                    className="rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-xs text-blue-300 hover:bg-blue-400/20"
                  >
                    {user.role === "admin"
                      ? "Remover Admin"
                      : "Tornar Admin"}
                  </button>

                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}