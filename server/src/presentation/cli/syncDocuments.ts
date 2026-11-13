import DIContainer from "../../infrastructure/config/DIContainer";
import Database from "../../infrastructure/persistence/Database";
import { DocumentSourceName } from "../../domain/entities/document";

// Usage: npm run sync:documents [-- --source=drive|local] [--limit=N]
async function main(): Promise<void> {
    try {
        const container = await DIContainer.getInstance();
        const informationUseCase = container.getInformationUseCase();

        // GETTING THE OPTIONS FROM THE COMMAND LINE
        const limitArg = process.argv.find((a) => a.startsWith("--limit="));
        const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;

        const configured = informationUseCase.getConfiguredSources();
        const sourceArg = process.argv.find((a) => a.startsWith("--source="))?.split("=")[1];
        if (sourceArg && !configured.includes(sourceArg as DocumentSourceName)) {
            throw new Error(`Unknown or unconfigured source "${sourceArg}". Configured: ${configured.join(", ")}`);
        }
        const sources = sourceArg ? [sourceArg as DocumentSourceName] : configured;

        // SYNCING EACH SOURCE
        for (const source of sources) {
            console.log(`Syncing ${source} ${limit ? `with limit ${limit}` : "without limit"}...`);
            const result = await informationUseCase.syncDocuments(source, limit);

            if (result.error) {
                throw new Error(`Sync of ${source} failed: ${result.error}`);
            }
            console.log(
                `${source} synced. Total: ${result.total}. Processed: ${result.processed}. Unchanged: ${result.unchanged}. Failed: ${result.failed}. Removed: ${result.removed}`,
            );
        }
    } catch (error) {
        console.error("Error while syncing documents:", error);
        process.exitCode = 1;
    } finally {
        try {
            await Database.getInstance().getClient().close();
        } catch {
            // ignore close errors
        }
    }
}

void main();
