/**
 * Utility functions for Ably error handling and retry logic
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = defaultRetryOptions
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        console.error(`Operation failed after ${maxRetries} retries:`, error);
        throw lastError;
      }

      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );
      
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Handle Ably-specific errors and determine if retry is appropriate
 */
export function shouldRetryAblyError(error: any): boolean {
  if (!error) return false;

  // Retry on network errors
  if (error.code === 80000 || error.code === 80001) return true;
  
  // Retry on timeout errors
  if (error.code === 90000) return true;
  
  // Don't retry on authentication errors
  if (error.code === 40171 || error.code === 40160) return false;
  
  // Don't retry on rate limit errors
  if (error.code === 42900) return false;
  
  // Retry on other connection errors
  if (error.message?.toLowerCase().includes('connection')) return true;
  
  return false;
}

/**
 * Send message with retry logic
 */
export async function sendMessageWithRetry(
  messageData: any,
  options: RetryOptions = defaultRetryOptions
): Promise<boolean> {
  return withRetry(async () => {
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return true;
  }, options);
}

/**
 * Publish to Ably channel with retry logic
 */
export async function publishWithRetry(
  channel: any,
  eventName: string,
  data: any,
  options: RetryOptions = defaultRetryOptions
): Promise<void> {
  return withRetry(async () => {
    await channel.publish(eventName, data);
  }, options);
}

/**
 * Monitor Ably connection health
 */
export class AblyConnectionMonitor {
  private healthChecks: number[] = [];
  private maxHealthChecks = 10;
  private unhealthyThreshold = 3;

  recordLatency(latency: number): void {
    this.healthChecks.push(latency);
    if (this.healthChecks.length > this.maxHealthChecks) {
      this.healthChecks.shift();
    }
  }

  getAverageLatency(): number {
    if (this.healthChecks.length === 0) return 0;
    return this.healthChecks.reduce((a, b) => a + b, 0) / this.healthChecks.length;
  }

  isHealthy(): boolean {
    if (this.healthChecks.length < 3) return true;
    
    const recentChecks = this.healthChecks.slice(-this.unhealthyThreshold);
    const averageLatency = recentChecks.reduce((a, b) => a + b, 0) / recentChecks.length;
    
    // Consider unhealthy if average latency > 5 seconds
    return averageLatency < 5000;
  }

  reset(): void {
    this.healthChecks = [];
  }
}
