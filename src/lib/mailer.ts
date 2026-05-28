import nodemailer from "nodemailer"

// Criar transporter dentro da função — nunca singleton de módulo
// (evita ler env vars em load time, antes de estarem disponíveis)
function makeTransporter() {
  const port   = Number(process.env.SMTP_PORT ?? 465)
  const secure = port === 465 // SSL para 465, STARTTLS para 587

  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   ?? "smtp.hostinger.com",
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  })
}

interface SendMailOptions {
  to:      string
  subject: string
  html:    string
  text?:   string
}

export async function sendMail({ to, subject, html, text }: SendMailOptions) {
  // Nunca enviar e-mail em desenvolvimento — evita spam acidental
  if (process.env.NODE_ENV === "development") {
    console.log(`[Mailer DEV] Para: ${to} | Assunto: ${subject}`)
    return
  }

  const transporter = makeTransporter()
  const from = process.env.SMTP_FROM ?? `"bemoo" <${process.env.SMTP_USER}>`

  await transporter.sendMail({ from, to, subject, html, text })
}
