// Development-only logger utility
// Only logs in development mode, completely silent in production

const isDev = import.meta.env.DEV;

export const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

export const devError = (...args: any[]) => {
  // Errors are always logged, but with context
  console.error(...args);
};

export const devInfo = (...args: any[]) => {
  if (isDev) {
    console.info(...args);
  }
};

// For group logging
export const devGroup = (label: string, fn: () => void) => {
  if (isDev) {
    console.group(label);
    fn();
    console.groupEnd();
  }
};

export default {
  log: devLog,
  warn: devWarn,
  error: devError,
  info: devInfo,
  group: devGroup,
};
