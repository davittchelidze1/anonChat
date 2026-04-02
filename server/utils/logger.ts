/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Structured logging utility
 *
 * Provides consistent logging across the application with different levels
 * and structured output for better debugging and monitoring.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  constructor(private component: string) {}

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const baseLog = `[${timestamp}] [${level}] [${this.component}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      return `${baseLog} ${JSON.stringify(context)}`;
    }

    return baseLog;
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = { ...context };

    if (error instanceof Error) {
      errorContext.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      errorContext.error = error;
    }

    console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
  }

  /**
   * Create a child logger with additional context
   */
  child(subComponent: string): Logger {
    return new Logger(`${this.component}:${subComponent}`);
  }
}

/**
 * Get a logger instance for a component
 */
export function getLogger(component: string): Logger {
  return new Logger(component);
}
