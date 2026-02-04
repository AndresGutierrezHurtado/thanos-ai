import Source from "../../../domain/entities/source";
import Identifier from "../../../domain/valueObjects/Identifier";

interface ISourceRepository {
    findByChunkId(chunkId: string): Promise<Source | null>;
    findByDocumentId(documentId: string): Promise<Source[]>;
    findByMessageId(messageId: Identifier): Promise<Source[]>;
    create(source: Source): Promise<Source>;
    update(chunkId: string, source: Source): Promise<Source>;
    delete(chunkId: string): Promise<void>;
}

export default ISourceRepository;
