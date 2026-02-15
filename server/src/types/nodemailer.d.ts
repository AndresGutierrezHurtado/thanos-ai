declare module "nodemailer" {
    export interface TransportOptions {
        host?: string;
        port?: number;
        secure?: boolean;
        auth?: { user: string; pass: string };
    }
    export interface SendMailOptions {
        from?: string;
        to: string;
        subject: string;
        text?: string;
        html?: string;
    }
    export function createTransport(options: TransportOptions): {
        sendMail(options: SendMailOptions): Promise<unknown>;
    };
}
