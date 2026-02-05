import { Db, Collection } from "mongodb";
import path from "path";
import fs from "fs";

import IMediaContentRepository from "../../../application/ports/repositories/IMediaContentRepository";
import MediaContent from "../../../domain/entities/mediaContent";
import Identifier from "../../../domain/valueObjects/Identifier";
import MediaContentMapper, { MediaContentDocument } from "../mappers/MediaContentMapper";

export default class MediaContentRepository implements IMediaContentRepository {
    private readonly collection: Collection<MediaContentDocument>;

    constructor(db: Db) {
        this.collection = db.collection<MediaContentDocument>("media_content");
    }

    public async findById(id: Identifier): Promise<MediaContent | null> {
        const doc = await this.collection.findOne({ id: id.getValue() });
        return doc ? MediaContentMapper.toDomain(doc) : null;
    }

    public async findByMessageId(messageId: Identifier): Promise<MediaContent | null> {
        const doc = await this.collection.findOne({ messageId: messageId.getValue() });
        return doc ? MediaContentMapper.toDomain(doc) : null;
    }

    public async create(mediaContent: MediaContent, buffer: Buffer): Promise<MediaContent> {
        // save the media content in the public folder
        const filePath = path.join(
            process.cwd(),
            "public",
            "media",
            mediaContent.getMessageId().getValue(),
            mediaContent.getFilename()
        );
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, buffer);

        const relativePath = path.relative(path.join(process.cwd(), "public"), filePath);
        mediaContent.setUrl("/" + relativePath.replaceAll("\\", "/").replaceAll("//", "/"));

        // save the media content in the database
        if (!mediaContent.getId()) {
            const newId = new Identifier(
                `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
            );
            mediaContent.setId(newId);
        }
        const doc = MediaContentMapper.toPersistence(mediaContent);

        await this.collection.insertOne(doc);
        return mediaContent;
    }
}
