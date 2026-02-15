import bcrypt from "bcrypt";

import IPasswordHasher from "../../application/ports/services/IPasswordHasher";

const SALT_ROUNDS = 10;

export default class BcryptPasswordHasher implements IPasswordHasher {
    public async hash(plainPassword: string): Promise<string> {
        return bcrypt.hash(plainPassword, SALT_ROUNDS);
    }

    public async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
}
