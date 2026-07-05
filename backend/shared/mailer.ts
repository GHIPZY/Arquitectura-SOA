import nodemailer from 'nodemailer'

/**
 * Envío de correos vía SMTP (Gmail u otro proveedor).
 * Config por variables de entorno del servicio que lo use:
 *   SMTP_HOST  (ej: smtp.gmail.com)
 *   SMTP_PORT  (ej: 465)
 *   SMTP_USER  (correo emisor)
 *   SMTP_PASS  (contraseña de aplicación, NO la contraseña normal)
 *   MAIL_FROM  (opcional, remitente mostrado; default SMTP_USER)
 *
 * Si no hay SMTP configurado, los correos se registran en consola
 * (modo simulado) para no romper el flujo en desarrollo.
 */

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: Number(SMTP_PORT ?? 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

export interface MailOptions {
  to: string | string[]
  subject: string
  html: string
}

export async function sendMail({ to, subject, html }: MailOptions): Promise<void> {
  const transporter = getTransporter()
  const destinatarios = Array.isArray(to) ? to.join(', ') : to

  if (!transporter) {
    console.log(`[mailer] SMTP no configurado — correo SIMULADO → ${destinatarios} | asunto: "${subject}"`)
    return
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to: destinatarios,
    subject,
    html,
  })
  console.log(`[mailer] Correo enviado → ${destinatarios} | asunto: "${subject}"`)
}
