import { Db, Collection } from "mongodb";

// Ports
import IDocumentRepository, {
    DocumentRecord,
} from "../../../application/ports/repositories/IDocumentRepository";

// Mappers
import DocumentMapper, { DocumentMongoDoc } from "../mappers/DocumentMapper";

// Domain
import Document from "../../../domain/entities/document";
import Identifier from "../../../domain/valueObjects/Identifier";

export default class DocumentRepository implements IDocumentRepository {
    private readonly collection: Collection<DocumentMongoDoc>;

    constructor(db: Db) {
        this.collection = db.collection<DocumentMongoDoc>("documents");
    }

    async findByDriveId(driveId: string): Promise<Document | null> {
        const doc = await this.collection.findOne({ driveId });
        if (!doc) return null;
        return DocumentMapper.toDomain(doc);
    }

    async findById(id: Identifier): Promise<Document | null> {
        const doc = await this.collection.findOne({ _id: id.getValue() });
        if (!doc) return null;
        return DocumentMapper.toDomain(doc);
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
