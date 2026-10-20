import {createClient} from 'redis';
import {createServer} from 'node:http';
import {buildApp} from './app.js';
import {createRealtimeService} from './services/realtime.service.js';
if(!process.env.SESSION_SECRET || !process.env.INTERNAL_SERVICE_SECRET) throw new Error('Gateway secrets required');
const redis = createClient({url:process.env.REDIS_URL});
redis.on('error',error=>console.error('Redis unavailable:',error.message));
await redis.connect();
let realtime;
const server = createServer(buildApp(redis, {
  isRealtimeReady: () => realtime?.isReady() || false
}));
realtime = createRealtimeService({server, redis});
await realtime.start();
server.listen(Number(process.env.PORT || 5000), '0.0.0.0');
let stopping = false;
async function shutdown(){
  if (stopping) return;
  stopping = true;
  await realtime.stop();
  if (redis.isOpen) await redis.quit();
}
process.on('SIGTERM',()=>shutdown().then(()=>process.exit(0)));
process.on('SIGINT',()=>shutdown().then(()=>process.exit(0)));
