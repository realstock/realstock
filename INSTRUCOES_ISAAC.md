# Manual de Gestão e Sucessão do RealStock

> **Destinatários:** Isaac Luz de Faria (`isaacluzdefaria@gmail.com`) e Ravi Luz de Faria (`raviluzdefaria@gmail.com`)  
> **Autor:** Leo Batisti (`leobatisti@gmail.com`)  
> **Data:** Outubro de 2026

Olá Isaac e Ravi! Se vocês estão lendo este documento, significa que estão assumindo juntos o controle do **RealStock**, o portal imobiliário desenvolvido por Leo Batisti. 

Fiquem tranquilos: **vocês não precisam ser programadores** para cuidar do site. Toda a estrutura foi montada para que vocês operem com o auxílio do **Google Antigravity**, uma inteligência artificial que funciona como seu engenheiro de software particular.

---

## 1. O que é o RealStock?

O RealStock (`realstock.com.br`) é uma plataforma web para anúncio, venda, locação por temporada e compra de imóveis no Brasil. 

### Como o site ganha dinheiro:
1. **Taxa de Contato / Transação**: Cobrança via PayPal ou Pix para liberação de contato entre proprietário e comprador/locatário.
2. **Impulsionamento de Anúncios**: Corretores pagam para turbinar seus imóveis nas redes sociais (Instagram Reels, Facebook Feed, YouTube Shorts, Meta Ads e Google Ads).
3. **Assinaturas e Serviços**: Serviços cadastrados na plataforma.

---

## 2. Onde as Coisas Estão Hospedadas (Inventário de Acessos)

Para o site continuar no ar, 5 serviços principais são utilizados:

| Serviço | Função | Onde Acessar | O que você precisa saber |
| :--- | :--- | :--- | :--- |
| **Vercel** | Hospedagem do Site | [vercel.com](https://vercel.com) | É onde o código roda. Se você fizer uma alteração com o Antigravity, ele publica automaticamente aqui. |
| **Supabase** | Banco de Dados | [supabase.com](https://supabase.com) | Armazena todos os imóveis, fotos, usuários e propostas. Nunca altere nada manualmente aqui sem pedir ajuda ao Antigravity. |
| **PayPal** | Recebimento de Vendas | [paypal.com](https://paypal.com) | As taxas pagas pelos usuários caem na conta PayPal cadastrada. |
| **Resend** | Envio de E-mails | [resend.com](https://resend.com) | Envia e-mails de confirmação, propostas e o relatório mensal de contabilidade pessoal. |
| **Domínio (DNS)** | Endereço do Site | Registro.br / Vercel DNS | O domínio `realstock.com.br` aponta para os servidores da Vercel. |

As senhas e chaves de API secretas estão salvas no arquivo oculto `.env` na pasta do projeto. O Antigravity já tem acesso a elas.

---

## 3. Como Baixar o Projeto no Computador de Vocês e Ligar o Antigravity

Como vocês estarão em seus próprios computadores, o processo leva apenas 2 minutos:

### Passo 1: Baixar o Google Antigravity
Baixem e instalem o aplicativo oficial em: **[antigravity.google](https://antigravity.google)** (disponível para Mac e Windows).

### Passo 2: Baixar o Código do GitHub
No terminal do computador de vocês, colem o comando abaixo:

```bash
git clone https://github.com/realstock/realstock.git
cd realstock
./setup-antigravity.sh
```

*(Ou acessem [github.com/realstock/realstock](https://github.com/realstock/realstock), cliquem em Code > Download ZIP, extraiam a pasta e abram no Antigravity IDE).*

### Passo 3: Conectar à Vercel e ao Banco Supabase
Ao abrir o Antigravity, peçam no chat:
> *"Antigravity, conecte este computador à Vercel e ao Supabase do RealStock."*

O Antigravity executará a sincronização segura das chaves (`npx vercel env pull`), trazendo todas as credenciais do banco Supabase, PayPal e Resend para o computador de vocês de forma automática, sem precisarem copiar senhas manualmente!


### O que você pode pedir ao Antigravity?
Basta digitar em português simples:
- *"Antigravity, verifique se o site está funcionando e se há algum erro nos logs."*
- *"Antigravity, como posso aprovar ou excluir um anúncio que está com fotos feias?"*
- *"Antigravity, preciso fazer um novo deploy para atualizar o site."* (Ele vai rodar `npm run deploy` para você).
- *"Antigravity, me explique como funciona a contabilidade deste mês."*
- *"Antigravity, mude a cor do botão ou texto da página inicial."*

---

## 4. Rotina do Dia a Dia no Painel Admin

Acesse o painel do site em: **`https://realstock.com.br/admin`**

Lá você encontra ferramentas visuais prontas para:
1. **Gerenciar Imóveis (`/admin/imoveis`)**: Visualizar anúncios postados, aprovar ou desativar imóveis.
2. **Gerenciar Ofertas (`/admin/ofertas`)**: Acompanhar negociações de compra e temporada entre usuários.
3. **Pagamentos (`/admin/pagamentos`)**: Conferir se as taxas de reserva e contato foram pagas no PayPal/Pix.
4. **Caixa de Entrada (`/admin/inbox`)**: Responder e-mails enviados pelos clientes para `contato@realstock.com.br`.
5. **Contabilidade Pessoal (`/admin/contabilidade-pessoal`)**: Onde todos os meses os extratos e faturas são processados e enviados para o seu e-mail (`isaacluzdefaria@gmail.com`).
6. **Central de Sucessão (`/admin/sucessao`)**: Onde você pode ver este manual a qualquer momento, testar e-mails e conferir o status do sistema.

---

## 5. O que Fazer em Casos de Emergência

### "O site saiu do ar, o que eu faço?"
1. Abra o Antigravity pelo terminal ou aplicativo.
2. Escreva: *"Antigravity, o site está fora do ar. Por favor, analise a Vercel e o banco Supabase e me diga o que aconteceu."*
3. O Antigravity vai ler os logs de erro, identificar a causa e propor a solução para você autorizar.

### "Preciso renovar o pagamento de alguma ferramenta?"
Verifique se os cartões cadastrados na **Vercel** e no **Supabase** estão válidos para que as assinaturas básicas de hospedagem não sejam canceladas.

---

*Guardado com carinho e responsabilidade para você.*
