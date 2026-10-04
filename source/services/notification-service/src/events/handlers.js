// Foundation handler only; domain handlers belong to their respective phases.
export async function handleProbe(event, session, {Probe, attempt}) {
  if (event.payload.mode === 'poison' || (event.payload.mode === 'retry' && attempt === 0)) throw new Error('Requested foundation failure');
  await Probe.updateOne({probeId: event.payload.probeId}, {$setOnInsert: {message: event.payload.message}, $inc: {effects: 1}}, {upsert: true, session});
}
