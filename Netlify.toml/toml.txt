[build]
  publish = "public"          # change to 'dist' if React/Vite
  command = "npm run build"   # or leave blank for static HTML

[functions]
  directory = "netlify/functions"

[build.environment]
  NODE_ENV = "production"