import ILogger, { SyslogSeverity } from "../ports/services/ILogger";
import IDriveProvider, { DriveFile } from "../ports/services/IDriveProvider";
import IDocumentRepository from "../ports/repositories/IDocumentRepository";
import ProcessorFactory from "../../infrastructure/services/ProcessorFactory";
import IChunker, { ChunkData, ChunkMetadata } from "../ports/services/IChunker";
import IVectorStore from "../ports/services/IVectorStore";
import ITransactionRepository from "../ports/repositories/ITransactionRepository";
import resolveFileType from "../../domain/services/resolveFileType";

export default class ProcessFileService {
    constructor(
        private readonly driveProvider: IDriveProvider,
        private readonly documentRepository: IDocumentRepository,
        private readonly processorFactory: ProcessorFactory,
        private readonly chunker: IChunker,
        private readonly vectorStore: IVectorStore,
        private readonly transactionRepository: ITransactionRepository,
        private readonly logger: ILogger,
    ) {}

    public async execute(file: DriveFile): Promise<Boolean> {
        await this.transactionRepository.begin();

        try {
            // CHECK IF FILE ALREADY EXISTS
            const exists = await this.documentRepository.findByDriveId(file.id);
            const checksum = file.md5Checksum ?? file.modifiedTime;

            if (exists && exists.getChecksum() === (checksum as string)) {
                return false;
            }

            // INFORMATION EXTRACTION FROM FILE
            const buffer = await this.driveProvider.downloadFile(file.id, file.mimeType);
            const processor = this.processorFactory.get(file.mimeType);
            const extracted = await processor.extract(buffer, file.mimeType);
            const nameMetadata = this.extractMetadataFromName(file.name);
            const pathMetadata = this.extractFromPath(file.path as string);
            const contentMetadata = this.extractFromContent(extracted.text);

            const metadata: ChunkMetadata = {
                driveId: file.id,
                name: file.name,
                documentVersion: file.modifiedTime,
                section: "Content",
                sourceType: resolveFileType(file.mimeType),
                path: file.path,
                area: nameMetadata?.area ?? pathMetadata?.area ?? contentMetadata?.area ?? null,
                type: nameMetadata?.tipo ?? pathMetadata?.tipo ?? contentMetadata?.tipo ?? null,
                code: nameMetadata?.codigo ?? null,
            };

            // CHUNKING THE DOCUMENT
            const chunks = this.chunker.createChunks(extracted, metadata);

            if (chunks.length === 0) {
                return false;
            }

            // DELETING EXISTING DOCUMENTS FROM THE VECTOR STORE
            await this.vectorStore.deleteByDriveId("iso-docs", file.id);

            // SAVING THE DOCUMENT TO THE DATABASE
            await this.documentRepository.save({
                driveId: metadata.driveId,
                title: metadata.name,
                mimeType: file.mimeType,
                version: metadata.documentVersion,
                checksum: checksum as string,
                normCode: metadata.code ?? null,
                path: metadata.path,
            });

            // ADDING THE DOCUMENTS TO THE VECTOR STORE
            await this.vectorStore.addDocuments(
                "iso-docs",
                chunks.map((chunk: ChunkData) => ({
                    id: chunk.id,
                    content: chunk.content,
                    metadata: metadata,
                })),
            );

            // COMMITTING THE TRANSACTION
            await this.transactionRepository.commit();

            return true;
        } catch (err: unknown) {
            await this.transactionRepository.rollback();
            this.logger.log(
                SyslogSeverity.ERROR,
                `[InformationUseCase:processFile] Error processing ${file.name} (${file.id}): ${err instanceof Error ? err.message : "Unknown error"}`,
                { error: err as Error },
            );
            return false;
        }
    }

    private extractMetadataFromName(fileName: string) {
        const cleanName = fileName.replace(/\.[^/.]+$/, "");

        const match = cleanName.match(/^([A-Z]{2,3})-([A-Z]{2,})-(\d+)\s+(.*)$/);

        if (!match) {
            return null;
        }

        const [, prefix, area, codeNumber, title] = match;

        const tipoMap: Record<string, string> = {
            PR: "Procedimiento",
            CR: "Cartilla",
            PO: "Política",
            RG: "Reglamento",
            PG: "Programa",
            F: "Formato",
            MT: "Matriz",
            OD: "Descripción y objetivos",
            CRT: "Caracterización del proceso",
            INS: "Instructivo",
            MN: "Manual",
            PL: "Plan",
            FT: "Ficha",
            AN: "Anexo",
            CIR: "Circular",
        };

        return {
            tipo: tipoMap[prefix] ?? "Desconocido",
            area,
            codigo: `${prefix}-${area}-${codeNumber}`,
            nombre: title,
        };
    }

    private extractFromPath(path: string) {
        const parts = path.split("/").filter(Boolean);

        return {
            area: parts[0] ?? null,
            tipo: parts[1] ?? null,
        };
    }

    private extractFromContent(content: string) {
        const firstLines = content.split("\n").slice(0, 20).join("\n");

        const areaMatch = firstLines.match(/Área:\s*(.*)/i);
        const tipoMatch = firstLines.match(/Procedimiento|Política|Reglamento/i);

        return {
            area: areaMatch?.[1] ?? null,
            tipo: tipoMatch?.[0] ?? null,
        };
    }
}
