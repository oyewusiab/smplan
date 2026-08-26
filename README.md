# SM Planner — Sacrament Meeting & Ward Leadership Platform

A modern, dignified, and responsive web platform designed for Latter-day Saint Ward and Branch leadership to manage monthly sacrament meeting planners, weekly agendas, speaker assignments, bulletins, hymns, reminders, and checklists.

---

## 🚀 Quick Start

### 1. Install Dependencies
`ash
npm install
`

### 2. Run Development Server
`ash
npm run dev
`

### 3. Build for Production
`ash
npm run build
`

---

## 🌐 Deploying to Vercel

1. **Push to GitHub**:
   Ensure your code is pushed to your GitHub repository: https://github.com/oyewusiab/smplan.git

2. **Import Project into Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **"Add New Project"** > **"Import from GitHub"**.
   - Select your **smplan** repository.

3. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: ./
   - **Build Command**: 
pm run build
   - **Output Directory**: dist

4. **Environment Variables**:
   Under **Environment Variables**, add:
   - VITE_APPS_SCRIPT_URL: Your deployed Google Apps Script Web App URL (https://script.google.com/macros/s/.../exec)

5. **Deploy**:
   - Click **Deploy**. Vercel will build and assign your production domain.
   - Client-side routing is handled automatically via ercel.json.

---

## 📋 Google Apps Script Deployment

The pps-script/ folder contains the complete Google Apps Script backend:
- database.gs: Table schemas, Google Sheets DB initialization, and CRUD operations.
- pi.gs: RESTful action handlers, role-based access control, authentication, and audit logs.

### To Deploy / Update:
1. Open your target Google Sheet.
2. Go to **Extensions** > **Apps Script**.
3. Copy and paste the contents of pps-script/database.gs and pps-script/api.gs.
4. Click **Deploy** > **New deployment** > **Web app**.
   - **Execute as**: Me
   - **Who has access**: Anyone
5. Copy the Web App URL and set it as VITE_APPS_SCRIPT_URL in your .env or Vercel dashboard.

---

## 🎨 Branding & Customization
- **Logo & Favicon**: Placed in the /public directory (sm_image.png, logo.png, avicon.png).
- **Color Theme**: Dominant Latter-day Saint navy #082749 paired with cyan and slate accents.
