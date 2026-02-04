import os from "os";
import path from "path";
import { promises as fs } from "fs";

import ILogger, {
    LoggerContext,
    SyslogSeverity,
} from "../../application/ports/services/ILogger";

const DEFAULT_APP_NAME = "thanos-ai-server";
const LOGS_DIR = "logs";

function today(): string {
    return new Date().toISOString().split("T")[0];
}

function parseJsonLine(line: string): LoggerContext | null {
    try {
        return JSON.parse(line) as LoggerContext;
    } catch {
        return null;
    }
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

    private buildStructuredData(context: LoggerContext): Record<string, unknown> {
        const { structuredData, error, ...rest } = context;
        return {
            ...structuredData,
            ...rest,
            ...(error && {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
            }),
        };
    }

    private buildEntry(
        level: SyslogSeverity,
        message: string,
        context: LoggerContext
    ): string {
        const entry = {
            timestamp: new Date().toISOString(),
            hostname: this.hostname,
            appName: context.appName ?? this.appName,
            procId: context.procId ?? String(process.pid),
            msgId: context.msgId,
            severity: SyslogSeverity[level],
            severityCode: level,
            structuredData: this.buildStructuredData(context),
            message,
        };
        return JSON.stringify(entry);
    }

    private writeToStd(level: SyslogSeverity, line: string): void {
        if (level <= SyslogSeverity.ERROR) {
            console.error(line);
        } else {
            console.log(line);
        }
    }

    private appendToFile(line: string): void {
        fs.appendFile(this.logFilePath(), line + "\n", "utf-8").catch(() => {});
    }

    public async getLogs(date?: string): Promise<LoggerContext[]> {
        try {
            const content = await fs.readFile(this.logFilePath(date), "utf-8");
            return content
                .trim()
                .split("\n")
                .filter((l) => l.length > 0)
                .map(parseJsonLine)
                .filter((p): p is LoggerContext => p !== null);
        } catch {
            return [];
        }
    }

    public log(
        level: SyslogSeverity,
        message: string,
        context: LoggerContext = {}
    ): void {
        const line = this.buildEntry(level, message, context);
        this.writeToStd(level, line);
        this.appendToFile(line);
    }

    public emergency(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.EMERGENCY, message, context ?? {});
    }
    public alert(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.ALERT, message, context ?? {});
    }
    public critical(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.CRITICAL, message, context ?? {});
    }
    public error(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.ERROR, message, context ?? {});
    }
    public warning(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.WARNING, message, context ?? {});
    }
    public notice(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.NOTICE, message, context ?? {});
    }
    public info(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.INFO, message, context ?? {});
    }
    public debug(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.DEBUG, message, context ?? {});
    }
}
