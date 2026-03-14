# SmartInvest Backend API

ASP.NET Core Web API for SmartInvest platform.

## Features

- User authentication and authorization
- Investment calculations
- Payment processing
- Marketplace services
- Admin dashboard
- Compliance and security services

## Prerequisites

- .NET 8.0 or later
- SQL Server or compatible database

## Setup

1. Navigate to backend directory
2. Restore packages: `dotnet restore`
3. Update database: `dotnet ef database update`
4. Run: `dotnet run`

## Configuration

Update `appsettings.json` with:
- Database connection string
- JWT settings
- Email SMTP
- External service URLs

## Deployment

Deploy to Azure App Service, AWS Elastic Beanstalk, or similar platform.

For Netlify deployment recommendations, consider using .NET functions for serverless, but for full API, separate deployment is recommended.