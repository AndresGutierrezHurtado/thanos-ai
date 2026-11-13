export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    md5Checksum?: string;
    size?: number;
    webViewLink?: string;
    path?: string;
}

/** A source of documents to index (Google Drive, uploaded files...). */
export default interface IDriveProvider {
    listFiles(limit?: number): Promise<DriveFile[]>;
    downloadFile(fileId: string, mimeType: string): Promise<Buffer>;
    getFileById(fileId: string): Promise<DriveFile | null>;
}

/** A source the app itself can add files to and remove files from. */
export interface IWritableDriveProvider extends IDriveProvider {
    /** Creates or replaces the file at `path` (relative, "/"-separated). */
    saveFile(path: string, content: Buffer): Promise<DriveFile>;
    deleteFile(fileId: string): Promise<void>;
}
