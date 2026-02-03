import { google, drive_v3 } from "googleapis";

// Application
import IDriveProvider, { type DriveFile } from "../../application/ports/provider/IDriveProvider";

export default class GoogleDriveProvider implements IDriveProvider {
    private drive: drive_v3.Drive;

    constructor() {
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
    async listFiles(folderId: string | null = null): Promise<DriveFile[]> {
        // Get folders
        const response = await this.drive.files.list({
            q: `'${folderId ?? process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
            fields: "files(id, name, mimeType, modifiedTime, md5Checksum, size, webViewLink)",
            pageSize: 1000,
        });

        const files: DriveFile[] = [];

        // Extract files in the subfolders
        for (const file of response.data.files || []) {
            if (file.mimeType === "application/vnd.google-apps.folder") {
                const subFiles = await this.listFiles(file.id);
                files.push(...subFiles);
                continue;
            } else {
                console.log(file.name + " - " + file.mimeType);
                files.push(file as DriveFile);
            }
        }

        return files;
    }

    // Descargar archivo
    async downloadFile(fileId: string): Promise<Buffer> {
        const response = await this.drive.files.get(
            { fileId, alt: "media" },
            { responseType: "arraybuffer" }
        );

        return Buffer.from(response.data as ArrayBuffer);
    }
}
