/**
 * Lightweight structured logger shared by both apps.
 * Uses pino when available; falls back to console with JSON output.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

// Optional pino integration — only if the consuming app installed it.
function tryPino() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pino = require("pino");
    return pino({ level: process.env.LOG_LEVEL ?? "info" });
  } catch {
    return null;
  }
}

let pinoLogger: ReturnType<typeof tryPino> = null;

export function getLogger(level: LogLevel = "info") {
  if (!pinoLogger) pinoLogger = tryPino();
  return {
    debug(message: string, context?: Record<string, unknown>) {
      write("debug", message, context, level);
    },
    info(message: string, context?: Record<string, unknown>) {
      write("info", message, context, level);
    },
    warn(message: string, context?: Record<string, unknown>) {
      write("warn", message, context, level);
    },
    error(message: string, context?: Record<string, unknown>) {
      write("error", message, context, level);
    },
  };
}

function write(level: LogLevel, message: string, context: Record<string, unknown> | undefined, minLevel: LogLevel) {
  const order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
  if (order[level] < order[minLevel]) return;

  if (pinoLogger) {
    pinoLogger[level](context ?? {}, message);
    return;
  }

  const entry: LogEntry = { level, message, context, timestamp: new Date().toISOString() };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = getLogger((process.env.LOG_LEVEL as LogLevel) ?? "info");
export default logger;

