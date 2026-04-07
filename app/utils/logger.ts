export type DebugLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'none';
import { Chalk } from 'chalk';

const chalk = new Chalk({ level: 3 });

export interface LogEntry {
  level: Exclude<DebugLevel, 'none'>;
  scope: string | undefined;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

type LoggerFunction = (...messages: unknown[]) => void;

export interface Logger {
  trace: LoggerFunction;
  debug: LoggerFunction;
  info: LoggerFunction;
  warn: LoggerFunction;
  error: LoggerFunction;
  setLevel: (level: DebugLevel) => void;
  child: (childScope: string) => Logger;
}

const isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';

let currentLevel: DebugLevel = import.meta.env.VITE_LOG_LEVEL || 'info';

export const logger: Logger = {
  trace: (...messages: unknown[]) => logWithDebugCapture('trace', undefined, messages),
  debug: (...messages: unknown[]) => logWithDebugCapture('debug', undefined, messages),
  info: (...messages: unknown[]) => logWithDebugCapture('info', undefined, messages),
  warn: (...messages: unknown[]) => logWithDebugCapture('warn', undefined, messages),
  error: (...messages: unknown[]) => logWithDebugCapture('error', undefined, messages),
  setLevel,
  child: (childScope: string) => createScopedLogger(childScope),
};

export function createScopedLogger(scope: string): Logger {
  return {
    trace: (...messages: unknown[]) => logWithDebugCapture('trace', scope, messages),
    debug: (...messages: unknown[]) => logWithDebugCapture('debug', scope, messages),
    info: (...messages: unknown[]) => logWithDebugCapture('info', scope, messages),
    warn: (...messages: unknown[]) => logWithDebugCapture('warn', scope, messages),
    error: (...messages: unknown[]) => logWithDebugCapture('error', scope, messages),
    setLevel,
    child: (childScope: string) => createScopedLogger(`${scope}:${childScope}`),
  };
}

function setLevel(level: DebugLevel) {
  if ((level === 'trace' || level === 'debug') && import.meta.env.PROD) {
    return;
  }

  currentLevel = level;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (Array.isArray(value) || value instanceof Error || value instanceof Date || value instanceof RegExp) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
}

function extractContext(messages: unknown[]): { messageArgs: unknown[]; context: Record<string, unknown> | undefined } {
  if (messages.length < 2) {
    return { messageArgs: messages, context: undefined };
  }

  const lastArg = messages[messages.length - 1];

  if (isPlainObject(lastArg)) {
    return { messageArgs: messages.slice(0, -1), context: lastArg };
  }

  return { messageArgs: messages, context: undefined };
}

function stringifyMessageArgs(args: unknown[]): string {
  return args.reduce((acc: string, current: unknown) => {
    let part: string;

    if (current instanceof Error) {
      part = current.stack ?? current.message;
    } else if (typeof current === 'object' && current !== null) {
      try {
        part = JSON.stringify(current);
      } catch {
        part = '[Circular]';
      }
    } else {
      part = String(current);
    }

    if (acc.endsWith('\n')) {
      return acc + part;
    }

    if (!acc) {
      return part;
    }

    return `${acc} ${part}`;
  }, '');
}

function buildLogEntry(level: DebugLevel, scope: string | undefined, messages: unknown[]): LogEntry {
  const { messageArgs, context } = extractContext(messages);

  const entry: LogEntry = {
    level: level as Exclude<DebugLevel, 'none'>,
    scope,
    message: stringifyMessageArgs(messageArgs),
    timestamp: new Date().toISOString(),
  };

  if (context !== undefined) {
    entry.context = context;
  }

  return entry;
}

function log(level: DebugLevel, scope: string | undefined, messages: unknown[]) {
  const levelOrder: DebugLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'none'];

  if (levelOrder.indexOf(level) < levelOrder.indexOf(currentLevel)) {
    return;
  }

  // If current level is 'none', don't log anything
  if (currentLevel === 'none') {
    return;
  }

  // Production: JSON-formatted one-line output (server-side only)
  if (isProduction && typeof window === 'undefined') {
    const entry = buildLogEntry(level, scope, messages);
    const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleFn(JSON.stringify(entry));

    return;
  }

  // Development: preserve existing colorized output
  const allMessages = messages.reduce((acc: string, current: unknown) => {
    const part = String(current);

    if (acc.endsWith('\n')) {
      return acc + part;
    }

    if (!acc) {
      return part;
    }

    return `${acc} ${part}`;
  }, '');

  const labelBackgroundColor = getColorForLevel(level);
  const labelTextColor = level === 'warn' ? '#000000' : '#FFFFFF';

  const labelStyles = getLabelStyles(labelBackgroundColor, labelTextColor);
  const scopeStyles = getLabelStyles('#77828D', 'white');

  const styles = [labelStyles];

  if (typeof scope === 'string') {
    styles.push('', scopeStyles);
  }

  let labelText = formatText(` ${level.toUpperCase()} `, labelTextColor, labelBackgroundColor);

  if (scope) {
    labelText = `${labelText} ${formatText(` ${scope} `, '#FFFFFF', '77828D')}`;
  }

  if (typeof window !== 'undefined') {
    console.log(`%c${level.toUpperCase()}${scope ? `%c %c${scope}` : ''}`, ...styles, allMessages);
  } else {
    console.log(`${labelText}`, allMessages);
  }
}

function formatText(text: string, color: string, bg: string) {
  return chalk.bgHex(bg)(chalk.hex(color)(text));
}

function getLabelStyles(color: string, textColor: string) {
  return `background-color: ${color}; color: white; border: 4px solid ${color}; color: ${textColor};`;
}

function getColorForLevel(level: DebugLevel): string {
  switch (level) {
    case 'trace':
    case 'debug': {
      return '#77828D';
    }
    case 'info': {
      return '#1389FD';
    }
    case 'warn': {
      return '#FFDB6C';
    }
    case 'error': {
      return '#EE4744';
    }
    default: {
      return '#000000';
    }
  }
}

export const renderLogger = createScopedLogger('Render');

// Debug logging integration
let debugLogger: { captureLog(level: DebugLevel, scope: string | undefined, messages: unknown[]): void } | null = null;

// Lazy load debug logger to avoid circular dependencies
const getDebugLogger = () => {
  if (!debugLogger && typeof window !== 'undefined') {
    try {
      // Use dynamic import asynchronously but don't block the function
      import('./debugLogger')
        .then(({ debugLogger: loggerInstance }) => {
          debugLogger = loggerInstance;
        })
        .catch(() => {
          // Debug logger not available, skip integration
        });
    } catch {
      // Debug logger not available, skip integration
    }
  }

  return debugLogger;
};

// Override the log function to also capture to debug logger

function logWithDebugCapture(level: DebugLevel, scope: string | undefined, messages: unknown[]) {
  // Call original log function (the one that does the actual console logging)
  log(level, scope, messages);

  // Also capture to debug logger if available
  const debug = getDebugLogger();

  if (debug) {
    debug.captureLog(level, scope, messages);
  }
}
