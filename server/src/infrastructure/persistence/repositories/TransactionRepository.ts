import { ClientSession } from "mongodb";

// Application
import ITransactionRepository from "../../../application/ports/repositories/ITransactionRepository";

// Infrastructure
import Database from "../Database";
import ChromaVectorStore from "../../ai/ChromaVectorStore";

export default class TransactionRepository implements ITransactionRepository {
    private session: ClientSession | null = null;

    constructor(
        private readonly database: Database,
        private readonly vectorStore: ChromaVectorStore
    ) {}

    public async begin(): Promise<void> {
        await this.database.getDb(); // ensure client is connected
        const client = this.database.getClient();
        this.session = client.startSession();
        this.session.startTransaction();
        await this.vectorStore.beginTransaction();
    }

    public async commit(): Promise<void> {
        if (this.session) {
            await this.session.commitTransaction();
            this.session.endSession();
            this.session = null;
        }
        await this.vectorStore.commitTransaction();
    }

    public async rollback(): Promise<void> {
        if (this.session) {
            await this.session.abortTransaction();
            this.session.endSession();
            this.session = null;
        }
        await this.vectorStore.rollback();
    }

    public getSession(): ClientSession | null {
        return this.session;
    }
}
