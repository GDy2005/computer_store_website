export function sendSuccess(
  res,
  {
    status = 200,
    message = 'Request completed successfully',
    data = null
  } = {}
) {
  const target = typeof res.status === 'function'
    ? res.status(status)
    : res;

  return target.json({
    success: true,
    message,
    data
  });
}

export function successPayload({
  message = 'Request completed successfully',
  data = null
} = {}) {
  return {
    success: true,
    message,
    data
  };
}
