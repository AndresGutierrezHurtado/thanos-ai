import os from "os";
import path from "path";
import { promises as fs } from "fs";

import ILogger, { LoggerEntry, SyslogSeverity } from "../../application/ports/services/ILogger";

const DEFAULT_APP_NAME = "thanos-ai-server";
const LOGS_DIR = "logs";

function today(): string {
    return new Date().toISOString().split("T")[0];
}

export default class LoggerAdapter implements ILogger {
    private readonly hostname = os.hostname();
    private readonly appName = process.env.APP_NAME ?? DEFAULT_APP_NAME;
    private readonly logsDir = path.join(process.cwd(), LOGS_DIR);

    constructor() {
        fs.mkdir(this.logsDir, { recursive: true }).catch(() => {});
    }

    private logFilePath(date?: string): string {
        return path.join(this.logsDir, `app-${date ?? today()}.jsonl`);
    }

    private writeToStd(level: SyslogSeverity, entry: LoggerEntry): void {
        if (level <= SyslogSeverity.ERROR) {
            console.error(JSON.stringify(entry));
        } else {
            console.log(`[${entry.timestamp}] [${entry.severity}] ${entry.message}`);
        }
    }

    public async getLogs(date?: string): Promise<LoggerEntry[]> {
        try {
            const content = await fs.readFile(this.logFilePath(date), "utf-8");
            return content
                .trim()
                .split("\n")
                .filter((l) => l.length > 0)
                .map((l) => JSON.parse(l) as LoggerEntry)
                .sort(
                    (a, b) =>
                        new Date(b?.timestamp as string).getTime() -
                        new Date(a?.timestamp as string).getTime()
                )
                .filter((p): p is LoggerEntry => p !== null);
        } catch {
            return [];
        }
    }

    public log(
        level: SyslogSeverity,
        message: string,
        context: Record<string, unknown> = {}
    ): void {
        const entry: LoggerEntry = {
            timestamp: new Date().toISOString(),
            hostname: this.hostname,
            appName: this.appName,
            procId: String(process.pid),
            msgId: Math.random().toString(36).substring(2, 15),
            severity: SyslogSeverity[level],
            severityCode: level,
            message,
            context,
        };
        const line = JSON.stringify(entry);

        // Write to stdout and file
        this.writeToStd(level, entry);
        fs.appendFile(this.logFilePath(), line + "\n", "utf-8").catch(() => {});
    }
}
