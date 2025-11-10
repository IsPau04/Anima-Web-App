// backend/services/mailer.js
import nodemailer from "nodemailer";

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
} = process.env;

export const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: Number(SMTP_PORT) === 465, // true solo si usas 465
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export async function sendResetCodeEmail({ to, code }) {
  const subject = "Tu código de verificación (Ánima)";
  const text = `Usa este código para restablecer tu contraseña:\n\n${code}\n\nCaduca en 10 minutos.`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial">
      <h2 style="margin:0 0 8px">Restablecer contraseña</h2>
      <p>Usa este código para verificar tu identidad:</p>
      <div style="font-size:28px;font-weight:800;letter-spacing:6px">${code}</div>
      <p style="color:#555">Caduca en 10 minutos.</p>
    </div>`;

  await mailer.sendMail({
    from: EMAIL_FROM || SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}
