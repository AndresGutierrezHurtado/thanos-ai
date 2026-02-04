import { Db, MongoClient } from "mongodb";

export default class Database {
    private static instance: Database;
    private client: MongoClient;
    private db: Db | null = null;

    private constructor() {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not set");
        }

        this.client = new MongoClient(process.env.MONGODB_URI);
    }

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public async getDb(): Promise<Db> {
        if (!this.db) {
            await this.client.connect();
            this.db = this.client.db("ai-db");
        }
        return this.db;
    }
}
