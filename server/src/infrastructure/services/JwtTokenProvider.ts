import jwt from "jsonwebtoken";

import ITokenProvider from "../../application/ports/services/ITokenProvider";

export default class JwtTokenProvider implements ITokenProvider {
    public sign(userId: string, email: string): string {
        const secret = process.env.JWT_SECRET ?? "default-secret-change-in-production";
        return jwt.sign({ userId, email }, secret, { expiresIn: "7d" });
    }
}
