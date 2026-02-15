import Identifier from "../../../domain/valueObjects/Identifier";
import User from "../../../domain/entities/user";

interface IUserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: Identifier): Promise<User | null>;
    create(user: User): Promise<User>;
}

export default IUserRepository;
