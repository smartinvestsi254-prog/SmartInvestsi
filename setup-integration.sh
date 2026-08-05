#!/bin/bash

# SmartInvest Workflow & Licensing Integration Setup Script

echo "🚀 Starting SmartInvestsi Integration Setup..."

# Step 1: Install dependencies
echo ""
echo "📦 Step 1: Installing dependencies..."
npm install

# Step 2: Generate Prisma client
echo ""
echo "🔧 Step 2: Generating Prisma client..."
npx prisma generate

# Step 3: Check if DATABASE_URL is set
echo ""
echo "🔍 Step 3: Checking environment..."
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  WARNING: DATABASE_URL not set!"
  echo "Please create a .env file with:"
  echo "DATABASE_URL=\"postgresql://user:password@localhost:5432/smartinvest\""
  echo ""
  read -p "Would you like to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 4: Run migrations (if database is ready)
echo ""
echo "💾 Step 4: Running database migrations..."
npx prisma migrate dev --name workflow_licensing_integration || {
  echo "⚠️  Migration failed. Make sure DATABASE_URL is correct and database is accessible."
  echo "You can run migrations later with: npx prisma migrate dev"
}

# Step 5: Build TypeScript
echo ""
echo "🔨 Step 5: Building TypeScript..."
npm run build

# Step 6: Done
echo ""
echo "✅ Integration setup complete!"
echo ""
echo "To start the server:"
echo "  npm start          # Production mode"
echo "  npm run dev        # Development mode"
echo ""
echo "API will be available at: http://localhost:3001"
echo ""
echo "📚 Documentation:"
echo "  - WORKFLOW_LICENSING_INTEGRATION.md"
echo "  - INTEGRATION_COMPLETE.md"
echo ""
