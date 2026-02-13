import DIContainer from "../../infrastructure/config/DIContainer";
import Database from "../../infrastructure/persistence/Database";

async function main(): Promise<void> {
    try {
        const container = await DIContainer.getInstance();
        const informationUseCase = container.getInformationUseCase();

        // GETTING THE LIMIT FROM THE COMMAND LINE
        const arg = process.argv.find((a) => a.startsWith("--limit="));
        const limit = arg ? parseInt(arg.split("=")[1]) : undefined;

        // STARTING THE DOCUMENTS SYNC
        console.log(`Starting documents ${limit ? `with limit ${limit}` : "without limit"}...`);
        const result = await informationUseCase.syncDocuments(limit);

        console.log(
            `Documents synced successfully. Total processed: ${result.total}. Processed: ${result.processed}. Skipped: ${result.skipped}`,
        );
    } catch (error) {
        console.error("Error while syncing documents:", error);
        throw error;
    } finally {
        try {
            await Database.getInstance().getClient().close();
        } catch {
            // ignore close errors
        }
    }
}

void main();

