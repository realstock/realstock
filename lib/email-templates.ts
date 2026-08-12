export const getOfferEmailTemplate = (propertyName: string, propertyId: number) => {
  // Forçamos o domínio oficial para garantir que o link no e-mail externo sempre funcione
  const baseUrl = "https://realstock.com.br";
  const offerUrl = `${baseUrl}/minha-conta/anuncios/${propertyId}/ofertas`;
  
  // Usando GIFs de fogos de artifício que funcionam bem em backgrounds e emails
  const fireworksGif = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ6Z3B3bm16NjJ6Z3B3bm16NjJ6Z3B3bm16NjJ6Z3B3bm16JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/26tOZ42Mg6pbTUPHW/giphy.gif";

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Nova Proposta Recebida - RealStock</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style type="text/css">
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
        
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #020617; }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }

        .cta-button {
            background-color: #4f46e5;
            border-radius: 12px;
            color: #ffffff !important;
            display: inline-block;
            font-family: 'Inter', Arial, sans-serif;
            font-size: 16px;
            font-weight: 700;
            line-height: 50px;
            text-align: center;
            text-decoration: none;
            width: 240px;
            -webkit-text-size-adjust: none;
        }

        @media screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                padding: 10px !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #020617;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 40px 0 40px 0; background-color: #020617; background-image: url('${fireworksGif}'); background-size: cover; background-position: center;">
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                <td align="center" valign="top" width="600">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: rgba(15, 23, 42, 0.8); border: 1px solid #1e293b; border-radius: 24px;">
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <div style="width: 80px; height: 80px; background-color: #064e3b; border: 2px solid #10b981; border-radius: 40px; line-height: 80px;">
                                            <span style="color: #10b981; font-size: 32px;">✓</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 8px;">
                                        <h1 style="margin: 0; color: #10b981; font-family: 'Inter', Arial, sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -1px;">Parabéns!</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <h2 style="margin: 0; color: #94a3b8; font-family: 'Inter', Arial, sans-serif; font-size: 18px; font-weight: 500;">Nova Proposta Recebida</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 32px;">
                                        <p style="margin: 0; color: #cbd5e1; font-family: 'Inter', Arial, sans-serif; font-size: 16px; line-height: 1.6;">
                                            O seu anúncio <strong style="color: #ffffff;">${propertyName}</strong> acaba de receber uma nova oferta!
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 32px;">
                                        <p style="margin: 0; color: #94a3b8; font-family: 'Inter', Arial, sans-serif; font-size: 15px; line-height: 1.6;">
                                            Acesse agora sua conta para avaliar os detalhes. O contato do comprador será liberado assim que você aceitar a proposta.
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 40px;">
                                        <a href="${offerUrl}" class="cta-button">Avaliar Proposta</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
        <tr>
            <td align="center" style="padding: 20px 0 40px 0; background-color: #020617;">
                <p style="margin: 0; color: #475569; font-family: 'Inter', Arial, sans-serif; font-size: 12px;">
                    RealStock - Negócios Imobiliários de Alto Padrão<br/>
                    Você recebeu este email porque possui um anúncio ativo.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};

