import MediaContent from "../../../domain/entities/mediaContent";
import Identifier from "../../../domain/valueObjects/Identifier";

interface IMediaContentRepository {
    findById(id: Identifier): Promise<MediaContent | null>;
    findByMessageId(messageId: Identifier): Promise<MediaContent | null>;
    create(mediaContent: MediaContent, buffer: Buffer): Promise<MediaContent>;
}

export default IMediaContentRepository;
