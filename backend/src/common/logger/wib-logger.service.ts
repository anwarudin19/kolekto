import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { appendFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { inspect } from 'util';
import { formatWibTimestamp } from '../utils/timezone';

type LogMethod = 'LOG' | 'ERROR' | 'WARN' | 'DEBUG' | 'VERBOSE';

@Injectable()
export class WibLogger implements LoggerService {
    private static initialized = false;
    private readonly logDir = resolve(process.cwd(), process.env.LOG_DIR?.trim() || 'logs');
    private readonly retentionDays = this.parseRetentionDays();

    constructor() {
        this.initializeOnce();
    }

    log(message: unknown, context?: string): void {
        this.printMessage('LOG', message, context);
    }

    error(message: unknown, trace?: string, context?: string): void {
        this.printMessage('ERROR', message, context, trace);
    }

    warn(message: unknown, context?: string): void {
        this.printMessage('WARN', message, context);
    }

    debug(message: unknown, context?: string): void {
        this.printMessage('DEBUG', message, context);
    }

    verbose(message: unknown, context?: string): void {
        this.printMessage('VERBOSE', message, context);
    }

    setLogLevels?(_levels: LogLevel[]): void { }

    private initializeOnce(): void {
        if (WibLogger.initialized) {
            return;
        }

        try {
            mkdirSync(this.logDir, { recursive: true });
            this.cleanupOldLogs();
        } catch {
            // Jangan ganggu boot aplikasi kalau filesystem log tidak tersedia.
        }

        WibLogger.initialized = true;
    }

    private printMessage(
        level: LogMethod,
        message: unknown,
        context?: string,
        trace?: string,
    ): void {
        const pid = process.pid;
        const timestamp = formatWibTimestamp();
        const formattedContext = context ? ` [${context}]` : '';
        const formattedMessage = this.stringifyMessage(message);
        const output = `[Nest] ${pid}  - ${timestamp} ${level.padStart(7)}${formattedContext} ${formattedMessage}`;

        switch (level) {
            case 'ERROR':
                console.error(output);
                if (trace) {
                    console.error(trace);
                }
                break;
            case 'WARN':
                console.warn(output);
                break;
            case 'DEBUG':
            case 'VERBOSE':
                console.debug(output);
                break;
            default:
                console.log(output);
                break;
        }

        this.appendToFile([output, trace].filter(Boolean).join('\n'));
    }

    private stringifyMessage(message: unknown): string {
        if (typeof message === 'string') {
            return message;
        }

        return inspect(message, {
            depth: 5,
            breakLength: Infinity,
            compact: true,
            sorted: true,
        });
    }

    private appendToFile(content: string): void {
        try {
            mkdirSync(this.logDir, { recursive: true });
            appendFileSync(this.getLogFilePath(), `${content}\n`, 'utf8');
        } catch {
            // File logging bersifat best-effort.
        }
    }

    private getLogFilePath(): string {
        return join(this.logDir, `${this.getLogFileDate()}.log`);
    }

    private getLogFileDate(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private parseRetentionDays(): number {
        const parsed = Number(process.env.LOG_RETENTION_DAYS ?? 14);
        return Number.isFinite(parsed) ? Math.max(1, parsed) : 14;
    }

    private cleanupOldLogs(): void {
        const threshold = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
        for (const fileName of readdirSync(this.logDir)) {
            if (!fileName.endsWith('.log')) {
                continue;
            }

            const filePath = join(this.logDir, fileName);
            try {
                const stats = statSync(filePath);
                if (stats.mtimeMs < threshold) {
                    rmSync(filePath, { force: true });
                }
            } catch {
                // Abaikan file yang tidak bisa dibaca/hapus.
            }
        }
    }
}
