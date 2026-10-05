/** camelCase <-> snake_case helpers used by the model layer. */
export const snake = (s: string): string => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
export const camel = (s: string): string => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
