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

export default interface IDriveProvider {
    listFiles(): Promise<DriveFile[]>;
    downloadFile(fileId: string, mimeType: string): Promise<Buffer>;
}
