# 🚀 Deployment Guide: Ktewfew Game

## 1. GitHub & Vercel Deployment
**GitHub**:
Authentication for `gh` CLI was not available. Run these commands to push your code:
1.  `gh auth login` (or ensure your SSH keys are set up)
2.  `gh repo create Ktewfew-Game --public --source=. --remote=origin --push`

**Vercel**:
1.  Go to [Vercel Dashboard](https://vercel.com/dashboard)
2.  **Add New Project** -> Import `Ktewfew-Game`
3.  **Settings**:
    *   Framework: Vite
    *   Root Directory: `webapp`
    *   Build Command: `bun run build`
    *   Output Directory: `dist`
4.  Click **Deploy**.
5.  **Copy the Vercel URL** (e.g., `https://ktewfew.vercel.app`).

## 2. Android APK
The project is set up with **Capacitor**.
**Requirement**: You need Android Studio (and Java/JDK) installed.
1.  Run: `cd webapp && bun cap sync`
2.  Open Project: `bun cap open android`
3.  **In Android Studio**:
    *   Wait for Gradle sync.
    *   Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
    *   Locate the APK in `webapp/android/app/build/outputs/apk/debug/`.

## 3. Telegram Mini App Setup
1.  Open **Telegram** and search for **@BotFather**.
2.  Send command: `/newbot`
3.  Follow prompts (Name: `Ktewfew`, Username: `KtewfewBot`).
4.  **Important**: Enable the "Menu Button" for the game.
    *   Send `/mybots`
    *   Select your bot.
    *   Select **Bot Settings** > **Menu Button** > **Configure Menu Button**.
    *   Send the **Vercel URL** you copied earlier (e.g., `https://ktewfew.vercel.app`).
    *   Give it a name (e.g., "Play Now").
5.  **Done!** Users can now chat with your bot and click "Play Now" to launch the game inside Telegram.

## 4. Troubleshooting
*   **Camera Permissions**: On Android/Telegram, ensure permission is granted.
*   **Black Screen**: Check if your Vercel URL has `https`. Telegram requires HTTPS.
