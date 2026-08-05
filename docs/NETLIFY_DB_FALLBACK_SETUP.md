# Netlify Postgres Fallback Setup

## Prerequisites
- Netlify account with Postgres addon enabled (Database > Postgres)
- Supabase project (primary)

## 1. Get Netlify DB URL
1. Netlify Dashboard > Team/Site > Database > Postgres
2. Click \"Connect\" > Copy **Internal connection string**
3. Add to Netlify env vars: `NETLIFY_DB_URL = \"postgres://...\"`
4. Local .env: `NETLIFY_DB_URL=\"postgres://...\"`

## 2. Sync Schema to Netlify DB
```bash
# Temp switch
export DATABASE_URL=$NETLIFY_DB_URL
npx prisma db push
# Reset
export DATABASE_URL=$SUPABASE_URL
```

## 3. Test
Deploy, admin panel > System > Toggle fallback.

Primary auto-switch on Supabase fail (health check fail).

