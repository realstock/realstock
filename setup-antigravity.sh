#!/usr/bin/env bash
# ==============================================================================
# REALSTOCK - Inicializador Automático do Google Antigravity
# Criado para: Isaac Luz de Faria e Ravi Luz de Faria
# Emails: isaacluzdefaria@gmail.com | raviluzdefaria@gmail.com
# Autor: Leo Batisti (leobatisti@gmail.com)
# ==============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "======================================================================"
echo "    🚀 BEM-VINDOS AO ASSISTENTE DE GESTÃO DO REALSTOCK (ANTIGRAVITY)  "
echo "======================================================================"
echo ""
echo "Isaac e Ravi, este script conecta vocês diretamente à Inteligência"
echo "Artificial para manter, consertar e fazer qualquer alteração no site."
echo ""

# 1. Verifica se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não foi encontrado no seu computador."
    echo "👉 Baixe e instale o Node.js facilmente em: https://nodejs.org"
    echo "Após instalar, execute este script novamente."
    exit 1
fi

echo "✅ Node.js detectado: $(node -v)"

# 2. Instala dependências se for uma máquina nova recém-clonada
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Primeira inicialização detectada neste computador! Instalando dependências..."
    npm install
fi

# 3. Verifica credenciais (.env / Vercel / Supabase)
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    echo ""
    echo "🔑 Arquivo de credenciais (.env) não encontrado neste computador."
    echo "Tentando sincronizar variáveis de ambiente diretamente da Vercel (Supabase, PayPal, Resend)..."
    npx vercel env pull .env.local || {
        echo "💡 Dica: Peça para o Antigravity: 'Antigravity, conecte meu computador à Vercel e ao Supabase'."
    }
fi

# 4. Gera cliente do Prisma
if [ -f "prisma/schema.prisma" ]; then
    npx prisma generate 2>/dev/null || true
fi

# 5. Verifica se o Antigravity CLI (agy) está instalado
if ! command -v agy &> /dev/null; then
    echo ""
    echo "⚠️  O Antigravity CLI ('agy') ainda não está instalado no seu terminal."
    echo "Tentando instalar globalmente via npm..."
    echo ""
    
    if npm install -g @google/antigravity 2>/dev/null || sudo npm install -g @google/antigravity 2>/dev/null; then
        echo "✅ Antigravity CLI instalado com sucesso!"
    else
        echo "💡 Você também pode abrir este projeto diretamente no aplicativo Antigravity IDE:"
        echo "   1. Baixe o aplicativo em: https://antigravity.google"
        echo "   2. Abra o Antigravity IDE, clique em 'File' > 'Open Folder...'"
        echo "   3. Selecione a pasta: $DIR"
        echo "   4. Pronto! O Antigravity já carregará todas as regras do RealStock automaticamente."
        echo ""
        read -p "Pressione Enter para tentar continuar ou fechar..."
        exit 0
    fi
fi

echo "✅ Google Antigravity pronto com poderes totais concedidos a Isaac e Ravi!"
echo ""
echo "----------------------------------------------------------------------"
echo "💡 DICAS RÁPIDAS PARA CONVERSAR COM O ANTIGRAVITY:"
echo "   - 'Antigravity, conecte este computador à Vercel e ao Supabase.'"
echo "   - 'Antigravity, verifique se o site está funcionando normalmente.'"
echo "   - 'Antigravity, faça deploy das alterações na Vercel.'"
echo "   - 'Antigravity, como vejo os pagamentos do PayPal deste mês?'"
echo "----------------------------------------------------------------------"
echo ""
echo "Iniciando o Antigravity no projeto RealStock agora..."
sleep 2

# Inicia o Antigravity CLI apontando para o workspace do RealStock
exec agy .
