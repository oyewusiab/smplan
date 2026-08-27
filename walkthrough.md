# Walkthrough — Bishopric Terminology & Tab 2 Analytics Intelligence

We have completed the platform-wide transition from "Pastoral" to "Bishopric", refined recommendation criteria to focus on active members aged 8+, and brought the Newcomer Spotlight to life with `confirmation_date` integration (0–6 months vs. 7–12 months).

---

## 1. Platform-Wide "Bishopric" Renaming
- **UI Labels & Headers**:
  - `MembersPage.tsx`: Renamed subtitle to *"Intelligent membership directory & Bishopric analytics hub"* and notes label to *"Bishopric Notes / Availability"*.
  - `MemberAnalyticsDashboard.tsx`: Renamed header to *"Calendar Year Bishopric Analytics ({selectedYear})"* and section to *"Bishopric Guardrails & Inactivity Alerts"*.
  - `BulletinFormEditor.tsx` & `BulletinWebView.tsx`: Renamed thought/message to *"Bishopric weekly thought"* / *"Message from the Bishopric"*.
  - `memberRosterParsers.ts`: Updated printable roster headers and footers to *"SM Planner Bishopric Management System"*.
  - `permissions.ts` & `memberAnalyticsEngine.ts`: Updated analytics comments, data structures, and function names to `calculateBishopricAlerts` and `BishopricAlertsData`.

---

## 2. Recommendation & Prediction Criteria (Active Members Aged 8+)
- **Analysis & Role Suggestions ([`memberAnalyticsEngine.ts`](file:///c:/Users/FA%20REGISTRY/Desktop/New%20smplan/smplan_1/src/utils/memberAnalyticsEngine.ts))**:
  - All AI candidate recommendations, speaker suggestions, and inactivity checks now filter for members who are:
    1. **`status: 'ACTIVE'`** (or new move-in/convert)
    2. **`age >= 8`** (calculated dynamically from `birthdate`/`birth_date`)
  - Ensures infants and children under 8 are excluded from adult/youth speaking recommendations and inactivity guardrails.

---

## 3. `confirmation_date` Integration & Newcomer Spotlight (0–6m vs. 7–12m)
- **Database & Sheet Normalization ([`apps-script/database.gs`](file:///c:/Users/FA%20REGISTRY/Desktop/New%20smplan/smplan_1/apps-script/database.gs))**:
  - Reads and normalizes `confirmation_date`, `confirmationdate`, and `Confirmation Date` columns in the `MEMBERS_LIST` sheet.
- **Form & Types ([`types/index.ts`](file:///c:/Users/FA%20REGISTRY/Desktop/New%20smplan/smplan_1/src/types/index.ts) & [`MembersPage.tsx`](file:///c:/Users/FA%20REGISTRY/Desktop/New%20smplan/smplan_1/src/pages/MembersPage.tsx))**:
  - Added `confirmation_date` and `confirmationdate` properties to `Member`.
  - Added a dedicated input field for **Confirmation Date (Convert / Baptism)** in the Member Add/Edit modal with real-time confirmation feedback.
- **Newcomer Spotlight Breakdown ([`MemberAnalyticsDashboard.tsx`](file:///c:/Users/FA%20REGISTRY/Desktop/New%20smplan/smplan_1/src/components/members/MemberAnalyticsDashboard.tsx))**:
  - Highlights newcomers within their first year, broken down into two visual categories:
    - **0–6 Months (Recent Converts)**: Fresh converts with confirmation dates, highlighting those with 0 roles to prompt immediate fellowship and talk/prayer assignments.
    - **7–12 Months (1st Year Integration)**: Ongoing tracking to ensure sustained engagement throughout their first year in the ward.

---

## Verification Results
- `npm run build`: Production singlefile bundle (`dist/index.html`) compiled cleanly in 46.19s with **0 errors**.
