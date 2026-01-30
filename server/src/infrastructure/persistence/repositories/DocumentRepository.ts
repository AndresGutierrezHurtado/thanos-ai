import { Db, Collection } from "mongodb";
import IDocumentRepository, {
    DocumentRecord,
} from "../../../application/ports/repositories/IDocumentRepository";
import DocumentMapper, {
    DocumentMongoDoc,
} from "../mappers/DocumentMapper";

export default class DocumentRepository implements IDocumentRepository {
    private readonly collection: Collection<DocumentMongoDoc>;

    constructor(db: Db) {
        this.collection = db.collection<DocumentMongoDoc>("documents");
    }

    async findByDriveId(driveId: string): Promise<DocumentRecord | null> {
        const doc = await this.collection.findOne({ driveId });
        if (!doc) return null;
        return DocumentMapper.toRecord(doc);
    }

    async save(record: DocumentRecord): Promise<void> {
        const doc = DocumentMapper.toPersistence(record);
        await this.collection.updateOne(
            { driveId: record.driveId },
            { $set: doc },
            { upsert: true }
        );
    }
}