export const getWelcomeEmailTemplate = (userName: string) => {
  const baseUrl = "https://realstock.com.br";
  
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Bem-vindo à RealStock!</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style type="text/css">
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
        
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #020617; }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }

        .cta-button {
            background-color: #4f46e5;
            border-radius: 12px;
            color: #ffffff !important;
            display: inline-block;
            font-family: 'Inter', Arial, sans-serif;
            font-size: 16px;
            font-weight: 700;
            line-height: 50px;
            text-align: center;
            text-decoration: none;
            width: 240px;
            -webkit-text-size-adjust: none;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #020617;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 40px 0 40px 0; background-color: #020617;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: rgba(15, 23, 42, 0.8); border: 1px solid #1e293b; border-radius: 24px;">
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <div style="width: 80px; height: 80px; background-color: #1e1b4b; border: 2px solid #4f46e5; border-radius: 40px; line-height: 80px;">
                                            <span style="color: #6366f1; font-size: 32px;">🌟</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 8px;">
                                        <h1 style="margin: 0; color: #ffffff; font-family: 'Inter', Arial, sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -1px;">Bem-vindo(a), ${userName.split(' ')[0]}!</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <h2 style="margin: 0; color: #818cf8; font-family: 'Inter', Arial, sans-serif; font-size: 18px; font-weight: 500;">Você está na plataforma do futuro.</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 32px; text-align: left;">
                                        <p style="margin: 0; color: #cbd5e1; font-family: 'Inter', Arial, sans-serif; font-size: 15px; line-height: 1.6;">
                                            Estamos muito felizes em ter você na RealStock! A nossa inteligência artificial já está pronta para transformar os seus imóveis em campanhas poderosas.<br><br>
                                            <strong>Dicas Iniciais:</strong><br>
                                            1. Cadastre seu primeiro imóvel na aba <strong>Anunciar</strong>.<br>
                                            2. Use o sistema <strong>Viralizar</strong> para gerar carrosséis e vídeos de Reels em 1 clique nas suas redes sociais.<br>
                                            3. Ative o <strong>Turbinar Anúncio</strong> para atrair leads ultra segmentados via Meta Ads.<br>
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 40px;">
                                        <a href="${baseUrl}/anunciar" class="cta-button">Anunciar Meu 1º Imóvel</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};

export const getReservationRequestEmailTemplate = (
  propertyName: string,
  checkInStr: string,
  checkOutStr: string,
  totalPriceStr: string,
  guestsCount: number
) => {
  const baseUrl = "https://realstock.com.br";
  const reservationUrl = `${baseUrl}/minha-conta/ofertas`;
  const fireworksGif = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ6Z3B3bm16NjJ6Z3B3bm16NjJ6Z3B3bm16NjJ6Z3B3bm16JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/26tOZ42Mg6pbTUPHW/giphy.gif";

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Novo Pedido de Reserva - RealStock</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style type="text/css">
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap');
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #020617; }
        .email-container { max-width: 600px; margin: 0 auto; }
        .cta-button {
            background-color: #10b981;
            border-radius: 12px;
            color: #020617 !important;
            display: inline-block;
            font-family: 'Inter', Arial, sans-serif;
            font-size: 16px;
            font-weight: 800;
            line-height: 50px;
            text-align: center;
            text-decoration: none;
            width: 260px;
            -webkit-text-size-adjust: none;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #020617;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding: 40px 0 40px 0; background-color: #020617; background-image: url('${fireworksGif}'); background-size: cover; background-position: center;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: rgba(15, 23, 42, 0.9); border: 1px solid #1e293b; border-radius: 24px;">
                    <tr>
                        <td align="center" style="padding: 40px 40px 30px 40px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <div style="width: 80px; height: 80px; background-color: #064e3b; border: 2px solid #10b981; border-radius: 40px; line-height: 80px;">
                                            <span style="color: #10b981; font-size: 32px;">🎉</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 8px;">
                                        <h1 style="margin: 0; color: #10b981; font-family: 'Inter', Arial, sans-serif; font-size: 30px; font-weight: 800;">Parabéns!</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <h2 style="margin: 0; color: #38bdf8; font-family: 'Inter', Arial, sans-serif; font-size: 20px; font-weight: 700;">Novo Pedido de Reserva Recebido</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 24px;">
                                        <p style="margin: 0; color: #cbd5e1; font-family: 'Inter', Arial, sans-serif; font-size: 16px; line-height: 1.6;">
                                            Seu imóvel <strong style="color: #ffffff;">${propertyName}</strong> acabou de receber uma solicitação de reserva!
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 28px;">
                                        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 20px; text-align: left;">
                                            <p style="margin: 0 0 8px 0; color: #94a3b8; font-family: 'Inter', Arial, sans-serif; font-size: 14px;"><strong>Período:</strong> ${checkInStr} a ${checkOutStr}</p>
                                            <p style="margin: 0 0 8px 0; color: #94a3b8; font-family: 'Inter', Arial, sans-serif; font-size: 14px;"><strong>Hóspedes:</strong> ${guestsCount}</p>
                                            <p style="margin: 0; color: #10b981; font-family: 'Inter', Arial, sans-serif; font-size: 16px; font-weight: 800;"><strong>Total da Estadia:</strong> R$ ${totalPriceStr}</p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 32px;">
                                        <p style="margin: 0; color: #fbbf24; font-family: 'Inter', Arial, sans-serif; font-size: 14px; line-height: 1.5; font-weight: 600;">
                                            ⏳ Você tem 24 horas para aceitar ou recusar a reserva.
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <a href="${reservationUrl}" class="cta-button">Aceitar ou Recusar Reserva</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};
