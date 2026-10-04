export function log(level, message, context = {}) {
  console.log(JSON.stringify({time: new Date().toISOString(), level, message, ...context}));
}
