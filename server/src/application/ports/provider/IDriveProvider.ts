import { DriveFile } from "../../../infrastructure/drive/googleDriveProvider";

interface IDriveProvider {
    listFiles(): Promise<DriveFile[]>;
    downloadFile(fileId: string): Promise<Buffer>;
}

export default IDriveProvider;
