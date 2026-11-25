/** A folder in a source. Ids are stable; names may contain "/", so paths cannot be split back. */
export interface DriveFolder {
    id: string;
    name: string;
}

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    md5Checksum?: string;
    size?: number;
    webViewLink?: string;
    path?: string;
    /** Folders from the source root down to the file's own folder (set when listing) */
    folders?: DriveFolder[];
    /** In the source's trash: no longer part of it */
    trashed?: boolean;
}

/** A source of documents to index (Google Drive, uploaded files...). */
export default interface IDriveProvider {
    listFiles(limit?: number): Promise<DriveFile[]>;
    downloadFile(fileId: string, mimeType: string): Promise<Buffer>;
    /** null only when the file does not exist; other failures (network, access) throw. */
    getFileById(fileId: string): Promise<DriveFile | null>;
}

/** A source the app itself can add files to and remove files from. */
export interface IWritableDriveProvider extends IDriveProvider {
    /** Creates or replaces the file at `path` (relative, "/"-separated). */
    saveFile(path: string, content: Buffer): Promise<DriveFile>;
    deleteFile(fileId: string): Promise<void>;
}
