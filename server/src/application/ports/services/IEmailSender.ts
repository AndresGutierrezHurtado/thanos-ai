export default interface IEmailSender {
    sendVerificationCode(to: string, code: string): Promise<void>;
}
