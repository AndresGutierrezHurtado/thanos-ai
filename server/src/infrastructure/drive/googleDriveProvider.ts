import { google, drive_v3 } from "googleapis";

// Application
import IDriveProvider, { type DriveFile } from "../../application/ports/provider/IDriveProvider";

export default class GoogleDriveProvider implements IDriveProvider {
    private drive: drive_v3.Drive;

    constructor() {
        if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
            throw new Error("GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY are required");
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            },
            scopes: ["https://www.googleapis.com/auth/drive.readonly"],
        });

        this.drive = google.drive({
            version: "v3",
            auth: auth,
        });
    }

    // Listar archivos de una carpeta
    async listFiles(folderId: string | null = null, files: DriveFile[] = []): Promise<DriveFile[]> {
        // Get folders
        const response = await this.drive.files.list({
            q: `'${
                folderId ?? process.env.GOOGLE_DRIVE_FOLDER_ID
            }' in parents and trashed=false and mimeType != 'image/*'`,
            fields: "files(id, name, mimeType, modifiedTime, md5Checksum, size, webViewLink)",
            pageSize: 1000,
        });

        // Extract files in the subfolders
        for (const file of response.data.files || []) {
            if (file.mimeType === "application/vnd.google-apps.folder") {
                await this.listFiles(file.id, files);
            } else {
                files.push(file as DriveFile);
                if (files.length % 10 === 0) {
                    console.log(`pulled ${files.length} files from drive`);
                }
            }
        }

        return files;
    }

    // Descargar archivo
    async downloadFile(fileId: string, mimeType: string): Promise<Buffer> {
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
                }
            );
            return Buffer.from(response.data as ArrayBuffer);
        }

        const response = await this.drive.files.get(
            { fileId, alt: "media" },
            { responseType: "arraybuffer" }
        );

        return Buffer.from(response.data as ArrayBuffer);
    }
}
