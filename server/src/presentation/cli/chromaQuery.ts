import DIContainer from "../../infrastructure/config/DIContainer";
import Database from "../../infrastructure/persistence/Database";

async function main(): Promise<void> {
    try {
        const container = await DIContainer.getInstance();
        const informationUseCase = container.getInformationUseCase();

        // GETTING THE QUERY FROM THE COMMAND LINE
        const arg = process.argv.find((a) => a.startsWith("--query="));
        const query = arg ? arg.split("=")[1] : undefined;

        if (!query) {
            console.error('Please provide a query using --query="your text"');
            return;
        }

        console.log(`Executing Chroma query with: "${query}"...`);
        const results = await informationUseCase.listChromaFiles(query);

        console.log(`Found ${results.length} documents:`);
        for (const result of results) {
            console.log(
                `- [${result.getDocument()?.getId()?.getValue()}] ${result.getDocument()?.getTitle()} `,
            );
        }
    } catch (error) {
        console.error("Error while querying Chroma:", error);
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
