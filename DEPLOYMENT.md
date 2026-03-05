# Deploying AnonChat to Render.com (Permanent Hosting)

Follow these steps to make your anonymous chat app stay online 24/7 for free.

## Step 1: Prepare your Code
1. Download all files from this AI Studio project to your computer.
2. Create a new repository on [GitHub](https://github.com) and upload the files there.

## Step 2: Create a Render Account
1. Go to [Render.com](https://render.com) and sign up (using your GitHub account is easiest).

## Step 3: Create a New Web Service
1. Click the **"New +"** button and select **"Web Service"**.
2. Connect your GitHub repository.
3. Use the following settings:
   - **Name:** `anonchat` (or whatever you like)
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server.ts`
   - **Instance Type:** `Free`

## Step 4: Set Environment Variables
In the Render dashboard for your new service, go to the **"Environment"** tab and add:
- `NODE_ENV`: `production`

## Step 5: Deploy
1. Click **"Create Web Service"**.
2. Render will build your app. Once finished, it will give you a URL like `https://anonchat.onrender.com`.

---

### Why this is better:
- **Stays Online:** It won't go down when you close AI Studio.
- **Custom Domain:** You can go to the "Settings" tab in Render and add a domain like `anonchat.com` if you buy one!
