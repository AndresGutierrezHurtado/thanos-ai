import { Db, Collection } from "mongodb";

// Application
import ISourceRepository from "../../../application/ports/repositories/ISourceRepository";

// Domain
import Source from "../../../domain/entities/source";
import Identifier from "../../../domain/valueObjects/Identifier";

// Mappers
import SourceMapper, { SourceDocument } from "../mappers/SourceMapper";

export default class SourceRepository implements ISourceRepository {
    private readonly collection: Collection<SourceDocument>;

    constructor(db: Db) {
        this.collection = db.collection<SourceDocument>("sources");
    }

    public async findByChunkId(chunkId: string): Promise<Source | null> {
        const doc = await this.collection.findOne({ chunkId });
        return doc ? SourceMapper.toDomain(doc) : null;
    }

    public async findByDocumentId(documentId: string): Promise<Source[]> {
        const sources = await this.collection.find({ documentId }).toArray();
        return sources.map((source) => SourceMapper.toDomain(source));
    }

    public async findByMessageId(messageId: Identifier): Promise<Source[]> {
        const sources = await this.collection.find({ messageId: messageId.getValue() }).toArray();
        return sources.map((source) => SourceMapper.toDomain(source));
    }

    public async create(source: Source): Promise<Source> {
        const doc = SourceMapper.toPersistence(source);
        await this.collection.insertOne(doc);
        return source;
    }

    public async update(chunkId: string, source: Source): Promise<Source> {
        const doc = SourceMapper.toPersistence(source);
        await this.collection.updateOne({ chunkId }, { $set: doc });
        return source;
    }

    public async delete(chunkId: string): Promise<void> {
        await this.collection.deleteOne({ chunkId });
    }
}
