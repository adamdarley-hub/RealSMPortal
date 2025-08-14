// Production-ready logging utility
export class Logger {
  private static isProduction = process.env.NODE_ENV === 'production';
  
  static info(message: string, meta?: any) {
    if (this.isProduction) {
      console.log(JSON.stringify({
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        ...(meta && { meta })
      }));
    } else {
      console.log(message, meta || '');
    }
  }
  
  static error(message: string, error?: any, meta?: any) {
    if (this.isProduction) {
      console.error(JSON.stringify({
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        error: error?.message || error,
        stack: error?.stack,
        ...(meta && { meta })
      }));
    } else {
      console.error(message, error || '', meta || '');
    }
  }
  
  static warn(message: string, meta?: any) {
    if (this.isProduction) {
      console.warn(JSON.stringify({
        level: 'warn',
        message,
        timestamp: new Date().toISOString(),
        ...(meta && { meta })
      }));
    } else {
      console.warn(message, meta || '');
    }
  }
  
  static debug(message: string, meta?: any) {
    if (!this.isProduction) {
      console.log(`🔍 ${message}`, meta || '');
    }
  }
}
