import nodemailer from "nodemailer";

export interface EmailConfig {
  to: string;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export async function sendEmailAlert(
  config: EmailConfig,
  subject: string,
  text: string,
) {
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: config.to,
    subject,
    text,
  });
}
