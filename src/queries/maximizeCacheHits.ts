/**
 * We transform graphql query that later is used as cache key to maximize cache hits.
 * Mostly its about rounding dates. After adding new query you should revisit these.
 */
export function maximizeCacheHits(cacheKey: string): string {
  const parsed = JSON.parse(cacheKey);

  if (parsed.operationName === 'priceChart') {
    return transformPriceChart(parsed);
  }

  if (parsed.operationName === 'allTradesLive') {
    return transformAllTradesLive(parsed);
  }

  if (parsed.operationName === 'allTradesCurrent') {
    return transformAllTradesCurrent(parsed);
  }

  return cacheKey;
}

function transformPriceChart(parsed: any): string {
  parsed.variables.dateFrom = roundDate(parsed.variables.dateFrom);

  return JSON.stringify(parsed);
}

function transformAllTradesLive(parsed: any): string {
  parsed.variables.timestampFrom = roundDate(parsed.variables.timestampFrom);

  return JSON.stringify(parsed);
}

function transformAllTradesCurrent(parsed: any): string {
  parsed.variables.timestampFrom = roundDate(parsed.variables.timestampFrom);
  parsed.variables.timestampTo = roundDate(parsed.variables.timestampTo);

  return JSON.stringify(parsed);
}

function roundDate(date: string): string {
  const d = new Date(date);
  // 15 seconds resolution
  d.setSeconds(Math.floor(d.getSeconds() / 15) * 15);
  d.setMilliseconds(0);

  return d.toISOString();
}
