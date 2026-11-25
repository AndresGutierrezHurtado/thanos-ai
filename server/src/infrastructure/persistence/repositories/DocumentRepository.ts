import { Db, Collection, Filter } from "mongodb";

// Ports
import IDocumentRepository, {
    DocumentFindQuery,
    DocumentListQuery,
    FolderListing,
    FolderSummary,
    DocumentRecord,
    DocumentSourceStats,
} from "../../../application/ports/repositories/IDocumentRepository";

// Mappers
import DocumentMapper, { DocumentMongoDoc, FolderMongoDoc } from "../mappers/DocumentMapper";

// Domain
import Document, { DocumentSourceName } from "../../../domain/entities/document";
import Identifier from "../../../domain/valueObjects/Identifier";
import normalizeText from "../../../domain/services/normalizeText";

// Indexes are created once per process (repositories are built per request)
let indexesRequested = false;

export default class DocumentRepository implements IDocumentRepository {
    private readonly collection: Collection<DocumentMongoDoc>;

    constructor(db: Db) {
        this.collection = db.collection<DocumentMongoDoc>("documents");

        if (!indexesRequested) {
            indexesRequested = true;
            void Promise.all([
                this.collection.createIndex({ driveId: 1 }),
                this.collection.createIndex({ folderIds: 1 }),
            ]).catch(() => {
                // Only a speed-up: queries work without them
                indexesRequested = false;
            });
        }
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

    async findByDriveIds(driveIds: string[]): Promise<Document[]> {
        if (driveIds.length === 0) return [];
        const docs = await this.collection.find({ driveId: { $in: driveIds } }).toArray();
        return docs.map((doc) => DocumentMapper.toDomain(doc));
    }

    async find(query: DocumentFindQuery): Promise<{ items: Document[]; total: number }> {
        const conditions: Filter<DocumentMongoDoc>[] = [];
        if (query.folderId) conditions.push({ folderIds: query.folderId });
        conditions.push(...wordConditions(query.text));
        const filter: Filter<DocumentMongoDoc> = conditions.length ? { $and: conditions } : {};

        const [docs, total] = await Promise.all([
            this.collection.find(filter).sort({ path: 1, title: 1 }).limit(query.limit).toArray(),
            this.collection.countDocuments(filter),
        ]);
        return { items: docs.map((doc) => DocumentMapper.toDomain(doc)), total };
    }

    async findFolders(query: { text?: string; ids?: string[]; limit: number }): Promise<FolderSummary[]> {
        const match: Record<string, unknown>[] = words(query.text).map((word) => ({
            "folder.search": new RegExp(escapeRegExp(word)),
        }));
        if (query.ids) match.push({ "folder.id": { $in: query.ids } });

        const rows = await this.collection
            .aggregate<FolderRow>([
                { $match: { "folders.0": { $exists: true } } },
                { $set: { chain: "$folders" } },
                { $unwind: { path: "$folders", includeArrayIndex: "depth" } },
                { $set: { folder: "$folders" } },
                ...(match.length ? [{ $match: { $and: match } }] : []),
                {
                    $group: {
                        _id: "$folder.id",
                        name: { $first: "$folder.name" },
                        chain: { $first: { $slice: ["$chain", { $add: ["$depth", 1] }] } },
                        documents: { $sum: 1 },
                        depth: { $first: "$depth" },
                    },
                },
                // Shallower (broader) folders first, then by name
                { $sort: { depth: 1, name: 1 } },
                { $limit: query.limit },
            ])
            .toArray();

        return rows.map(toFolderSummary);
    }

    async listFolder(folderId: string | null, limit: number): Promise<FolderListing> {
        let folder: FolderSummary | null = null;
        if (folderId) {
            [folder = null] = await this.findFolders({ ids: [folderId], limit: 1 });
            if (!folder) return { folder: null, folders: [], documents: [], totalDocuments: 0 };
        }

        // Subfolders: the folder right after this one in each document's chain
        const position = folderId ? { $add: [{ $indexOfArray: ["$folderIds", folderId] }, 1] } : 0;
        const rows = await this.collection
            .aggregate<FolderRow>([
                { $match: folderId ? { folderIds: folderId } : { "folders.0": { $exists: true } } },
                { $set: { position } },
                { $set: { child: { $arrayElemAt: ["$folders", "$position"] } } },
                { $match: { child: { $exists: true } } },
                {
                    $group: {
                        _id: "$child.id",
                        name: { $first: "$child.name" },
                        chain: { $first: { $slice: ["$folders", { $add: ["$position", 1] }] } },
                        documents: { $sum: 1 },
                    },
                },
                { $sort: { name: 1 } },
            ])
            .toArray();

        // Documents directly in it: their last folder is this one (or none, at the root)
        const direct: Filter<DocumentMongoDoc> = folderId
            ? { $expr: { $eq: [{ $arrayElemAt: ["$folderIds", -1] }, folderId] } }
            : { $or: [{ folderIds: { $size: 0 } }, { folderIds: { $exists: false } }] };
        const [docs, totalDocuments] = await Promise.all([
            this.collection.find(direct).sort({ title: 1 }).limit(limit).toArray(),
            this.collection.countDocuments(direct),
        ]);

        return {
            folder,
            folders: rows.map(toFolderSummary),
            documents: docs.map((doc) => DocumentMapper.toDomain(doc)),
            totalDocuments,
        };
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
        conditions.push(...wordConditions(query.search));
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

interface FolderRow {
    _id: string;
    name: string;
    chain: FolderMongoDoc[];
    documents: number;
}

function toFolderSummary(row: FolderRow): FolderSummary {
    return {
        id: row._id,
        name: row.name,
        location: row.chain.map((folder) => folder.name).join(" > "),
        documents: row.documents,
    };
}

/** Every word must match; documents indexed before searchText existed match on title or path */
function wordConditions(text: string | undefined): Filter<DocumentMongoDoc>[] {
    return words(text).map((word) => {
        const pattern = new RegExp(escapeRegExp(word), "i");
        return { $or: [{ searchText: pattern }, { title: pattern }, { path: pattern }] };
    });
}

/** Normalized words of a search, at most 8 */
function words(text: string | undefined): string[] {
    return normalizeText(text ?? "").split(" ").filter(Boolean).slice(0, 8);
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
