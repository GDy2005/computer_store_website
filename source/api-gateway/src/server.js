import {createClient} from 'redis';
import {buildApp} from './app.js';
if(!process.env.SESSION_SECRET || !process.env.INTERNAL_SERVICE_SECRET) throw new Error('Gateway secrets required');
const redis = createClient({url:process.env.REDIS_URL});
redis.on('error',error=>console.error('Redis unavailable:',error.message));
await redis.connect();
const server=buildApp(redis).listen(Number(process.env.PORT || 5000),'0.0.0.0');
async function shutdown(){server.close();await redis.quit();}
process.on('SIGTERM',()=>shutdown().then(()=>process.exit(0)));
process.on('SIGINT',()=>shutdown().then(()=>process.exit(0)));
