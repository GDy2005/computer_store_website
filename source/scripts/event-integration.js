// Run inside identity-service: tests only its owned database, plus broker/API.
import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {kafkaClient} from '@store/kafka-client';
import {createEvent} from '@store/event-contracts';
import {eventually} from '@store/test-utils';
import {processOnce} from '@store/service-runtime';
const connection=await mongoose.createConnection(process.env.MONGODB_URI,{dbName:'identity_db'}).asPromise();
const schema=new mongoose.Schema({probeId:{type:String,unique:true},effects:Number});
const Probe=connection.model('IntegrationProbe',schema,'foundation_probes');
const Processed=connection.model('IntegrationProcessed',new mongoose.Schema({eventId:String,consumer:String,processedAt:Date}),'processed_events');
const Outbox=connection.model('IntegrationOutbox',new mongoose.Schema({eventId:String,payload:mongoose.Schema.Types.Mixed}),'outbox_events');
const id=randomUUID();
const producer=kafkaClient('foundation-integration-test').producer();await producer.connect();
try {
 await assert.rejects(connection.transaction(async session=>{await Probe.create([{probeId:id,effects:0}],{session});await Outbox.create([{eventId:id,payload:{}}],{session});throw new Error('rollback test');}));
 assert.equal(await Probe.countDocuments({probeId:id}),0);assert.equal(await Outbox.countDocuments({eventId:id}),0);
 console.log('PASS real MongoDB transaction rollback (effect + outbox)');
 const event=createEvent('foundation.probe.v1',{producer:'identity-service',key:id,payload:{probeId:id,message:'duplicate integration',mode:'normal'}});
 await producer.send({topic:'foundation.probe.v1',messages:[{key:id,value:JSON.stringify(event)},{key:id,value:JSON.stringify(event)}]});
 await eventually(async()=>{const result=await fetch('http://nginx/api/v1/foundation/status');if(!result.ok)return false;const data=(await result.json()).data;return data.every(service=>service.processedEvents>=1)&&Probe.findOne({probeId:id}).then(probe=>probe?.effects===1);});
 await new Promise(resolve=>setTimeout(resolve,2000));
 const names=['identity','catalog','order','notification','analytics'];
 for(const name of names){const response=await fetch(`http://nginx/api/v1/foundation/${name}/probes/${id}`);assert.equal((await response.json()).data.effects,1);}
 console.log('PASS duplicate Kafka delivery creates exactly one local effect in all five services');
 // Simulate DB commit followed by missing offset acknowledgement, then replay.
 const replayId=randomUUID(),replayEvent={eventId:replayId},consumer='foundation-crash-replay-test';
 const handler=async(value,session)=>Probe.updateOne({probeId:replayId},{$inc:{effects:1}},{upsert:true,session});
 await processOnce(connection,Processed,replayEvent,consumer,handler);
 assert.equal(await processOnce(connection,Processed,replayEvent,consumer,handler),false);
 assert.equal((await Probe.findOne({probeId:replayId})).effects,1);
 console.log('PASS replay after DB commit without offset commit is idempotent (real transaction)');
}finally{await producer.disconnect();await connection.close();}
