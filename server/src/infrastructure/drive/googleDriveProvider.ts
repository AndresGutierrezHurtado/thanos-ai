import { google, drive_v3 } from "googleapis";

// Ports
import ILogger, { SyslogSeverity } from "../../application/ports/services/ILogger";
import IDriveProvider, { type DriveFile, type DriveFolder } from "../../application/ports/services/IDriveProvider";

export default class GoogleDriveProvider implements IDriveProvider {
    private drive: drive_v3.Drive;
    private logSize = 100;
    private lastLogTime = Date.now();

    constructor(private readonly logger: ILogger) {
        if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
            throw new Error("GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are required");
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                // Old docker-compose (env_file) keeps surrounding quotes literally: strip them
                private_key: process.env.GOOGLE_PRIVATE_KEY
                    .replace(/^(["'])([\s\S]*)\1$/, "$2")
                    .replace(/\\n/g, "\n"),
            },
            scopes: ["https://www.googleapis.com/auth/drive.readonly"],
        });

        this.drive = google.drive({
            version: "v3",
            auth: auth,
        });
    }

    // Listar archivos de una carpeta
    async listFiles(
        limit?: number,
        folderId: string | null = null,
        files: DriveFile[] = [],
        currentPath: string = "",
        parents: DriveFolder[] = [],
    ): Promise<DriveFile[]> {
        if (limit && files.length >= limit) return files;

        // Every page must be read: a sync removes from the index whatever is not listed
        let pageToken: string | undefined;
        do {
            const response = await this.drive.files.list({
                q: `'${
                    folderId ?? process.env.GOOGLE_DRIVE_FOLDER_ID
                }' in parents and trashed=false and not mimeType contains 'image/'`,
                fields: "nextPageToken, files(id, name, mimeType, modifiedTime, md5Checksum, size, webViewLink)",
                pageSize: 1000,
                pageToken,
            });
            pageToken = response.data.nextPageToken ?? undefined;

            // Extract files in the subfolders
            for (const file of response.data.files || []) {
                // Office lock and temp files (~$doc.docx, ~WRL0003.tmp) are not documents
                if (file.name?.startsWith("~")) continue;

                if (file.mimeType === "application/vnd.google-apps.folder") {
                    await this.listFiles(limit, file.id, files, currentPath + file.name + "/", [
                        ...parents,
                        { id: file.id as string, name: file.name as string },
                    ]);
                } else {
                    const driveFile: DriveFile = {
                        ...(file as DriveFile),
                        path: currentPath + file.name,
                        folders: parents,
                    };

                    files.push(driveFile);
                    if (files.length % this.logSize === 0 || files.length === 1) {
                        const now = Date.now();
                        const seconds = Number(((now - this.lastLogTime) / 1000).toFixed(3));

                        this.logger.log(
                            SyslogSeverity.DEBUG,
                            `pulled ${files.length} files from drive in ${seconds}s`,
                        );

                        this.lastLogTime = now;
                    }
                }

                if (limit && files.length >= limit) return files;
            }
        } while (pageToken);

        return files;
    }

    // Descargar archivo
    async downloadFile(fileId: string, mimeType: string, signal?: AbortSignal): Promise<Buffer> {
        const googleNativeTypes = {
            "application/vnd.google-apps.document": "application/pdf",
            "application/vnd.google-apps.spreadsheet": "application/pdf",
            "application/vnd.google-apps.presentation": "application/pdf",
        };

        if (googleNativeTypes[mimeType as keyof typeof googleNativeTypes]) {
            const response = await this.drive.files.export(
                {
                    fileId,
                    mimeType: googleNativeTypes[mimeType as keyof typeof googleNativeTypes],
                },
                {
                    responseType: "arraybuffer",
                    signal,
                },
            );
            return Buffer.from(response.data as ArrayBuffer);
        }

        const response = await this.drive.files.get(
            { fileId, alt: "media" },
            { responseType: "arraybuffer", signal },
        );

        return Buffer.from(response.data as ArrayBuffer);
    }

    async getFileById(fileId: string): Promise<DriveFile | null> {
        try {
            const response = await this.drive.files.get({
                fileId,
                fields: "id, name, mimeType, modifiedTime, md5Checksum, size, webViewLink, trashed",
            });

            return (response.data as DriveFile) ?? null;
        } catch (error) {
            // Only a missing file is "not found": callers drop missing files from the index,
            // so a network or permission failure must not look like one
            const status = (error as { response?: { status?: number } }).response?.status;
            if (status === 404) return null;

            this.logger.log(
                SyslogSeverity.ERROR,
                `Error getting file ${fileId}: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }
}
