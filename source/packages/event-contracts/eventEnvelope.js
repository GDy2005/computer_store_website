import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {domainTopics, probeTopic} from './topics.js';
const ajv = new Ajv({allErrors: true}); addFormats(ajv);
const validators = new Map([...domainTopics, probeTopic].map(topic => [topic, ajv.compile(JSON.parse(readFileSync(new URL(`./schemas/${topic}.json`, import.meta.url))))]));
export function validateEvent(topic, event) {
  const validate = validators.get(topic);
  if (!validate || !validate(event)) { const error = new Error('Invalid event contract'); error.code = 'INVALID_EVENT'; error.details = validate?.errors; throw error; }
  return event;
}
export function createEvent(topic, {producer, key, payload, correlationId = randomUUID(), causationId = null, eventId = randomUUID()}) {
  const eventType = topic === probeTopic ? 'foundation.probe' : topic.replace(/\.v1$/, '').replace(/^(users|products|comments|ratings|orders)\./, (_, plural) => `${plural.slice(0,-1)}.`);
  return validateEvent(topic, {eventId, eventType, eventVersion: 1, occurredAt: new Date().toISOString(), producer, correlationId, causationId, key, payload});
}
