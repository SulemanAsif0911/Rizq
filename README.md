# Rizq: Food Rescue Platform (رزق)

Donors post surplus food, verified NGOs claim it, volunteers deliver it. Every step is tracked and counted.

**Stack:** Android app (Capacitor WebView, same format as your BoardArena APK) + Node/Express + SQLite API.
**Roles:** donor, receiver (NGO, needs admin verification), volunteer, admin.

## 1. Run it on your laptop (5 minutes)
1. Install Node.js 20 from nodejs.org.
2. In the `server` folder, copy `.env.example` to `.env`, then run:
   `npm install` then `ADMIN_PHONE=03001234567 ADMIN_PASS=YourStrongPass JWT_SECRET=anylongrandomtext node server.js`
3. Open http://localhost:3000. The same server also hosts the app, so this works as a website right away.
4. Test the full flow with 4 browser tabs (use a private window per role): register a donor, a receiver, a volunteer, and sign in as the admin (the phone and password from step 2). Post food, verify the NGO, claim, pick up, deliver. Check the Impact tab.

## 2. Put the server online (free, about 10 minutes)
1. Create a GitHub account and a new repository. Upload this whole folder.
2. On render.com choose New > Web Service, connect the repo, and set: Root Directory `server`, Build `npm install`, Start `node server.js`.
3. Add environment variables: `JWT_SECRET`, `ADMIN_PHONE`, `ADMIN_PASS`, and `DB_FILE=/var/data/rizq.db`.
4. Add a Disk mounted at `/var/data` (a paid add-on). Without a disk, free hosting wipes SQLite on every restart. That is fine for a class demo but not for real users.
5. Copy your live address (like https://rizq.onrender.com).

## 3. Build the APK (no Android Studio needed)
1. Open `app/www/config.js` and set `window.API_BASE = "https://your-live-address";` then commit.
2. On GitHub open the Actions tab > Build APK > Run workflow. It takes about 5 minutes.
3. Open the finished run, download the `Rizq-apk` artifact, unzip it, and send `app-debug.apk` to phones. Allow "install unknown apps" when asked.
4. Whenever you edit the app, commit again and a fresh APK builds automatically.

For Google Play you will later need a signed release build, a developer account (one-time fee) and a privacy policy.

## 4. Run it like a real platform: first 30 days
**Before launch**
- Pick ONE neighbourhood. Dense and small beats big and thin.
- Sign in as admin and keep the admin phone and password private.
- Write a one-page verification checklist for NGOs: registration or recognition proof, a physical visit or video call, a reference, a named contact person. Only then press Verify in the Verify tab.
- Write simple food-safety rules and show them to donors: freshly cooked or sealed food only, nothing from plates, note cooking time, deliver within 2 to 4 hours, keep hot food hot and covered. Check current Punjab Food Authority guidance and adapt your rules to it.

**Week 1 to 2: recruit the first supply**
- Target 5 donors (wedding halls and restaurants with regular surplus), 3 verified NGOs, 5 volunteers (university societies are ideal).
- Visit donors in person. Pitch: free pickup, zero waste, a printable impact report for their CSR or reputation.
- Create their accounts together on their phone.

**Week 3 to 4: operate**
- Daily: check the Verify tab, watch for posts nobody claims (call a nearby NGO), and ask each finished donor for feedback.
- Weekly: collect meals delivered, donors active, claim time, and share a short impact post on social media.

**Numbers to track (your project's KPIs)**
| Metric | Pilot goal |
|---|---|
| Meals delivered | 1,000 |
| Active donors / NGOs / volunteers | 5 / 3 / 5 |
| Average time from post to claim | under 30 min |
| Posts that expire unclaimed | under 15% |

**Legal and trust (talk to a lawyer or your university's incubator)**
- Publish a privacy policy and terms, including donor responsibility for food safety.
- Register as a company or partner with a registered NGO before charging anyone.

## 5. Business model rollout (what to say in your project)
1. Months 1 to 3: free for everyone, to build supply and trust.
2. Then: monthly subscription for wedding halls and hotels (impact reports, priority pickup).
3. Then: corporate CSR sponsorship of meals, and a discounted end-of-day surplus marketplace with delivery fee.

## 6. Honest status: built now vs next
**Working now:** accounts, roles, NGO verification, posting, atomic claiming (no double claims), volunteer or self pickup, delivery confirmation, distance display, expiry countdown, live impact numbers, printable donor report, login rate limiting.
**Not built yet (be upfront with your teacher):** online payments (JazzCash or Easypaisa), photo upload, push notifications, the paid surplus marketplace, and automatic nearest-match (listings show distance instead). Next engineering steps: Postgres instead of SQLite, push notifications, photos.

## 7. Three-minute demo script
1. "Pakistan wastes food while people go hungry." One sentence on the problem.
2. Show the donor posting a wedding surplus (20 seconds).
3. Switch to the NGO phone: it appears, claim it.
4. Volunteer takes it, delivers, marks done.
5. Show the Impact tab update live, then the revenue plan (section 5).
