# skwyd hub

skwyd hub: back office, POS (Android APK) and multi-brand online ordering for restaurants, running on Supabase.

| Page | What it is |
|---|---|
| `index.html` | Back office: dashboard, menu, inventory, call center, devices, online ordering settings |
| `apps/pos` | POS (React Native). The Android APK (`/skwydhub-pos.apk`) is built by the pos-rn workflow; a web copy for testing is at dev.pos.skwydhub.com |
| `order.html` | Public online ordering (delivery, takeaway, dine-in via table QR: `order.html?brand=<id>&branch=<id>&table=<n>`) |
| `hub.html` | Skwyd Hub admin (admin.skwydhub.com): businesses, subscriptions, invoices |
| `signup.html` | Free-trial sign-up |
| `team.html` | SKWYD Team and SKWYD Driver apps (built into Android APKs) |
| `track.html` | Delivery tracking and rating page (order.skwydhub.com/track/…) |
| `wokdb.js` | Supabase connection and staff login |

The back office, admin and online ordering are on Cloudflare Pages (`scripts/build-web.sh`).

Database: the live schema snapshot and every change since are in `supabase/` (applied as Supabase migrations).
The Supabase key in `wokdb.js` is the public (publishable) key; data is protected by row-level security.
