// Domain
import MediaContent from "../../../domain/entities/mediaContent";
import MediaContentType from "../../../domain/valueObjects/MediaContentType";

export interface MediaContentResource {
    id: string | null;
    messageId: string;
    type: MediaContentType;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
}

export function toMediaContentResource(mediaContent: MediaContent): MediaContentResource {
    return {
        id: mediaContent.getId()?.getValue() ?? null,
        messageId: mediaContent.getMessageId().getValue(),
        type: mediaContent.getType(),
        url: process.env.API_URL + mediaContent.getUrl(),
        filename: mediaContent.getFilename(),
        mimeType: mediaContent.getMimeType(),
        size: mediaContent.getSize(),
    };
}

export function toMediaContentResourceArray(mediaContents: MediaContent[]): MediaContentResource[] {
    return mediaContents.map((mediaContent) => toMediaContentResource(mediaContent));
}
