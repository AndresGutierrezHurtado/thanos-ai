import nodemailer from "nodemailer";

import IEmailSender from "../../application/ports/services/IEmailSender";

function buildOtpEmailHtml(code: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de verificación - Thanos AI</title>
</head>
<body style="margin:0; padding:0; background-color:#1c1f1c; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#1c1f1c;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 380px;">
                    <tr>
                        <td style="text-align: center; padding-bottom: 24px;">
                            <p style="margin:0; font-size: 28px; font-weight: 800; color: #edffed; letter-spacing: 0.05em;">
                                THANOS <span style="color: #009900; font-style: italic;">AI</span>
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 12px; color: rgba(237,255,237,0.8); letter-spacing: 0.2em; text-transform: uppercase;">
                                Acceso
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: rgba(37,41,37,0.6); border: 1px solid rgba(46,49,46,0.8); border-radius: 16px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
                            <p style="margin: 0 0 4px 0; font-size: 18px; font-weight: 500; letter-spacing: 0.05em; color: #009900;">
                                Verifica tu correo
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.4; color: rgba(237,255,237,0.6);">
                                Usa el siguiente código para completar la verificación. Si no solicitaste este correo, puedes ignorarlo.
                            </p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 16px 0; background-color: rgba(46,49,46,0.5); border-radius: 8px; border-bottom: 2px solid #009900;">
                                        <span style="font-size: 28px; font-weight: 600; letter-spacing: 0.4em; color: #edffed; font-variant-numeric: tabular-nums;">
                                            ${code}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 16px 0 0 0; font-size: 12px; color: rgba(237,255,237,0.5); text-align: center;">
                                Válido por 10 minutos. No compartas este código con nadie.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top: 24px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: rgba(237,255,237,0.4); letter-spacing: 0.05em;">
                                — Thanos AI
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

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
        const from =
            process.env.SMTP_FROM ??
            process.env.SMTP_USER ??
            "Thanos AI <noreply@plataforma.com.co>";
        const subject = `Código de verificación | Thanos AI ${new Date().toLocaleString()}`;
        const html = buildOtpEmailHtml(code);
        const text = `Thanos AI - Tu código de verificación es: ${code}. Válido por 10 minutos. No lo compartas con nadie.`;

        await this.transporter.sendMail({
            from,
            to,
            subject,
            text,
            html,
        });
    }
}
