export default interface ITokenProvider {
    sign(userId: string, email: string): string;
}
