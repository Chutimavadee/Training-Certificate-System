# Bangkok University - Training Management & Certification System (EduCert)

A real-time, zero-trust, full-stack training administrative suite featuring cryptographic self-checkins, automated score calculation, professional PDF certification, automated emails, and spreadsheet integration.

---

## 🚀 System Architecture Overview

The system runs as an optimized Single Page Application (SPA) utilizing:
1. **Frontend:** React with TypeScript, Vite, and tailwindcss.
2. **Database & Auth:** Firebase Authentication (Google Identity Provider) and Firestore Database.
3. **External Services:** Google Apps Script (GAS) acting as a serverless gateway to SMTP (MailApp) and Google Sheets.
4. **Deployments:** Netlify (using a headless fallback system) + GitHub actions.

---

## 📥 Installation & Local Development

### 1. Prerequisites
- **Node.js** v20 (LTS) or later
- **npm** v10 or later
- **Firebase CLI** (optional, for direct rules validation)

### 2. Setup Procedure
1. Clone the repository code to your Workspace.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root based on `.env.example`:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_DATABASE_ID=(default)
   VITE_GAS_WEBAPP_URL=https://script.google.com/macros/s/.../exec
   VITE_APP_URL=https://your-app-domain.netlify.app
   ```
4. Spin up the Vite local developer instance:
   ```bash
   npm run dev
   ```

---

## 🔒 Firebase Configuration & Setup

### 1. Google Authentication Setup
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Authentication** > **Sign-in method**.
3. Choose **Google** as the dynamic Identity Provider and toggle **Enable**.
4. Set up your support email, select **Save**, and add the appropriate development and staging web domain origins to the authorized redirect patterns.

### 2. Firestore Setup
1. Navigate to **Cloud Firestore** > **Create database**.
2. Select **Enterprise Edition** or standard single-zone multi-region options.
3. Provision your Firestore database using the `(default)` database identifier.

### 3. Deploy Firestore Security Rules
Overwrite the active `firestore.rules` file in your project with the optimized security schemas verified inside `firestore.rules` and run:
```bash
firebase deploy --only firestore:rules
```

---

## 📜 Google Apps Script Web App Setup

To run transactional notifications without relying on costly paid packages like Firebase Cloud Functions, the system delegates automated emails and spreadsheet synchronizations to a lightweight, CORS-friendly **Google Apps Script Web App**:

1. Create a new Google Spreadsheet in Drive.
2. Click **Extensions** > **Apps Script**.
3. Clear any existing script block and copy the production-ready code found in:
   - **Deployment Settings** > **Apps Script Code Box** inside the EduCert portal's Operations Room page.
4. Save the script project.
5. Choose **Deploy** > **New deployment**.
6. Select **Web app** as the deployment target.
   - **Execute as:** `Me (your google account)`
   - **Who has access:** `Anyone` (This is required for public CORS requests to parse transactional emails).
7. Select **Deploy**, authorize requested permissions for Google Sheets and MailApp, then copy the generated web application URL ending in `/exec`.
8. Assign the copied endpoint URL to `VITE_GAS_WEBAPP_URL` inside your `.env` or Netlify deployment configurations.

---

## 🛠️ GitHub Integration & CI/CD Pipeline

To ensure quality benchmarks are strictly fulfilled before staging production releases, the repository runs a continuous integration script:

- **Path:** `/.github/workflows/ci.yml`
- **Runs on:** Every `push` and `pull_request` targeting `main` or `master` branches in GitHub.
- **Workflow Steps:**
  1. Checks out current codebase.
  2. Bootstraps Node.js LTS Environment.
  3. Installs clean, locked node packages (`npm ci`).
  4. Triggers the compilation of production bundles (`npm run build`).

---

## 🪐 Netlify Deployment Setup

Deploy your compiled Single-Page Application (SPA) instantly to Netlify:

1. Connect your GitHub repository directly to Netlify.
2. Set the build parameters as defined in `/netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Configure **Environment Variables** inside the Netlify Admin cabinet matching `.env.example`.
4. Ensure index.html routing is preserved for SPA routing paths using the provided redirects layout:
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

---

## 🎯 Production Checklist & Verification

Check off these procedures in your administrative staging reviews to guarantee absolute compliance:

- [ ] **Google Identity Provider Enabled:** Google Sign-In is configured on the backend.
- [ ] **Firestore Rules Synchronized:** Overwrite of firestore.rules completed.
- [ ] **Google Apps Script Running:** Exec URL successfully tests live.
- [ ] **Environment Variables set in Hosting Platform:** Correct URLs registered inside Netlify dashboard variables.
- [ ] **Linter Tests are Passing:** Clean compile is validated (`npm run lint`).
- [ ] **Responsive Design Validated:** Tested across dynamic viewports.

---

*Academic Certification Portal Office, Bangkok University.*
