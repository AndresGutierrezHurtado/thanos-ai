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

export interface LoggerContext {
    appName?: string;
    procId?: string;
    msgId?: string;
    structuredData?: Record<string, unknown>;
    error?: Error;
    [key: string]: unknown;
}

export default interface ILogger {
    getLogs(date?: string): Promise<LoggerContext[]>;
    log(level: SyslogSeverity, message: string, context?: LoggerContext): void;
    emergency(message: string, context?: LoggerContext): void;
    alert(message: string, context?: LoggerContext): void;
    critical(message: string, context?: LoggerContext): void;
    error(message: string, context?: LoggerContext): void;
    warning(message: string, context?: LoggerContext): void;
    notice(message: string, context?: LoggerContext): void;
    info(message: string, context?: LoggerContext): void;
    debug(message: string, context?: LoggerContext): void;
}

