import express from 'express';
import {randomUUID} from 'node:crypto';
import session from 'express-session';
import {RedisStore} from 'connect-redis';
import http from 'node:http';
import {AppError, errorHandler, signedContext} from '@store/validation';
export const serviceUrls = Object.fromEntries(['identity','catalog','order','notification','analytics'].map((name, index) => [name, process.env[`${name.toUpperCase()}_SERVICE_URL`] || `http://${name}-service:${5001+index}`]));
export function buildApp(redis) {
  const app = express();
  app.set('trust proxy', 1);
  app.use((req, res, next) => { req.requestId = randomUUID(); res.set('x-request-id', req.requestId); res.set('x-gateway-instance', process.env.INSTANCE_ID || 'gateway'); next(); });
  app.get('/health/live', (req,res) => res.json({success:true}));
  app.get('/health/ready', async (req,res,next) => {
    try {
      await redis.ping();
      const checks = await Promise.all(Object.entries(serviceUrls).map(async ([name,url]) => { const response = await fetch(`${url}/health/ready`, {signal:AbortSignal.timeout(5000)}); return {name,ready:response.ok}; }));
      const ready = checks.every(check=>check.ready); res.status(ready ? 200 : 503).json({success:ready,data:{services:checks}});
    } catch(error) { next(error); }
  });
  app.use(session({store:new RedisStore({client:redis,prefix:'session:'}),secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:3600000}}));
  app.use(async (req,res,next) => {
    try { const key = `rate:${req.ip}:${Math.floor(Date.now()/60000)}`; const count = await redis.incr(key); if(count===1) await redis.expire(key,120); if(count>300) throw new AppError(429,'RATE_LIMITED','Too many requests'); next(); } catch(error) { next(error); }
  });
  app.get('/api/v1/foundation/status', async (req,res,next) => {
    try {
      const data = await Promise.all(Object.entries(serviceUrls).map(async ([name,url]) => {
        const response = await fetch(`${url}/internal/foundation`, {headers:{'x-internal-token':signedContext(process.env.INTERNAL_SERVICE_SECRET,req.requestId)},signal:AbortSignal.timeout(5000)});
        if (!response.ok) throw new Error(`${name} unavailable`); return (await response.json()).data;
      })); res.json({success:true,data});
    } catch(error) {next(error);}
  });
  const proxy = (name, rewrite) => (req,res,next) => {
    const target = new URL(serviceUrls[name]);
    const headers = {...req.headers, host:target.host, 'x-internal-token':signedContext(process.env.INTERNAL_SERVICE_SECRET,req.requestId),'x-request-id':req.requestId};
    for(const key of ['x-user-id','x-user-role','cookie','connection','upgrade']) delete headers[key];
    const upstream = http.request({hostname:target.hostname,port:target.port,path:rewrite(req.url),method:req.method,headers},response=>{res.status(response.statusCode);for(const [key,value] of Object.entries(response.headers))if(!['connection','transfer-encoding'].includes(key) && value!==undefined)res.setHeader(key,value);response.pipe(res);});
    upstream.setTimeout(10000,()=>upstream.destroy(new Error('Upstream timeout')));
    upstream.on('error',()=>next(new AppError(502,'UPSTREAM_UNAVAILABLE','Upstream unavailable')));
    req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
  };
  app.use('/api/v1/foundation/:service', (req,res,next) => {
    if (process.env.FOUNDATION_PROBES_ENABLED !== 'true') return next(new AppError(404,'NOT_FOUND','Foundation tools disabled'));
    const name=req.params.service; if(!serviceUrls[name]) return next(new AppError(404,'NOT_FOUND','Unknown service'));
    return proxy(name, path=>`/internal/foundation${path}`)(req,res,next);
  });
  const routes = {identity:['auth','users','admin/users'],catalog:['products','categories','admin/products','admin/categories'],order:['cart','coupons','checkout','orders','admin/orders','admin/coupons'],analytics:['admin/dashboard']};
  for(const [name, prefixes] of Object.entries(routes)) for(const prefix of prefixes) app.use(`/api/v1/${prefix}`,proxy(name,path=>`/api/v1/${prefix}${path}`));
  app.use((req,res,next)=>next(new AppError(404,'NOT_FOUND','Endpoint not found')));app.use(errorHandler);return app;
}
