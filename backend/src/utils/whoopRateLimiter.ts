type RateLimitHeaders = {
  limit: number;
  remaining: number;
  reset: number;
};

type CachedHeartRate = {
  heartRate: number | null;
  timestamp: number;
  source: "api" | "cache";
};

type ActiveUser = {
  userId: number;
  patientId: number;
  lastRequestTime: number;
};

class WhoopRateLimiter {
  private static instance: WhoopRateLimiter;

  private requestsPerMinute: number[] = [];
  private requestsPerDay: { count: number; resetAt: number } = {
    count: 0,
    resetAt: this.getNextMidnight(),
  };

  private currentRateLimits: RateLimitHeaders | null = null;

  private activeUsers: ActiveUser[] = [];
  private currentUserIndex = 0;

  private heartRateCache: Map<number, CachedHeartRate> = new Map();
  private readonly CACHE_TTL_MS = 15000;

  private cyclesCache: Map<number, { data: any; timestamp: number }> = new Map();
  private recoveryCache: Map<number, { data: any; timestamp: number }> = new Map();
  private sleepCache: Map<number, { data: any; timestamp: number }> = new Map();
  private workoutsCache: Map<number, { data: any; timestamp: number }> = new Map();
  private readonly METRIC_CACHE_TTL_MS = 60000;

  private constructor() {
    setInterval(() => this.cleanupOldRequests(), 60000);
    setInterval(() => this.resetDailyCounter(), 60000);
  }

  static getInstance(): WhoopRateLimiter {
    if (!WhoopRateLimiter.instance) {
      WhoopRateLimiter.instance = new WhoopRateLimiter();
    }
    return WhoopRateLimiter.instance;
  }

