"use client";

import { useState } from "react";

export default function PropertyShareButtons({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const [message, setMessage] = useState("");

  const shareText = `${title}\n${url}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function handleInstagramShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: title,
          url,
        });
        setMessage("Link pronto para compartilhar.");
        return;
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setMessage("Link copiado. Cole no Instagram.");
        window.open("https://www.instagram.com/", "_blank");
        return;
      }

      window.prompt("Copie o link:", url);
      setMessage("Copie o link e cole no Instagram.");
    } catch {
      window.prompt("Copie o link:", url);
      setMessage("Copie o link e cole no Instagram.");
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-3 text-sm text-slate-400">Compartilhar</div>

      <div className="flex gap-3">
        {/* WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 hover:opacity-90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            className="h-6 w-6 fill-white"
          >
            <path d="M16.001 3C8.82 3 3 8.82 3 16.001c0 2.823.916 5.44 2.463 7.562L4 29l5.607-1.447A12.94 12.94 0 0016 29c7.181 0 13-5.82 13-12.999C29 8.82 23.182 3 16.001 3zm0 23.4a10.3 10.3 0 01-5.248-1.441l-.376-.223-3.328.858.888-3.244-.244-.387A10.3 10.3 0 115 16.001c0-5.682 4.618-10.3 10.3-10.3s10.3 4.618 10.3 10.3-4.618 10.3-10.3 10.3zm5.58-7.717c-.304-.152-1.8-.888-2.078-.99-.28-.102-.484-.152-.688.152s-.79.99-.968 1.193c-.176.204-.352.228-.656.076-.304-.152-1.283-.472-2.444-1.505-.904-.806-1.515-1.8-1.694-2.104-.176-.304-.019-.468.133-.62.136-.136.304-.352.456-.528.152-.176.204-.304.304-.508.102-.204.051-.38-.025-.532-.076-.152-.688-1.66-.944-2.276-.248-.596-.5-.516-.688-.524l-.584-.01c-.204 0-.532.076-.81.38s-1.064 1.04-1.064 2.536 1.09 2.94 1.24 3.144c.152.204 2.14 3.264 5.188 4.574.726.314 1.293.502 1.734.642.728.232 1.39.2 1.914.122.584-.086 1.8-.736 2.054-1.446.254-.71.254-1.318.178-1.446-.076-.128-.28-.204-.584-.356z" />
          </svg>
        </a>

        {/* Instagram */}
        <button
          onClick={handleInstagramShare}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 hover:opacity-90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-6 w-6 fill-white"
          >
            <path d="M7.75 2C4.678 2 2 4.678 2 7.75v8.5C2 19.322 4.678 22 7.75 22h8.5C19.322 22 22 19.322 22 16.25v-8.5C22 4.678 19.322 2 16.25 2h-8.5zm0 2h8.5C18.217 4 20 5.783 20 7.75v8.5c0 1.967-1.783 3.75-3.75 3.75h-8.5C5.783 20 4 18.217 4 16.25v-8.5C4 5.783 5.783 4 7.75 4zm9.75 1.5a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z" />
          </svg>
        </button>
      </div>

      {message && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
          {message}
        </div>
      )}
    </div>
  );
}