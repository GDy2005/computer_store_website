// One-time scaffold kept as a reproducible record; do not run over modified files.
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {domainTopics, topics} from '../packages/event-contracts/topics.js';
function put(path, content) { mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, content); }
const str = {type: 'string', minLength: 1};
const id = {type: 'string', minLength: 1};
const amount = {type: 'integer', minimum: 0};
const obj = properties => ({type: 'object', properties, required: Object.keys(properties), additionalProperties: false});
const items = {type: 'array', minItems: 1, items: obj({productId: id, variantId: id, quantity: {type: 'integer', minimum: 1}})};
const product = obj({productId: id, name: str, description: str, brand: str, categoryId: id, tags: {type: 'array', items: str}, minPrice: amount, maxPrice: amount, averageRating: {type:'number', minimum:0, maximum:5}, isActive: {type:'boolean'}});
const order = obj({orderId: id, orderNumber: str, userId: id, customer: obj({fullName:str,email:{type:'string',format:'email'},phone:str}), items: {type:'array', minItems:1, items: obj({productId:id,variantId:id,quantity:{type:'integer',minimum:1},productName:str,categoryName:str,unitPrice:amount,unitCost:amount,lineTotal:amount})}, pricing: obj({total:amount,totalCost:amount,profit:{type:'integer'}})});
const payloads = {
 'users.created.v1': obj({userId:id,email:{type:'string',format:'email'},fullName:str,role:{enum:['CUSTOMER','ADMIN']},accountStatus:{enum:['ACTIVE','PENDING_ACTIVATION']}}),
 'users.updated.v1': obj({userId:id,fullName:str,isBanned:{type:'boolean'}}),
 'products.created.v1': product, 'products.updated.v1': product,
 'comments.created.v1': obj({commentId:id,productId:id,displayName:str,content:str}),
 'ratings.updated.v1': obj({productId:id,averageRating:{type:'number',minimum:0,maximum:5},ratingCount:amount}),
 'orders.created.v1': order, 'orders.confirmed.v1': order,
 'orders.cancelled.v1': obj({orderId:id,orderNumber:str,reason:str}),
 'orders.status-changed.v1': obj({orderId:id,orderNumber:str,previousStatus:{enum:['PENDING','CONFIRMED','SHIPPING','DELIVERED','CANCELLED']},status:{enum:['PENDING','CONFIRMED','SHIPPING','DELIVERED','CANCELLED']}}),
 'inventory.reserved.v1': obj({orderId:id,reservationId:id,items}),
 'inventory.rejected.v1': obj({orderId:id,reason:str,items}),
 'inventory.release-requested.v1': obj({orderId:id,reservationId:id,reason:str}),
 'loyalty.changed.v1': obj({userId:id,orderId:id,transactionId:id,type:{enum:['EARN','REDEEM','REFUND']},points:amount,balanceAfter:amount}),
 'email.requested.v1': obj({userId:id,recipientEmail:{type:'string',format:'email'},type:{enum:['PASSWORD_RESET','ACCOUNT_ACTIVATION','ORDER_CONFIRMATION']},templateData:{type:'object'}}),
 'foundation.probe.v1': obj({probeId:{type:'string',format:'uuid'},message:{type:'string',maxLength:200},mode:{enum:['normal','retry','poison']}})
};
for (const [topic, payload] of Object.entries(payloads)) {
 const eventType = topic.replace(/\.v1$/, '').replace(/^(users|products|comments|ratings|orders)\./, (_, p) => `${p.slice(0,-1)}.`);
 const schema = obj({eventId:{type:'string',format:'uuid'},eventType:{const:eventType},eventVersion:{const:1},occurredAt:{type:'string',format:'date-time'},producer:{enum:['identity-service','catalog-service','order-service','notification-service','analytics-service']},correlationId:str,causationId:{anyOf:[{type:'string',format:'uuid'},{type:'null'}]},key:id,payload});
 put(`packages/event-contracts/schemas/${topic}.json`, JSON.stringify({$schema:'http://json-schema.org/draft-07/schema#',...schema},null,2)+'\n');
}
const dockerfile = `FROM node:22-bookworm-slim\nWORKDIR /app\nCOPY . .\nRUN npm ci --omit=dev --ignore-scripts\nUSER node\nARG SERVICE_PATH\nENV SERVICE_PATH=$SERVICE_PATH\nCMD ["sh", "-c", "node $SERVICE_PATH/src/server.js"]\n`;
const services = ['identity','catalog','order','notification','analytics'];
for (const short of services) {
 const name = `${short}-service`, root = `services/${name}`;
 put(`${root}/package.json`, JSON.stringify({name:`@store/${name}`,version:'1.0.0',type:'module',scripts:{start:'node src/server.js'},dependencies:{express:'^5.1.0','@store/service-runtime':'1.0.0'}},null,2));
 put(`${root}/Dockerfile`, dockerfile);
 put(`${root}/src/app.js`, `import express from 'express';\nexport function buildApp() { return express(); }\n`);
 put(`${root}/src/server.js`, `import {startService} from '@store/service-runtime';\nimport {buildApp} from './app.js';\nimport {handleProbe} from './events/handlers.js';\nawait startService('${name}', buildApp, handleProbe);\n`);
 put(`${root}/src/events/handlers.js`, `// Foundation handler only; domain handlers belong to their respective phases.\nexport async function handleProbe(event, session, {Probe, attempt}) {\n  if (event.payload.mode === 'poison' || (event.payload.mode === 'retry' && attempt === 0)) throw new Error('Requested foundation failure');\n  await Probe.updateOne({probeId: event.payload.probeId}, {$setOnInsert: {message: event.payload.message}, $inc: {effects: 1}}, {upsert: true, session});\n}\n`);
}
put('api-gateway/Dockerfile',dockerfile);
put('infra/kafka/topic-config.json', JSON.stringify({partitions:3,replicationFactor:1,retentionMs:604800000,domainTopics,topics},null,2));
put('infra/kafka/create-topics.sh', '#!/bin/sh\nset -eu\n'+topics.map(topic => `/opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --create --if-not-exists --topic ${topic} --partitions 3 --replication-factor 1 --config retention.ms=604800000`).join('\n')+'\n');
let compose = `name: computer-store\n\nx-app: &app\n  restart: unless-stopped\n  init: true\n  networks: [private]\n  healthcheck:\n    test: [CMD, node, -e, "fetch('http://localhost:'+process.env.PORT+'/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]\n    interval: 15s\n    timeout: 10s\n    retries: 10\n    start_period: 60s\n\nx-core-env: &core-env\n  NODE_ENV: development\n  MONGODB_URI: mongodb://mongo:27017/?replicaSet=rs0\n  KAFKA_BROKERS: kafka:9092\n  INTERNAL_SERVICE_SECRET: \${INTERNAL_SERVICE_SECRET:-local-demo-internal-change-before-production}\n  FOUNDATION_PROBES_ENABLED: \${FOUNDATION_PROBES_ENABLED:-true}\n\nx-core-deps: &core-deps\n  mongo-init: {condition: service_completed_successfully}\n  kafka-init: {condition: service_completed_successfully}\n\nservices:\n  mongo:\n    image: mongo:7.0.26\n    command: [mongod, --replSet, rs0, --bind_ip_all]\n    restart: unless-stopped\n    networks: [private]\n    volumes: [mongo-data:/data/db]\n    healthcheck:\n      test: [CMD, mongosh, --quiet, --eval, "quit(db.adminCommand('ping').ok ? 0 : 1)"]\n      interval: 5s\n      timeout: 5s\n      retries: 30\n  mongo-init:\n    image: mongo:7.0.26\n    networks: [private]\n    depends_on:\n      mongo: {condition: service_healthy}\n    volumes: [./infra/mongodb/init-replica-set.js:/init.js:ro]\n    entrypoint: [mongosh, --host, mongo:27017, --quiet, /init.js]\n  redis:\n    image: redis:7.4-bookworm\n    command: [redis-server, --appendonly, 'yes']\n    restart: unless-stopped\n    networks: [private]\n    volumes: [redis-data:/data]\n    healthcheck:\n      test: [CMD, redis-cli, ping]\n      interval: 5s\n      timeout: 3s\n      retries: 20\n  kafka:\n    image: apache/kafka:3.9.2\n    restart: unless-stopped\n    networks: [private]\n    environment:\n      KAFKA_NODE_ID: 1\n      KAFKA_PROCESS_ROLES: broker,controller\n      KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093\n      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092\n      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER\n      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT\n      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093\n      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT\n      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1\n      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1\n      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1\n      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0\n      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'\n      KAFKA_LOG_DIRS: /var/lib/kafka/data\n      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk\n    volumes: [kafka-data:/var/lib/kafka/data]\n    healthcheck:\n      test: [CMD, /opt/kafka/bin/kafka-topics.sh, --bootstrap-server, kafka:9092, --list]\n      interval: 10s\n      timeout: 10s\n      retries: 30\n      start_period: 30s\n  kafka-init:\n    image: apache/kafka:3.9.2\n    networks: [private]\n    depends_on:\n      kafka: {condition: service_healthy}\n    volumes: [./infra/kafka/create-topics.sh:/create-topics.sh:ro]\n    entrypoint: [sh, /create-topics.sh]\n`;
for (const [index, short] of services.entries()) {
 const name = `${short}-service`;
 compose += `  ${name}:\n    <<: *app\n    build:\n      context: .\n      dockerfile: services/${name}/Dockerfile\n      args: {SERVICE_PATH: services/${name}}\n    environment:\n      <<: *core-env\n      PORT: ${5001+index}\n      DB_NAME: ${short}_db\n    depends_on: *core-deps\n`;
}
for (const replica of [1,2]) compose += `  gateway-${replica}:\n    <<: *app\n    build:\n      context: .\n      dockerfile: api-gateway/Dockerfile\n      args: {SERVICE_PATH: api-gateway}\n    environment:\n      NODE_ENV: development\n      PORT: 5000\n      INSTANCE_ID: gateway-${replica}\n      REDIS_URL: redis://redis:6379\n      SESSION_SECRET: \${SESSION_SECRET:-local-demo-session-change-before-production}\n      INTERNAL_SERVICE_SECRET: \${INTERNAL_SERVICE_SECRET:-local-demo-internal-change-before-production}\n      FOUNDATION_PROBES_ENABLED: \${FOUNDATION_PROBES_ENABLED:-true}\n    depends_on:\n      redis: {condition: service_healthy}\n`+services.map(short=>`      ${short}-service: {condition: service_healthy}\n`).join('');
compose += `  frontend:\n    build:\n      context: .\n      dockerfile: frontend/Dockerfile\n    restart: unless-stopped\n    networks: [private]\n    healthcheck:\n      test: [CMD, curl, -fsS, http://127.0.0.1/]\n      interval: 10s\n      timeout: 3s\n      retries: 10\n  nginx:\n    image: nginx:1.28-bookworm\n    restart: unless-stopped\n    ports: ["\${HTTP_PORT:-80}:80"]\n    networks: [private]\n    volumes: [./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro]\n    depends_on:\n      frontend: {condition: service_healthy}\n      gateway-1: {condition: service_healthy}\n      gateway-2: {condition: service_healthy}\n    healthcheck:\n      test: [CMD, curl, -fsS, http://127.0.0.1/health/ready]\n      interval: 10s\n      timeout: 5s\n      retries: 10\nnetworks:\n  private:\n    driver: bridge\nvolumes:\n  mongo-data:\n  redis-data:\n  kafka-data:\n`;
put('docker-compose.yml',compose);

