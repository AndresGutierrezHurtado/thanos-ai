export enum SyslogSeverity {
    EMERGENCY = 0,
    ALERT = 1,
    CRITICAL = 2,
    ERROR = 3,
    WARNING = 4,
    NOTICE = 5,
    INFO = 6,
    DEBUG = 7,
}

export interface LoggerEntry {
    timestamp: string;
    hostname: string;
    appName: string;
    procId: string;
    msgId: string;
    severity: string;
    severityCode: number;
    message: string;
    context?: Record<string, unknown>;
}

export default interface ILogger {
    getLogs(date?: string): Promise<LoggerEntry[]>;
    log(level: SyslogSeverity, message: string, context?: Record<string, unknown>): void;
}
