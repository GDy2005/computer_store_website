import {Kafka, logLevel} from 'kafkajs';
export function kafkaClient(clientId, brokers = process.env.KAFKA_BROKERS?.split(',') || ['kafka:9092']) {
  return new Kafka({clientId, brokers, logLevel: logLevel.ERROR, retry: {retries: 10}});
}
export function retryDelay(attempt) { return Math.min(1000 * 2 ** (attempt - 1), 30000); }
export function failureTopic(topic, attempt, maxAttempts = 3) { return `${topic}.${attempt >= maxAttempts ? 'dlq' : 'retry'}`; }
