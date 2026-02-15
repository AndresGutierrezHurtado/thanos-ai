import nodemailer from "nodemailer";

import IEmailSender from "../../application/ports/services/IEmailSender";

export default class NodemailerEmailSender implements IEmailSender {
    private readonly transporter;

    constructor() {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT) || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const secure = port === 465 || process.env.SMTP_SECURE === "true";

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: user && pass ? { user, pass } : undefined,
        });
    }

    public async sendVerificationCode(to: string, code: string): Promise<void> {
        const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "Thanos AI <noreply@plataforma.com.co>";
        const subject = "Código de verificación - Thanos AI";
        const html = `
          <p>Tu código de verificación es: <strong>${code}</strong></p>
          <p>Válido por 10 minutos. No lo compartas con nadie.</p>
          <p>— Thanos AI</p>
        `;
        const text = `Tu código de verificación es: ${code}. Válido por 10 minutos.`;

        await this.transporter.sendMail({
            from,
            to,
            subject,
            text,
            html,
        });
    }
}
