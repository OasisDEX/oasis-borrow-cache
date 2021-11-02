import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { flatten } from 'lodash';
import { Event } from '../types/history';
import { WithIlk } from '../utils/eventsDb';

export interface EventToPrice {
  id: number;
  price: string;
}

type WithTokenFromIlk<T extends WithIlk<unknown>> = T & { token: string; };

type EventWithToken = WithTokenFromIlk<WithIlk<Event>>;

// tslint:disable-next-line
function ilkToToken(ilk: string): string {
  return ilk.split('-')[0];
}

export function addTokenFromIlk<T extends WithIlk<unknown>>(event: T): WithTokenFromIlk<T> {
  return { ...event, token: ilkToToken(event.ilk) };
}

export async function getEventsToOSMPrice<T extends {token: string, id: number, timestamp: Date}>(services: LocalServices, events: T[]): Promise<EventToPrice[]> {
  const values = events
    .map(event => `('${event.token}','${new Date(event.timestamp).toISOString()}',${event.id})`)
    .join(',');
  return flatten(
    await services.tx.multi(
      `
        SELECT r._event_id as id, o.price FROM (
          SELECT _token, _event_id, (
            SELECT id FROM oracles.prices WHERE token = t._token and timestamp < to_timestamp(t._timestamp, 'YYYY-MM-DDThh24:mi:ss') ORDER BY timestamp DESC LIMIT 1) 
            FROM (VALUES${values}) t(_token, _timestamp, _event_id)) r 
            LEFT JOIN oracles.prices o ON o.id = r.id;
        `
    )
  );
}

export async function updateEventsWithOsmPrice(services: LocalServices, eventsToPrice: EventToPrice[]) {
  const updateValues = eventsToPrice
        .map(({ price, id }) => ({ id, price: price || 0 }))
        .map(({ id, price }) => `(${price},${id})`)
        .join(',');
  return services.tx.none(
    `
      UPDATE vault.events SET oracle_price = c.price
      FROM (values${updateValues}) AS c(price, id) 
      WHERE c.id = vault.events.id;
    `)
}

export async function updateEventsWithEthPrice(services: LocalServices, eventsToPrice: EventToPrice[]) {
  const updateValues = eventsToPrice
        .map(({ price, id }) => ({ id, price: price || 0 }))
        .map(({ id, price }) => `(${price},${id})`)
        .join(',');
  return services.tx.none(
    `
      UPDATE vault.events SET eth_price = c.price
      FROM (values${updateValues}) AS c(price, id) 
      WHERE c.id = vault.events.id;
    `)
}