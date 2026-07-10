/**
 * Ably usage monitoring and alerting
 */

export interface AblyUsageStats {
  messages: number;
  presence: number;
  storage: number;
  connections: number;
  period: string;
}

export interface AblyQuota {
  messages: number;
  presence: number;
  storage: number;
  connections: number;
}

export class AblyUsageMonitor {
  private apiKey: string;
  private usageHistory: AblyUsageStats[] = [];
  private maxHistorySize = 100;
  private alertThreshold = 0.8; // Alert at 80% of quota

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch current usage from Ably API
   */
  async getCurrentUsage(): Promise<AblyUsageStats | null> {
    try {
      const response = await fetch('https://www.ably.io/usage', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch Ably usage:', response.statusText);
        return null;
      }

      const data = await response.json();
      return this.parseUsageData(data);
    } catch (error) {
      console.error('Error fetching Ably usage:', error);
      return null;
    }
  }

  /**
   * Fetch quota limits from Ably API
   */
  async getQuota(): Promise<AblyQuota | null> {
    try {
      const response = await fetch('https://www.ably.io/account', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch Ably quota:', response.statusText);
        return null;
      }

      const data = await response.json();
      return this.parseQuotaData(data);
    } catch (error) {
      console.error('Error fetching Ably quota:', error);
      return null;
    }
  }

  /**
   * Check if usage is approaching quota limits
   */
  async checkQuotaStatus(): Promise<{
    status: 'ok' | 'warning' | 'critical';
    details: Record<string, { used: number; limit: number; percentage: number }>;
  }> {
    const usage = await this.getCurrentUsage();
    const quota = await this.getQuota();

    if (!usage || !quota) {
      return {
        status: 'ok',
        details: {},
      };
    }

    const details: Record<string, { used: number; limit: number; percentage: number }> = {
      messages: {
        used: usage.messages,
        limit: quota.messages,
        percentage: (usage.messages / quota.messages) * 100,
      },
      presence: {
        used: usage.presence,
        limit: quota.presence,
        percentage: (usage.presence / quota.presence) * 100,
      },
      storage: {
        used: usage.storage,
        limit: quota.storage,
        percentage: (usage.storage / quota.storage) * 100,
      },
      connections: {
        used: usage.connections,
        limit: quota.connections,
        percentage: (usage.connections / quota.connections) * 100,
      },
    };

    // Determine overall status
    const percentages = Object.values(details).map(d => d.percentage);
    const maxPercentage = Math.max(...percentages);

    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (maxPercentage >= 95) {
      status = 'critical';
    } else if (maxPercentage >= this.alertThreshold * 100) {
      status = 'warning';
    }

    return { status, details };
  }

  /**
   * Record usage data point
   */
  recordUsage(usage: AblyUsageStats): void {
    this.usageHistory.push(usage);
    
    if (this.usageHistory.length > this.maxHistorySize) {
      this.usageHistory.shift();
    }
  }

  /**
   * Get usage trends
   */
  getUsageTrends(): {
    messages: { trend: 'increasing' | 'decreasing' | 'stable'; rate: number };
    presence: { trend: 'increasing' | 'decreasing' | 'stable'; rate: number };
  } {
    if (this.usageHistory.length < 2) {
      return {
        messages: { trend: 'stable', rate: 0 },
        presence: { trend: 'stable', rate: 0 },
      };
    }

    const recent = this.usageHistory.slice(-10);
    const older = this.usageHistory.slice(-20, -10);

    const calculateTrend = (metric: keyof AblyUsageStats) => {
      const recentAvg = recent.reduce((sum, u) => sum + (u[metric] as number), 0) / recent.length;
      const olderAvg = older.reduce((sum, u) => sum + (u[metric] as number), 0) / older.length;
      
      if (olderAvg === 0) return { trend: 'stable' as const, rate: 0 };
      
      const rate = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      if (rate > 10) return { trend: 'increasing' as const, rate };
      if (rate < -10) return { trend: 'decreasing' as const, rate };
      return { trend: 'stable' as const, rate };
    };

    return {
      messages: calculateTrend('messages'),
      presence: calculateTrend('presence'),
    };
  }

  /**
   * Send alert if quota is exceeded
   */
  async sendQuotaAlert(status: 'warning' | 'critical', details: Record<string, { used: number; limit: number; percentage: number }>): Promise<void> {
    const alertData = {
      type: 'ably_quota_alert',
      status,
      timestamp: new Date().toISOString(),
      details,
    };

    console.warn('Ably quota alert:', alertData);

    // In production, you would send this to your monitoring service
    // Example: await sendToMonitoringService(alertData);
  }

  /**
   * Parse usage data from Ably API response
   */
  private parseUsageData(data: any): AblyUsageStats {
    return {
      messages: data.messages || 0,
      presence: data.presence || 0,
      storage: data.storage || 0,
      connections: data.connections || 0,
      period: data.period || 'unknown',
    };
  }

  /**
   * Parse quota data from Ably API response
   */
  private parseQuotaData(data: any): AblyQuota {
    return {
      messages: data.quota?.messages || 0,
      presence: data.quota?.presence || 0,
      storage: data.quota?.storage || 0,
      connections: data.quota?.connections || 0,
    };
  }
}

/**
 * Singleton instance for monitoring
 */
let monitorInstance: AblyUsageMonitor | null = null;

export function getAblyMonitor(): AblyUsageMonitor {
  if (!monitorInstance) {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error('ABLY_API_KEY is not set');
    }
    monitorInstance = new AblyUsageMonitor(apiKey);
  }
  return monitorInstance;
}

/**
 * Start periodic monitoring
 */
export function startAblyMonitoring(intervalMs: number = 3600000): NodeJS.Timeout {
  const monitor = getAblyMonitor();
  
  return setInterval(async () => {
    const status = await monitor.checkQuotaStatus();
    
    if (status.status === 'warning' || status.status === 'critical') {
      await monitor.sendQuotaAlert(status.status, status.details);
    }
    
    const usage = await monitor.getCurrentUsage();
    if (usage) {
      monitor.recordUsage(usage);
    }
  }, intervalMs);
}
