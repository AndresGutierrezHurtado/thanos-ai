import IEmailSender from "../../application/ports/services/IEmailSender";

/**
 * Envía el código OTP por consola (desarrollo).
 * En producción reemplazar por implementación con Nodemailer u otro servicio.
 */
export default class ConsoleEmailSender implements IEmailSender {
    public async sendVerificationCode(to: string, code: string): Promise<void> {
        console.log(`[Email] Verificación para ${to}: tu código OTP es ${code}`);
    }
}
