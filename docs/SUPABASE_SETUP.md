# Supabase Setup Guide for SmartInvest Africa

## Overview
This guide explains how to set up and configure Supabase for SmartInvest Africa's PostgreSQL database, authentication, storage, and real-time features.

## Why Supabase?
- **Serverless PostgreSQL**: Auto-scaling with built-in connection pooling
- **Built-in Auth**: Email, OAuth, magic links out of the box
- **Real-time**: PostgreSQL changes streamed to clients
- **Storage**: S3-compatible file storage with CDN
- **Free Tier**: 500MB database, 1GB file storage, 2GB bandwidth
- **No Infrastructure**: No servers to manage
- **POPIA/GDPR Compliant**: Data residency options available

## Prerequisites
- Supabase account (sign up at https://supabase.com)
- Basic understanding of PostgreSQL
- Node.js and npm installed

## Step 1: Create Supabase Project

### Using Supabase Dashboard

1. **Sign Up / Login**
   - Go to https://app.supabase.com
   - Create account or sign in

2. **Create New Project**
   - Click "New Project"
   - **Organization**: Select or create organization
   - **Project Name**: `SmartInvest Africa`
   - **Database Password**: Generate strong password (save securely!)
   - **Region**: Choose closest to your users:
     - **South Africa**: `af-south-1` (Cape Town)
     - **Europe**: `eu-west-1` (Ireland) for GDPR
     - **US East**: `us-east-1` (Virginia)
   - **Pricing Plan**: 
     - Start with Free tier (500MB DB, perfect for development)
     - Scale to Pro ($25/mo) when ready (8GB DB, daily backups)
     - Enterprise for compliance/SLA needs

3. **Wait for Project Setup**
   - Takes 1-2 minutes to provision
   - PostgreSQL 15.x with optimized extensions
   - Connection pooling via PgBouncer automatically configured

## Step 2: Get Connection Strings

### Database Connection

1. **Navigate to Project Settings**
   - Click gear icon → Database
   
2. **Connection Info Section**
   
   **Connection String (Pooled)** - Use for application queries:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

   **Connection String (Direct)** - Use for migrations only:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```

3. **Copy to .env**
   ```bash
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:PASSWORD@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[PROJECT-REF]:PASSWORD@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   ```

### API Credentials

1. **Navigate to Project Settings → API**
   
2. **Copy Keys**:
   ```bash
   SUPABASE_URL="https://[PROJECT-REF].supabase.co"
   SUPABASE_ANON_KEY="eyJhbGc..." # Public, safe for client-side
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..." # Secret, server-side only!
   ```

## Step 3: Run Database Migrations

1. **Install Prisma CLI** (if not already installed):
   ```bash
   npm install -D prisma
   ```

2. **Push Prisma Schema to Supabase**:
   ```bash
   # This creates all tables, relations, indexes
   npx prisma db push
   ```

3. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

4. **Seed Database** (optional):
   ```bash
   npx prisma db seed
   ```

## Step 4: Configure Supabase Storage

### Create Storage Bucket for File Uploads

1. **Navigate to Storage**
   - Click Storage icon in sidebar

2. **Create New Bucket**
   - Name: `smartinvest-uploads`
   - **Public**: No (files require authentication)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: 
     - `image/*` for images
     - `application/pdf` for documents

3. **Set Storage Policies** (Row Level Security):
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'smartinvest-uploads');

   -- Users can only read their own files
   CREATE POLICY "Users can read own files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (auth.uid()::text = (storage.foldername(name))[1]);

   -- Users can delete their own files
   CREATE POLICY "Users can delete own files"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (auth.uid()::text = (storage.foldername(name))[1]);
   ```

## Step 5: Configure Authentication

### Email Authentication

1. **Navigate to Authentication → Settings**

2. **Configure Email Templates**
   - Customize confirmation email
   - Customize password reset email
   - Add SmartInvest branding

3. **Email Settings**:
   - **From Email**: `noreply@smartinvest.africa`
   - **SMTP Provider**: Use custom SMTP or Supabase built-in
   - For production: Use SendGrid, AWS SES, or Mailgun

### OAuth Providers (Optional)

Enable social login:
- Google OAuth
- GitHub OAuth
- Microsoft OAuth
- Apple OAuth

Configure callback URLs:
```
https://yourdomain.com/auth/callback
https://[PROJECT-REF].supabase.co/auth/v1/callback
```

### Password Policy

Configure in Authentication → Settings → Password Policy:
- Minimum length: 12 characters
- Require uppercase, lowercase, number, symbol
- Password strength: Strong

## Step 6: Security & Compliance

### Row Level Security (RLS)

Enable RLS on all tables:

```sql
-- Example: Enable RLS on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data
CREATE POLICY "Users can view own profile"
ON "User" FOR SELECT
USING (auth.uid()::text = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own profile"
ON "User" FOR UPDATE
USING (auth.uid()::text = id);
```

### Database Backups

**Automatic Daily Backups** (Pro plan):
- Point-in-time recovery (7 days)
- Stored in separate region
- One-click restore

**Manual Backups**:
```bash
# Export database
pg_dump "postgresql://postgres.[PROJECT-REF]:PASSWORD@aws-0-[REGION].pooler.supabase.com:5432/postgres" > backup.sql

# Import database
psql "postgresql://postgres.[PROJECT-REF]:PASSWORD@aws-0-[REGION].pooler.supabase.com:5432/postgres" < backup.sql
```

### Database Monitoring

1. **Navigate to Database → Logs**
   - View query performance
   - Identify slow queries
   - Monitor connection pooling

2. **Performance Tab**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Active connections

3. **Set Up Alerts** (Pro plan):
   - High CPU usage
   - Storage reaching limit
   - Connection pool saturation

## Step 7: Production Checklist

### Before Going Live

- [ ] Enable database backups (Pro plan)
- [ ] Configure custom domain (e.g., `api.smartinvest.africa`)
- [ ] Set up Row Level Security on all tables
- [ ] Enable email rate limiting
- [ ] Configure allowed redirect URLs
- [ ] Set up monitoring and alerts
- [ ] Test failover scenarios
- [ ] Review and optimize slow queries
- [ ] Enable 2FA for admin accounts
- [ ] Document database schema
- [ ] Set up staging environment

### Security Best Practices

1. **Never expose service role key in client code**
   - Use anon key for client
   - Use service role only on server

2. **Always use RLS**
   - Don't rely on application-level security alone
   - Database enforces access control

3. **Validate inputs**
   - Use Prisma for parameterized queries
   - Sanitize user inputs

4. **Monitor logs**
   - Review authentication logs
   - Check for unusual patterns

## Step 8: Local Development

### Supabase CLI (Optional but Recommended)

1. **Install CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Initialize Local Project**:
   ```bash
   supabase init
   ```

3. **Start Local Supabase**:
   ```bash
   supabase start
   ```
   
   This spins up local PostgreSQL, Auth, Storage, and Realtime on Docker.

4. **Link to Remote Project**:
   ```bash
   supabase link --project-ref [YOUR-PROJECT-REF]
   ```

5. **Pull Remote Schema**:
   ```bash
   supabase db pull
   ```

## Costs & Pricing

### Free Tier
- **Database**: 500 MB
- **Storage**: 1 GB
- **Bandwidth**: 2 GB
- **Monthly Active Users**: Unlimited
- **Perfect for**: Development, small projects

### Pro Plan ($25/month)
- **Database**: 8 GB (+ $0.125/GB)
- **Storage**: 100 GB (+ $0.021/GB)
- **Bandwidth**: 250 GB (+ $0.09/GB)
- **Daily backups**: 7-day point-in-time recovery
- **Perfect for**: Production startups

### Enterprise
- Custom pricing
- Dedicated resources
- SLA guarantees
- POPIA/GDPR compliance support
- Priority support

## Cost Estimate for SmartInvest Africa

**Starting Phase** (Free tier):
- **Cost**: $0/month
- **Users**: Up to 10,000
- **Database**: 500 MB

**Growth Phase** (Pro plan):
- **Base**: $25/month
- **Additional DB**: ~$5/month (5 GB extra)
- **Additional storage**: ~$5/month (100 GB files)
- **Total**: ~$35/month

**Scale Phase** (Pro + overages):
- **Base**: $25/month
- **Database**: $25/month (200 GB)
- **Storage**: $10/month (500 GB)
- **Bandwidth**: $20/month (200 GB extra)
- **Total**: ~$80/month

## Support & Resources

- **Documentation**: https://supabase.com/docs
- **Discord Community**: https://discord.supabase.com
- **GitHub**: https://github.com/supabase/supabase
- **Status Page**: https://status.supabase.com
- **Email Support**: Pro/Enterprise plans

## Migration from AWS RDS

If migrating from existing RDS:

1. **Export RDS Database**:
   ```bash
   pg_dump -h your-rds-endpoint.amazonaws.com -U username -d smartinvest > backup.sql
   ```

2. **Import to Supabase**:
   ```bash
   psql "postgresql://postgres.[PROJECT-REF]:PASSWORD@aws-0-[REGION].pooler.supabase.com:5432/postgres" < backup.sql
   ```

3. **Update Connection Strings** in `.env`

4. **Test thoroughly** before switching traffic

## Compliance & Data Residency

### POPIA (South Africa)
- Use `af-south-1` (Cape Town) region
- Data stays in South Africa
- Compliant with POPIA requirements

### GDPR (EU)
- Use `eu-west-1` (Ireland) region
- Data Processing Agreement available
- GDPR-compliant by default

### NDPR (Nigeria)
- Use closest region
- Consider data localization requirements
- Enable audit logging

### Kenya DPA
- Use `af-south-1` for African data residency
- Implement data protection controls
- Enable Row Level Security

## Troubleshooting

### Connection Issues
- Check firewall rules
- Verify connection string format
- Ensure password is URL-encoded
- Try direct connection (port 5432) for debugging

### Migration Errors
- Use `DIRECT_URL` for migrations
- Don't use connection pooling for schema changes
- Check for syntax differences between Postgres versions

### Performance Issues
- Enable connection pooling (port 6543)
- Index frequently queried columns
- Use `EXPLAIN ANALYZE` for slow queries
- Consider database size upgrade

---

**Next Steps**: 
1. Create your Supabase project
2. Update `.env` with connection strings
3. Run `npx prisma db push` to create tables
4. Start building! 🚀
