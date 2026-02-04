import os from "os";

import ILogger, { LoggerContext, SyslogSeverity } from "../../application/ports/services/ILogger";

export default class LoggerAdapter implements ILogger {
    private readonly hostname: string;
    private readonly defaultAppName: string;

    constructor() {
        this.hostname = os.hostname();
        this.defaultAppName = process.env.APP_NAME ?? "thanos-ai-server";
    }

    public getLogs(): LoggerContext[] {
        const logs: LoggerContext[] = [];

        // READ THE LOGS FROM THE FILE

        return logs;
    }

    public log(level: SyslogSeverity, message: string, context: LoggerContext = {}): void {
        const { appName, procId, msgId, structuredData, error, ...extra } = context;

        const timestamp = new Date().toISOString();

        const logEntry = {
            timestamp,
            hostname: this.hostname,
            appName: appName ?? this.defaultAppName,
            procId: procId ?? String(process.pid),
            msgId: msgId ?? undefined,

            // Severity
            severity: SyslogSeverity[level],
            severityCode: level,

            // Structured data
            structuredData: {
                ...structuredData,
                ...extra,
                ...(error && {
                    error: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                    },
                }),
            },
            message,
        };

        const serialized = JSON.stringify(logEntry);

        if (level <= SyslogSeverity.ERROR) {
            console.error(serialized);
        } else {
            console.log(serialized);
        }
    }

    public emergency(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.EMERGENCY, message, context);
    }

    public alert(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.ALERT, message, context);
    }

    public critical(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.CRITICAL, message, context);
    }

    public error(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.ERROR, message, context);
    }

    public warning(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.WARNING, message, context);
    }

    public notice(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.NOTICE, message, context);
    }

    public info(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.INFO, message, context);
    }

    public debug(message: string, context?: LoggerContext): void {
        this.log(SyslogSeverity.DEBUG, message, context);
    }
}
