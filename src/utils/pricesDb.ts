import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { flatten } from 'lodash';

export interface EventToPrice {
  id: number;
  price: string;
}

export async function getEventsToOSMPrice<T extends { token: string; id: number; timestamp: Date }>(
  services: LocalServices,
  events: T[],
): Promise<EventToPrice[]> {
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
        `,
    ),
  );
}

export async function updateEventsWithOsmPrice(
  services: LocalServices,
  eventsToPrice: EventToPrice[],
): Promise<null> {
  const updateValues = eventsToPrice
    .map(({ price, id }) => ({ id, price: price || 0 }))
    .map(({ id, price }) => `(${price},${id})`)
    .join(',');
  return services.tx.none(
    `
      UPDATE vault.events SET oracle_price = c.price
      FROM (values${updateValues}) AS c(price, id) 
      WHERE c.id = vault.events.id;
    `,
  );
}

export async function updateEventsWithEthPrice(
  services: LocalServices,
  eventsToPrice: EventToPrice[],
): Promise<null> {
  const updateValues = eventsToPrice
    .map(({ price, id }) => ({ id, price: price || 0 }))
    .map(({ id, price }) => `(${price},${id})`)
    .join(',');
  return services.tx.none(
    `
      UPDATE vault.events SET eth_price = c.price
      FROM (values${updateValues}) AS c(price, id) 
      WHERE c.id = vault.events.id;
    `,
  );
}

export async function updateAutomationAddEventsWithEthPrice(
  services: LocalServices,
  eventsToPrice: EventToPrice[],
): Promise<null> {
  const updateValues = eventsToPrice
    .map(({ price, id }) => ({ id, price: price || 0 }))
    .map(({ id, price }) => `(${price},${id})`)
    .join(',');
  return services.tx.none(
    `
      UPDATE automation_bot.trigger_added_events SET eth_price = c.price
      FROM (values${updateValues}) AS c(price, id) 
      WHERE c.id = automation_bot.trigger_added_events.id;
    `,
  );
}
export async function updateAutomationRemoveEventsWithEthPrice(
  services: LocalServices,
  eventsToPrice: EventToPrice[],
): Promise<null> {
  const updateValues = eventsToPrice
    .map(({ price, id }) => ({ id, price: price || 0 }))
    .map(({ id, price }) => `(${price},${id})`)
    .join(',');
  return services.tx.none(
    `
      UPDATE automation_bot.trigger_removed_events SET eth_price = c.price
      FROM (values${updateValues}) AS c(price, id) 
      WHERE c.id = automation_bot.trigger_removed_events.id;
    `,
  );
}
