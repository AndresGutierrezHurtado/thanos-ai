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
    async listFiles(): Promise<DriveFile[]> {
        const response = await this.drive.files.list({
            q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
            fields: "files(id, name, mimeType, modifiedTime, md5Checksum, size, webViewLink)",
            pageSize: 1000,
        });

        const files = response.data.files || [];

        return files as DriveFile[];
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
