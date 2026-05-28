export function emailRedefinirSenha({ token }: { token: string }) {
  const url  = process.env.NEXTAUTH_URL ?? "https://bemoo.net"
  const link = `${url}/redefinir-senha?token=${token}`

  return {
    subject: "Redefinição de senha — bemoo",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>Redefinir senha</title></head>
<body style="margin:0;padding:0;background:#F8F9FB;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #D9DEE3;overflow:hidden;">
        <tr><td style="background:#1F4E4A;padding:32px 40px;">
          <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">bem<span style="color:#E07A35;">oo</span></p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1A1F23;">Redefinir senha</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#4A5057;line-height:1.6;">
            Recebemos uma solicitação para redefinir a senha da sua conta.<br />
            Clique no botão abaixo. O link expira em <strong>1 hora</strong>.
          </p>
          <a href="${link}"
             style="display:inline-block;background:#1F4E4A;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:500;">
            Redefinir minha senha →
          </a>
          <hr style="margin:32px 0;border:none;border-top:1px solid #D9DEE3;" />
          <p style="margin:0;font-size:13px;color:#8D9298;">
            Se você não solicitou isso, ignore este e-mail — sua senha não será alterada.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#F8F9FB;border-top:1px solid #D9DEE3;">
          <p style="margin:0;font-size:12px;color:#8D9298;">© ${new Date().getFullYear()} bemoo</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Redefina sua senha em: ${link}\n\nExpira em 1 hora. Se não solicitou, ignore.`,
  }
}
