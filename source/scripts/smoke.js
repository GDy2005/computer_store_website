import assert from 'node:assert/strict';
import {eventually} from '@store/test-utils';
const base=process.env.APP_BASE_URL || 'http://localhost';
async function request(path, options={}) {const response=await fetch(`${base}${path}`,{...options,signal:AbortSignal.timeout(10000)});const body=await response.json();assert.ok(response.ok,`${response.status} ${JSON.stringify(body)}`);return body.data;}
const names=['identity','catalog','order','notification','analytics'];
await eventually(async()=>{try{const r=await fetch(`${base}/health/ready`,{signal:AbortSignal.timeout(10000)});return r.ok;}catch{return false;}},180000);
let status=await request('/api/v1/foundation/status');assert.equal(status.length,5);
for(const mode of ['normal','retry','poison']){
 const before=await request('/api/v1/foundation/status');
 const probe=await request('/api/v1/foundation/identity/probes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`Smoke ${mode}`,mode})});
 if(mode==='poison') await eventually(async()=>{const now=await request('/api/v1/foundation/status');return now.every((s,index)=>s.deadLetters>before[index].deadLetters);});
 else await eventually(async()=>{const states=await Promise.all(names.map(name=>request(`/api/v1/foundation/${name}/probes/${probe.probeId}`)));return states.every(state=>state?.effects===1);});
 console.log(`PASS ${mode} ${probe.correlationId}`);
}
status=await request('/api/v1/foundation/status');assert.ok(status.every(service=>service.processedEvents>=2));
const invalid=await fetch(`${base}/api/v1/foundation/identity/probes`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"mode":"invalid"}'});assert.equal(invalid.status,400);
const gateways=new Set();for(let i=0;i<8;i++){const r=await fetch(`${base}/health/live`);gateways.add(r.headers.get('x-gateway-instance'));}assert.equal(gateways.size,2);
console.log('PASS Phase 1: 5 services, real Kafka, transactions, retry, DLQ, 2 gateways');
