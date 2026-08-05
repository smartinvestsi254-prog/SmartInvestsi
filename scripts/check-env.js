const required = ['EXCHANGE', 'API_KEY', 'API_SECRET']

const missing = required.filter(k => !process.env[k])

if (missing.length) {
  console.error('Missing env vars:', missing)
  process.exit(1)
}

console.log('Environment variables OK')
