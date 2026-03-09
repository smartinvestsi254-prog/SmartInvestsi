# Core Product MVP - Personalized Plan

This update adds a lightweight, client-side personalization flow for SmartInvest.

## What It Does
- Captures user goal, horizon, risk, region, and monthly contribution
- Creates a tailored plan summary and next-best-action cards
- Stores preferences in browser localStorage and syncs to `/api/profile`
- Emits analytics events to `/api/analytics/track`

## Where It Lives
- Dashboard UI section: [dashboard.html](dashboard.html)
- Script: [public/js/onboarding-mvp.js](public/js/onboarding-mvp.js)

## localStorage Keys
- `si_profile_mvp`: JSON payload of the saved plan

## API Endpoints
- `GET /api/profile` - load saved personalization profile
- `POST /api/profile` - save personalization profile
- `POST /api/analytics/track` - onboarding events (`onboarding_view`, `onboarding_saved`)

## Notes
- This is an MVP wiring layer; it does not persist to the database.
- Future step: POST profile data to `/api/profile` and render server-driven recommendations.

## Next Enhancements
- Save profile to backend and sync across devices
- Use profile to tailor product catalog, alerts, and premium resources
- Add impact disclosures and fee breakdowns per product
