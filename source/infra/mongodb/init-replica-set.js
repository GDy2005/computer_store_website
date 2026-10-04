try { rs.status(); } catch (error) {
  if (error.code !== 94 && error.codeName !== 'NotYetInitialized') throw error;
  rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongo:27017'}]});
}
let ready = false;
for (let attempt = 0; attempt < 120; attempt++) {
  if (db.hello().isWritablePrimary) { ready = true; break; }
  sleep(500);
}
if (!ready) throw new Error('MongoDB primary election timed out');
print('rs0 primary ready');
