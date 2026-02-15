import { Db, Collection } from "mongodb";

import IUserRepository from "../../../application/ports/repositories/IUserRepository";
import User from "../../../domain/entities/user";
import Identifier from "../../../domain/valueObjects/Identifier";
import UserMapper, { UserDocument } from "../mappers/UserMapper";

export default class UserRepository implements IUserRepository {
    private readonly collection: Collection<UserDocument>;

    constructor(db: Db) {
        this.collection = db.collection<UserDocument>("users");
    }

    public async findByEmail(email: string): Promise<User | null> {
        const doc = await this.collection.findOne({ email: email.toLowerCase() });
        return doc ? UserMapper.toDomain(doc) : null;
    }

    public async findById(id: Identifier): Promise<User | null> {
        const doc = await this.collection.findOne({ id: id.getValue() });
        return doc ? UserMapper.toDomain(doc) : null;
    }

    public async create(user: User): Promise<User> {
        if (!user.getId()) {
            user.setId(
                new Identifier(`${Date.now()}-${Math.random().toString(36).substring(2, 15)}`),
            );
        }
        const doc = UserMapper.toPersistence(user);
        await this.collection.insertOne(doc);
        return user;
    }
}
