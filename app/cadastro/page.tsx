"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CadastroPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");

  const [country, setCountry] = useState("Brasil");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");

  const [paypalEmail, setPaypalEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!name || !email || !password) {
      setError("Nome, email e senha são obrigatórios.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name,
        email,
        password,
        phone,
        instagram,
        cpf_cnpj: cpfCnpj,
        country,
        state: stateName,
        city,
        paypal_email: paypalEmail,
      };

      console.log("CADASTRO PAYLOAD:", payload);

      const res = await fetch("/api/cadastro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("CADASTRO RESPOSTA:", data);

      if (!res.ok || !data.success) {
        setError(data.error || "Não foi possível realizar o cadastro.");
        return;
      }

      setMessage("Cadastro realizado com sucesso.");

      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch (err: any) {
      console.error("ERRO CADASTRO:", err);
      setError(err.message || "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <div className="text-sm text-slate-400">Acesso</div>
          <h1 className="mt-2 text-4xl font-bold">Criar conta</h1>
          <p className="mt-2 text-slate-400">
            Cadastre seu perfil para anunciar imóveis e enviar ofertas.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-white/10 bg-white/5 p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Seu nome"
              />
            </Field>

            <Field label="Email *">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="voce@email.com"
              />
            </Field>

            <Field label="Senha *">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="********"
              />
            </Field>

            <Field label="Telefone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="(85) 99999-9999"
              />
            </Field>

            <Field label="Instagram">
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="input"
                placeholder="@seuinstagram"
              />
            </Field>

            <Field label="CPF / CNPJ">
              <input
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                className="input"
                placeholder="000.000.000-00"
              />
            </Field>

            <Field label="País">
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input"
                placeholder="Brasil"
              />
            </Field>

            <Field label="Estado">
              <input
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="input"
                placeholder="Ceará"
              />
            </Field>

            <Field label="Cidade">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input"
                placeholder="Fortaleza"
              />
            </Field>

            <Field label="Email do PayPal">
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="input"
                placeholder="paypal@email.com"
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-white px-4 py-4 font-semibold text-slate-900 disabled:opacity-60"
          >
            {loading ? "Cadastrando..." : "Criar conta"}
          </button>
        </form>
      </section>
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