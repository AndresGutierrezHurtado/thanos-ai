import MediaContent from "../../../domain/entities/mediaContent";
import Identifier from "../../../domain/valueObjects/Identifier";
import MediaContentType from "../../../domain/valueObjects/MediaContentType";

export interface MediaContentDocument {
    id: string;
    messageId: string;
    type: MediaContentType;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
}

export default class MediaContentMapper {
    public static toDomain(doc: MediaContentDocument): MediaContent {
        return new MediaContent(
            new Identifier(doc.id),
            new Identifier(doc.messageId),
            doc.type,
            doc.url,
            doc.filename,
            doc.mimeType,
            doc.size
        );
    }

    public static toPersistence(entity: MediaContent): MediaContentDocument {
        const id = entity.getId();
        if (!id) throw new Error("MediaContent id is required to persist");

        return {
            id: id.getValue(),
            messageId: entity.getMessageId().getValue(),
            type: entity.getType(),
            url: entity.getUrl(),
            filename: entity.getFilename(),
            mimeType: entity.getMimeType(),
            size: entity.getSize(),
        };
    }
}
