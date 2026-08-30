import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

// Configuration interface
export interface MarketDataConfig {
  apiKey?: string;
  baseUrl?: string;
  wsUrl?: string;
  cacheTtlMs?: number;
  rateLimitMaxRequests?: number;
  rateLimitWindowMs?: number;
}

// Data models
export interface Quote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: number;
}

export interface HistoricalBar {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MarketDataService extends EventEmitter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly wsUrl: string;
  private readonly httpClient: AxiosInstance;
  private readonly cacheTtlMs: number;

  private ws: WebSocket | null = null;
  private wsReconnectTimer: NodeJS.Timeout | null = null;
  private isExplicitlyClosed = false;
  private activeSubscriptions: Set<string> = new Set();

  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestTimestamps: number[] = [];
  private readonly rateLimitMax: number;
  private readonly rateLimitWindow: number;

  constructor(config: MarketDataConfig = {}) {
    super();

    // Load credentials strictly from environment variables or passed config
    this.apiKey = config.apiKey || process.env.MARKET_DATA_API_KEY || '';
    this.baseUrl = config.baseUrl || process.env.MARKET_DATA_BASE_URL || 'https://api.marketdata.com/v1';
    this.wsUrl = config.wsUrl || process.env.MARKET_DATA_WS_URL || 'wss://ws.marketdata.com/v1';
    
    this.cacheTtlMs = config.cacheTtlMs ?? 5000; // 5 seconds default
    this.rateLimitMax = config.rateLimitMaxRequests ?? 100;
    this.rateLimitWindow = config.rateLimitWindowMs ?? 60000; // 100 requests / min default

    if (!this.apiKey) {
      throw new Error(
        'CRITICAL ERROR: MARKET_DATA_API_KEY is missing. Configure it in process.env or pass it to constructor options.'
      );
    }

    // Axios client configuration
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-API-Key': this.apiKey,
      },
    });
  }

  // ==========================================
  // PUBLIC REST API METHODS
  // ==========================================

  /**
   * Fetches real-time quote for a specific ticker symbol.
   */
  public async getQuote(symbol: string): Promise<Quote> {
    const cleanSymbol = this.sanitizeSymbol(symbol);
    const cacheKey = `quote:${cleanSymbol}`;

    const cached = this.getFromCache<Quote>(cacheKey);
    if (cached) return cached;

    await this.enforceRateLimit();

    try {
      const response = await this.httpClient.get<Quote>(`/quotes/${cleanSymbol}`);
      const quote = response.data;
      
      this.setCache(cacheKey, quote);
      return quote;
    } catch (error: any) {
      this.handleApiError(`Failed to fetch quote for ${cleanSymbol}`, error);
      throw error;
    }
  }

  /**
   * Fetches historical bar/candle data for a given range.
   */
  public async getHistoricalData(
    symbol: string,
    timeframe: '1m' | '5m' | '1h' | '1d',
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalBar[]> {
    const cleanSymbol = this.sanitizeSymbol(symbol);
    const cacheKey = `history:${cleanSymbol}:${timeframe}:${startDate.getTime()}-${endDate.getTime()}`;

    const cached = this.getFromCache<HistoricalBar[]>(cacheKey);
    if (cached) return cached;

    await this.enforceRateLimit();

    try {
      const response = await this.httpClient.get<HistoricalBar[]>(`/historical/${cleanSymbol}`, {
        params: {
          timeframe,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      });

      const bars = response.data;
      this.setCache(cacheKey, bars, 60000); // Cache historical data longer (1 min)
      return bars;
    } catch (error: any) {
      this.handleApiError(`Failed to fetch historical data for ${cleanSymbol}`, error);
      throw error;
    }
  }

  // ==========================================
  // WEBSOCKET REAL-TIME STREAMING
  // ==========================================

  /**
   * Connects to the real-time WebSocket market stream.
   */
  public connectStream(): void {
    this.isExplicitlyClosed = false;
    
    // Authenticate WS via query parameter or authorization protocol header
    const authWsUrl = `${this.wsUrl}?apiKey=${encodeURIComponent(this.apiKey)}`;
    this.ws = new WebSocket(authWsUrl);

    this.ws.on('open', () => {
      this.emit('connected');
      this.resubscribeAll();
    });

    this.ws.on('message', (rawMessage: WebSocket.RawData) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        if (message.type === 'trade' || message.type === 'quote') {
          this.emit('marketData', message);
        }
      } catch (err) {
        this.emit('error', new Error('Failed to parse WebSocket message stream'));
      }
    });

    this.ws.on('error', (err) => {
      this.emit('error', err);
    });

    this.ws.on('close', (code, reason) => {
      this.emit('disconnected', { code, reason: reason.toString() });
      if (!this.isExplicitlyClosed) {
        this.scheduleReconnect();
      }
    });
  }

  /**
   * Subscribes to real-time quotes for a symbol.
   */
  public subscribeSymbol(symbol: string): void {
    const cleanSymbol = this.sanitizeSymbol(symbol);
    this.activeSubscriptions.add(cleanSymbol);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', symbol: cleanSymbol }));
    }
  }

  /**
   * Unsubscribes from real-time updates for a symbol.
   */
  public unsubscribeSymbol(symbol: string): void {
    const cleanSymbol = this.sanitizeSymbol(symbol);
    this.activeSubscriptions.delete(cleanSymbol);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe', symbol: cleanSymbol }));
    }
  }

  /**
   * Gracefully shuts down WebSocket connections and clears timers.
   */
  public close(): void {
    this.isExplicitlyClosed = true;
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cache.clear();
  }

  // ==========================================
  // PRIVATE SECURITY & UTILITY METHODS
  // ==========================================

  private sanitizeSymbol(symbol: string): string {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol parameter provided.');
    }
    return symbol.trim().toUpperCase().replace(/[^A-Z0-9.\-_]/g, '');
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, customTtlMs?: number): void {
    const expiresAt = Date.now() + (customTtlMs ?? this.cacheTtlMs);
    this.cache.set(key, { data, expiresAt });
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < this.rateLimitWindow);

    if (this.requestTimestamps.length >= this.rateLimitMax) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = this.rateLimitWindow - (now - oldestTimestamp);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requestTimestamps.push(Date.now());
  }

  private scheduleReconnect(): void {
    if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
    this.wsReconnectTimer = setTimeout(() => {
      this.connectStream();
    }, 5000); // Reconnect backoff after 5 seconds
  }

  private resubscribeAll(): void {
    for (const symbol of this.activeSubscriptions) {
      this.subscribeSymbol(symbol);
    }
  }

  private handleApiError(contextMessage: string, error: any): void {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      console.error(`[MarketDataService] ${contextMessage} | Status: ${status}`, data || error.message);
    } else {
      console.error(`[MarketDataService] ${contextMessage}`, error);
    }
  }
}
