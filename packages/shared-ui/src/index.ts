// ============================================================
// SmartInvestsi & SmartGovern — Shared UI Design System
// ============================================================

export const colors = {
  // Brand
  primary: "#0f766e", // teal
  primaryDark: "#115e59",
  primaryLight: "#14b8a6",
  secondary: "#0369a1",
  accent: "#f59e0b",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0ea5e9",

  // Neutrals
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  textInverse: "#ffffff",
};

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  xxl: "3rem",
};

export const typography = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  h1: "2rem",
  h2: "1.5rem",
  h3: "1.25rem",
  body: "1rem",
  small: "0.875rem",
  xs: "0.75rem",
};

export const radius = {
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  full: "9999px",
};

export const shadows = {
  sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
  md: "0 4px 6px -1px rgba(15, 23, 42, 0.1)",
  lg: "0 10px 15px -3px rgba(15, 23, 42, 0.1)",
};

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
};

export type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  typography: typeof typography;
  radius: typeof radius;
  shadows: typeof shadows;
  breakpoints: typeof breakpoints;
};

export const theme: Theme = { colors, spacing, typography, radius, shadows, breakpoints };

export default theme;