  updateRateLimits(headers: Headers): void {
    const limit = headers.get("X-RateLimit-Limit");
    const remaining = headers.get("X-RateLimit-Remaining");
    const reset = headers.get("X-RateLimit-Reset");

    if (limit && remaining && reset) {
      this.currentRateLimits = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };
    }
  }

  canMakeRequest(): { allowed: boolean; waitMs?: number; reason?: string } {
    const now = Date.now();
    const nowSeconds = Math.floor(now / 1000);

    if (this.requestsPerDay.resetAt <= nowSeconds) {
      this.resetDailyCounter();
    }

    if (this.requestsPerDay.count >= 10000) {
      const waitMs = (this.requestsPerDay.resetAt - nowSeconds) * 1000;
      return {
        allowed: false,
        waitMs,
        reason: "Daily rate limit exceeded (10,000 requests/day)",
      };
    }

    this.cleanupOldRequests();
    if (this.requestsPerMinute.length >= 100) {
      const oldestRequest = this.requestsPerMinute[0];
      const waitMs = 60000 - (now - oldestRequest);
      return {
        allowed: false,
        waitMs: Math.max(0, waitMs),
        reason: "Per-minute rate limit exceeded (100 requests/minute)",
      };
    }

    if (this.currentRateLimits) {
      if (this.currentRateLimits.remaining <= 0) {
        const waitMs = (this.currentRateLimits.reset - nowSeconds) * 1000;
        return {
          allowed: false,
          waitMs: Math.max(0, waitMs),
          reason: "API rate limit reached (from response headers)",
        };
      }
    }

    return { allowed: true };
  }

  recordRequest(): void {
    const now = Date.now();
    this.requestsPerMinute.push(now);
    this.requestsPerDay.count++;
  }

  getNextUser(): ActiveUser | null {
    if (this.activeUsers.length === 0) {
      return null;
    }

    const user = this.activeUsers[this.currentUserIndex];
    this.currentUserIndex = (this.currentUserIndex + 1) % this.activeUsers.length;
    return user;
  }

  addActiveUser(userId: number, patientId: number): void {
    const existingIndex = this.activeUsers.findIndex(
      (u) => u.userId === userId && u.patientId === patientId,
    );
    if (existingIndex === -1) {
      this.activeUsers.push({
        userId,
        patientId,
        lastRequestTime: Date.now(),
      });
    } else {
      this.activeUsers[existingIndex].lastRequestTime = Date.now();
    }
  }

  removeActiveUser(userId: number, patientId: number): void {
    this.activeUsers = this.activeUsers.filter(
      (u) => !(u.userId === userId && u.patientId === patientId),
    );
    if (this.activeUsers.length === 0) {
      this.currentUserIndex = 0;
    } else if (this.currentUserIndex >= this.activeUsers.length) {
      this.currentUserIndex = 0;
    }
  }

  cacheHeartRate(patientId: number, heartRate: number | null): void {
    this.heartRateCache.set(patientId, {
      heartRate,
      timestamp: Date.now(),
      source: "api",
    });
  }

  getCachedHeartRate(patientId: number): CachedHeartRate | null {
    const cached = this.heartRateCache.get(patientId);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL_MS) {
      this.heartRateCache.delete(patientId);
      return null;
    }

    return {
      ...cached,
      source: "cache",
    };
  }

  getCachedCycles(patientId: number): any | null {
    const cached = this.cyclesCache.get(patientId);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.METRIC_CACHE_TTL_MS) {
      this.cyclesCache.delete(patientId);
      return null;
    }
    return cached.data;
  }

  cacheCycles(patientId: number, data: any): void {
    this.cyclesCache.set(patientId, { data, timestamp: Date.now() });
  }

  getCachedRecovery(patientId: number): any | null {
    const cached = this.recoveryCache.get(patientId);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.METRIC_CACHE_TTL_MS) {
      this.recoveryCache.delete(patientId);
      return null;
    }
    return cached.data;
  }

  cacheRecovery(patientId: number, data: any): void {
    this.recoveryCache.set(patientId, { data, timestamp: Date.now() });
  }

  getCachedSleep(patientId: number): any | null {
    const cached = this.sleepCache.get(patientId);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.METRIC_CACHE_TTL_MS) {
      this.sleepCache.delete(patientId);
      return null;
    }
    return cached.data;
  }

  cacheSleep(patientId: number, data: any): void {
    this.sleepCache.set(patientId, { data, timestamp: Date.now() });
  }

  getCachedWorkouts(patientId: number): any | null {
    const cached = this.workoutsCache.get(patientId);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.METRIC_CACHE_TTL_MS) {
      this.workoutsCache.delete(patientId);
      return null;
    }
    return cached.data;
  }

  cacheWorkouts(patientId: number, data: any): void {
    this.workoutsCache.set(patientId, { data, timestamp: Date.now() });
  }

  getRateLimitStatus(): {
    perMinute: { used: number; limit: number; resetIn: number };
    perDay: { used: number; limit: number; resetIn: number };
    apiReported: RateLimitHeaders | null;
  } {
    this.cleanupOldRequests();
    const now = Date.now();
    const nowSeconds = Math.floor(now / 1000);

    return {
      perMinute: {
        used: this.requestsPerMinute.length,
        limit: 100,
        resetIn:
          this.requestsPerMinute.length > 0
            ? Math.max(0, 60000 - (now - this.requestsPerMinute[0]))
            : 0,
      },
      perDay: {
        used: this.requestsPerDay.count,
        limit: 10000,
        resetIn: Math.max(0, (this.requestsPerDay.resetAt - nowSeconds) * 1000),
      },
      apiReported: this.currentRateLimits,
    };
  }

  private cleanupOldRequests(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.requestsPerMinute = this.requestsPerMinute.filter((timestamp) => timestamp > oneMinuteAgo);
  }

  private resetDailyCounter(): void {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (this.requestsPerDay.resetAt <= nowSeconds) {
      this.requestsPerDay = {
        count: 0,
        resetAt: this.getNextMidnight(),
      };
    }
  }

  private getNextMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor(midnight.getTime() / 1000);
  }
}

export const whoopRateLimiter = WhoopRateLimiter.getInstance();
export type { CachedHeartRate, ActiveUser };
