"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

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
  const [identityDocumentUrl, setIdentityDocumentUrl] = useState("");
  const [identityDocumentVerified, setIdentityDocumentVerified] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docSuccessMessage, setDocSuccessMessage] = useState("");

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
      setIdentityDocumentUrl(user.identityDocumentUrl || "");
      setIdentityDocumentVerified(!!user.identityDocumentVerified);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar perfil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadProfile();
    }
  }, [status]);

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Por favor, selecione um arquivo no formato PDF.");
      return;
    }

    try {
      setUploadingDoc(true);
      setError("");
      setDocSuccessMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/minha-conta/identity-document", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao enviar documento de identidade.");
      }

      setIdentityDocumentUrl(data.identityDocumentUrl);
      setIdentityDocumentVerified(true);

      if (data.user?.name) setName(data.user.name);
      if (data.user?.cpfCnpj) setCpfCnpj(data.user.cpfCnpj);

      let msg = "✅ Documento de Identidade em PDF carregado e verificado com sucesso!";
      if (data.nameUpdated || data.cpfUpdated) {
        const changes = [];
        if (data.nameUpdated) changes.push(`Nome (${data.extractedName})`);
        if (data.cpfUpdated) changes.push(`CPF (${data.extractedCpf})`);
        msg += ` Atualizamos automaticamente: ${changes.join(" e ")}.`;
      }
      setDocSuccessMessage(msg);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar documento.");
    } finally {
      setUploadingDoc(false);
    }
  }

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

  if (loading) {
    return <LoadingScreen title="Meu Cadastro" subtitle="Acessando suas informações pessoais..." />;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link 
            href="/minha-conta" 
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-sky-500/50 shadow-lg shadow-sky-500/5 group"
          >
            <X size={16} className="rotate-45 group-hover:scale-110 transition-transform" />
            Voltar para o Painel
          </Link>
        </div>

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

          {/* Identity Document PDF Section */}
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-sky-300 flex items-center gap-2">
                  <span>📄</span> Documento de Identidade (PDF)
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Exigido em PDF para solicitar ou aceitar reservas no site. Ao enviar, seu Nome Completo e CPF são verificados e ajustados automaticamente.
                </p>
              </div>

              {identityDocumentUrl && (
                <a
                  href={identityDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-sky-400/40 bg-sky-500/20 px-3.5 py-1.5 text-xs font-bold text-sky-200 hover:bg-sky-500/30 transition shrink-0"
                >
                  📄 Visualizar PDF 🔗
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <label className={`rounded-xl px-4 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer flex items-center gap-2 shadow-md ${
                uploadingDoc ? "bg-slate-600 cursor-not-allowed" : "bg-sky-400 hover:bg-sky-300 shadow-sky-500/20"
              }`}>
                <span>{uploadingDoc ? "⏳ Analisando PDF via IA..." : "📎 Upload Documento de Identidade (PDF)"}</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={uploadingDoc}
                  onChange={handleDocUpload}
                />
              </label>

              {identityDocumentUrl ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  ✓ Documento Carregado e Verificado
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  ⚠️ Nenhum PDF carregado (Exigido para reservas)
                </span>
              )}
            </div>

            {docSuccessMessage && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs font-bold text-emerald-300">
                {docSuccessMessage}
              </div>
            )}
          </div>

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