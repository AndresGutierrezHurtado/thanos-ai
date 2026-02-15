export default interface ResetPasswordDTO {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
}
