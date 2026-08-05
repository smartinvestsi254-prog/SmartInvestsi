// client-side monitoring script
// sends uncaught errors and unhandled promise rejections to server

window.addEventListener('error', function(event) {
  try {
    fetch('/api/monitor/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error && event.error.stack
      })
    });
  } catch (e) { console.error('monitor send failed', e); }
});

window.addEventListener('unhandledrejection', function(event) {
  try {
    fetch('/api/monitor/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: event.reason && event.reason.message ? event.reason.message : String(event.reason),
        stack: event.reason && event.reason.stack ? event.reason.stack : undefined
      })
    });
  } catch (e) { console.error('monitor send failed', e); }
});
