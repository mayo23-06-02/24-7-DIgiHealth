type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, scope: string, event: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${scope}] ${event}`;

  if (data === undefined) {
    console[level](prefix);
    return;
  }

  console[level](prefix, data);
}

export const apiLogger = {
  info(scope: string, event: string, data?: unknown) {
    write("info", scope, event, data);
  },
  warn(scope: string, event: string, data?: unknown) {
    write("warn", scope, event, data);
  },
  error(scope: string, event: string, data?: unknown) {
    write("error", scope, event, data);
  },
};
