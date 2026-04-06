"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function PerfilPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [bio, setBio] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [country, setCountry] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");
  const [avatar, setAvatar] = useState("");

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/minha-conta/perfil");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar perfil.");
      }

      const user = data.user;

      setName(user.name || "");
      setEmail(user.email || "");
      setCpfCnpj(user.cpfCnpj || "");
      setPhone(user.phone || "");
      setInstagram(user.instagram || "");
      setBio(user.bio || "");
      setPaypalEmail(user.paypalEmail || "");
      setCountry(user.country || "");
      setStateName(user.state || "");
      setCity(user.city || "");
      setAvatar(user.avatar || "");
    } catch (err: any) {
      setError(err.message || "Erro ao carregar perfil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      loadProfile();
    }
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      setSaving(true);

      const res = await fetch("/api/minha-conta/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          cpfCnpj,
          phone,
          instagram,
          bio,
          paypalEmail,
          country,
          state: stateName,
          city,
          avatar,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar perfil.");
      }

      setMessage("Dados atualizados com sucesso.");
    } catch (err: any) {
      setError(err.message || "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-4xl text-slate-400">Carregando...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="text-sm text-slate-400">Minha conta</div>
          <h1 className="mt-2 text-4xl font-bold">Meu cadastro</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5"
        >
          <Grid2>
            <Field label="Nome *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
              />
            </Field>

            <Field label="Email">
              <input
                value={email}
                className="input opacity-70"
                readOnly
              />
            </Field>
          </Grid2>

          <Grid2>
            <Field label="CPF / CNPJ">
              <input
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Telefone / WhatsApp">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
              />
            </Field>
          </Grid2>

          <Grid2>
            <Field label="Instagram">
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Email do PayPal">
              <input
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="input"
              />
            </Field>
          </Grid2>

          <Grid2>
            <Field label="País">
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Estado">
              <input
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="input"
              />
            </Field>
          </Grid2>

          <Grid2>
            <Field label="Cidade">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input"
              />
            </Field>

            <Field label="URL da foto de perfil">
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="input"
              />
            </Field>
          </Grid2>

          <Field label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="input"
            />
          </Field>

          {message && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-900 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}