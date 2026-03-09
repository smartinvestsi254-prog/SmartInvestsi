const { URLS, RESPONSE_TIME_THRESHOLD, ERROR_RATE_THRESHOLD, HISTORY_LIMIT, CHECK_INTERVAL, EMAIL } = require('../config');

describe('config module', () => {
  afterEach(() => {
    delete process.env.URLS;
    delete process.env.RESPONSE_TIME_THRESHOLD;
    delete process.env.ERROR_RATE_THRESHOLD;
    delete process.env.HISTORY_LIMIT;
    delete process.env.CHECK_INTERVAL;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_TO;
  });

  it('provides defaults', () => {
    expect(Array.isArray(URLS)).toBe(true);
    expect(RESPONSE_TIME_THRESHOLD).toBeGreaterThan(0);
    expect(ERROR_RATE_THRESHOLD).toBeGreaterThanOrEqual(0);
    expect(HISTORY_LIMIT).toBeGreaterThan(0);
    expect(CHECK_INTERVAL).toMatch(/\d/);
    expect(EMAIL).toHaveProperty('service');
  });

  it('reads environment overrides', () => {
    process.env.URLS = 'https://foo,https://bar';
    process.env.RESPONSE_TIME_THRESHOLD = '500';
    process.env.ERROR_RATE_THRESHOLD = '0.5';
    process.env.HISTORY_LIMIT = '10';
    process.env.CHECK_INTERVAL = '*/5 * * * *';
    process.env.EMAIL_USER = 'a';
    process.env.EMAIL_PASS = 'b';
    process.env.EMAIL_TO = 'c';

    const cfg = require('../config');
    expect(cfg.URLS).toEqual(['https://foo', 'https://bar']);
    expect(cfg.RESPONSE_TIME_THRESHOLD).toBe(500);
    expect(cfg.ERROR_RATE_THRESHOLD).toBe(0.5);
    expect(cfg.HISTORY_LIMIT).toBe(10);
    expect(cfg.CHECK_INTERVAL).toBe('*/5 * * * *');
    expect(cfg.EMAIL.user).toBe('a');
    expect(cfg.EMAIL.pass).toBe('b');
    expect(cfg.EMAIL.to).toBe('c');
  });
});