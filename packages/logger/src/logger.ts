import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';


const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
let currentLevel: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Validate initial log level
if (!LEVELS.includes(currentLevel)) {
  console.warn(`Invalid LOG_LEVEL: ${currentLevel}. Defaulting to 'info'.`);
  currentLevel = 'info';
}

export class Logger {
  private name: string;
  private dateFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  constructor(name = 'byte-of-me') {
    this.name = name;
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, any>): void {
    this.log('error', message, meta);
  }

  setLogLevel(level: LogLevel): void {
    if (!LEVELS.includes(level)) {
      this._log('warn', `Invalid log level: ${level}. Available levels: ${LEVELS.join(', ')}`);
      return;
    }
    currentLevel = level;
    this._log('info', `Log level set to ${level}`);
  }

  getLogLevel(): LogLevel {
    return currentLevel;
  }

  private _shouldLog(level: LogLevel): boolean {
    return LEVELS.indexOf(level) >= LEVELS.indexOf(currentLevel);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    this._log(level, message, { namespace: this.name, ...meta });
  }


  private _log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    if (!this._shouldLog(level)) return;

    const logObject = {
      timestamp: this.dateFormatter.format(new Date()),
      level,
      message,
      ...meta,
    };

    const logStr = JSON.stringify(logObject, null, 2);

    switch (level) {
      case 'debug':
        console.log(chalk.gray(logStr));
        break;
      case 'info':
        console.log(chalk.green(logStr));
        break;
      case 'warn':
        console.warn(chalk.yellow(logStr));
        break;
      case 'error':
        console.error(chalk.red(logStr));
        break;
    }
  }
}

const _cache = new Map<string, Logger>();

export const logger = (namespace: string = 'byte-of-me'): Logger => {
  if (!_cache.has(namespace)) {
    _cache.set(namespace, new Logger(namespace));
  }
  return _cache.get(namespace) || new Logger(namespace);
}
