import express from "express";
import cookieParser from "cookie-parser";
import { createSecurityMiddleware } from "@smartinvest/shared-security";
import { getAllowedOrigins } from "@smartinvest/shared-utils";
import { env } from "./config/env";

// Route modules
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profiles.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import paymentRoutes from "./routes/payments.routes";
import portfolioRoutes from "./routes/portfolio.routes";
import tradingRoutes from "./routes/trading.routes";
import walletRoutes from "./routes/wallet.routes";
import kycRoutes from "./routes/kyc.routes";
import referralRoutes from "./routes/referrals.routes";
import notificationRoutes from "./routes/notifications.routes";
import supportRoutes from "./routes/support.routes";
import adminRoutes from "./routes/admin.routes";
import analyticsRoutes from "./routes/analytics.routes";
import marketDataRoutes from "./routes/market-data.routes";
import aiAssistantRoutes from "./routes/ai-assistant.routes";
import fraudRoutes from "./routes/fraud.routes";

const app = express();

app.set("trust proxy", 1);

// Security middleware: helmet + cors + rate limiting
app.use(
  createSecurityMiddleware({
    allowedOrigins: getAllowedOrigins([
      "http://localhost:3000",
      "http://localhost:4000",
      "https://smartinvestsi.netlify.app",
    ]),
    environment: env.NODE_ENV,
    rateLimitMax: env.RATE_LIMIT_MAX,
    trustProxy: true,
  })
);

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use(express.raw({ limit: "1mb" }));
app.use(cookieParser());

// Health check
app.get("/health", (_req, res) => {
  res.json({ service: "smartinvestsi", status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/trading", tradingRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/market-data", marketDataRoutes);
app.use("/api/ai", aiAssistantRoutes);
app.use("/api/fraud", fraudRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = err.statusCode || 500;
  console.error("[Error]", err);
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? "An internal error occurred" : err.message,
  });
});

export default app;
</content>
