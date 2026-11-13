import { Db, Collection, Filter } from "mongodb";

// Ports
import IDocumentRepository, {
    DocumentListQuery,
    DocumentRecord,
    DocumentSourceStats,
} from "../../../application/ports/repositories/IDocumentRepository";

// Mappers
import DocumentMapper, { DocumentMongoDoc } from "../mappers/DocumentMapper";

// Domain
import Document, { DocumentSourceName } from "../../../domain/entities/document";
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

    async list(query: DocumentListQuery): Promise<{ items: Document[]; total: number }> {
        const conditions: Filter<DocumentMongoDoc>[] = [];
        if (query.source) conditions.push(sourceFilter(query.source));
        if (query.search) {
            const pattern = new RegExp(escapeRegExp(query.search), "i");
            conditions.push({ $or: [{ title: pattern }, { path: pattern }] });
        }
        const filter: Filter<DocumentMongoDoc> = conditions.length ? { $and: conditions } : {};

        const [docs, total] = await Promise.all([
            this.collection
                .find(filter)
                .sort({ path: 1, title: 1 })
                .skip(query.skip)
                .limit(query.limit)
                .toArray(),
            this.collection.countDocuments(filter),
        ]);

        return { items: docs.map((doc) => DocumentMapper.toDomain(doc)), total };
    }

    async getSourceStats(source: DocumentSourceName): Promise<DocumentSourceStats> {
        const filter = sourceFilter(source);
        const [count, latest] = await Promise.all([
            this.collection.countDocuments(filter),
            this.collection.findOne(filter, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } }),
        ]);
        return { count, lastUpdatedAt: latest?.updatedAt ?? null };
    }

    async findDriveIdsBySource(source: DocumentSourceName): Promise<string[]> {
        const docs = await this.collection
            .find(sourceFilter(source), { projection: { driveId: 1 } })
            .toArray();
        return docs.map((doc) => doc.driveId);
    }

    async deleteByDriveId(driveId: string): Promise<void> {
        await this.collection.deleteOne({ driveId });
    }
}

/** Documents saved before `source` existed have no field and all came from Drive. */
function sourceFilter(source: DocumentSourceName): Filter<DocumentMongoDoc> {
    return source === "drive"
        ? { $or: [{ source: "drive" }, { source: { $exists: false } }] }
        : { source };
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
