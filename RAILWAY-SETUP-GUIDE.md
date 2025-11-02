# Railway PocketBase Setup Guide - Simple Steps

## What We're Fixing
Your push notifications aren't working because PocketBase isn't loading the hooks. We need to tell it where to find them.

## What I've Already Done For You ✅
1. ✅ Added a test endpoint (`/hooks_ping`) to your notifications.js
2. ✅ Created a startup script (`start-pocketbase-with-hooks.sh`)
3. ✅ Your hooks are ready in the `hooks/` folder

## What You Need to Do in Railway (5 minutes)

### Step 1: Open Railway Dashboard
1. Go to https://railway.app/
2. Click on your project
3. Find the **pocketbase** service (should be named "pocketbase" or similar)

### Step 2: Update the Start Command
1. Click on the **pocketbase** service
2. Click on **Settings** tab (on the left sidebar)
3. Scroll down to find **Start Command** or **Custom Start Command**
4. Click on it to edit
5. Replace whatever is there with this EXACT command:

```bash
/pb/pocketbase serve --dir /pb/pb_data --hooksDir /pb/pb_data/pb_hooks --http 0.0.0.0:${PORT:-8080}
```

6. Click **Save** or press Enter

### Step 3: Add Environment Variables (if not already set)
Still in the Settings tab, look for **Variables** section:

Make sure these 3 variables exist:
- `SUPABASE_NOTIFICATIONS_URL` - Your Supabase function URL
- `SUPABASE_NOTIFICATIONS_SECRET` - Secret for authentication  
- `SUPABASE_ANON_KEY` - Your Supabase anon key

If any are missing, add them.

### Step 4: Deploy the Hooks
Since Railway might not have the hooks in the container, we need to copy them manually ONE TIME:

1. Click on the **pocketbase** service
2. Look for a **Shell** or **Terminal** tab/button
3. If you see it, click it and run these commands:

```bash
mkdir -p /pb/pb_data/pb_hooks
```

Then you'll need to manually copy the hooks file. If Railway doesn't have a shell, continue to Step 5.

### Step 5: Redeploy
1. Click on the **pocketbase** service
2. Click on the **Deployments** tab
3. Click the **⋮** (three dots) menu on the latest deployment
4. Click **Redeploy**
5. Wait for deployment to complete (usually 1-2 minutes)

### Step 6: Test It!
After deployment completes, run this command in your local terminal:

```bash
curl https://pocketbase-production-8501.up.railway.app/hooks_ping
```

**Expected Result:**
```json
{"ok":true,"message":"PocketBase hooks are loaded and working!","timestamp":"..."}
```

**If you get 404:** The hooks still aren't loading. Contact me and I'll help troubleshoot.

**If you get the success message:** 🎉 Hooks are working! Push notifications should now work!

---

## Alternative: Use the Startup Script

If the above doesn't work, there's an easier way - use the startup script I created:

1. Push the changes I made to your git repo:
   ```bash
   git add .
   git commit -m "Add PocketBase hooks startup script"
   git push
   ```

2. In Railway, change the Start Command to:
   ```bash
   sh /app/start-pocketbase-with-hooks.sh
   ```

3. Redeploy

---

## Testing Push Notifications

Once `/hooks_ping` works, test push notifications:

1. Open Railway logs:
   ```bash
   railway logs --service pocketbase
   ```

2. Send a message in your app

3. You should see in the logs:
   ```
   [push] message:new
   [push] response 200
   ```

If you see those, **it's working!** 🎉

---

## Quick Troubleshooting

### Problem: 404 on /hooks_ping
**Solution:** PocketBase didn't load hooks. Double-check the Start Command includes `--hooksDir /pb/pb_data/pb_hooks`

### Problem: "File not found" error
**Solution:** The hooks file isn't in the container. You need to either:
- Use the startup script method above, OR
- Manually copy hooks via Railway shell

### Problem: Logs show "SUPABASE_NOTIFICATIONS_URL not set"
**Solution:** Add the environment variable in Railway Settings

---

## Need Help?
If anything doesn't work, let me know and tell me:
1. What you see when you curl `/hooks_ping`
2. Copy/paste any error messages from Railway logs
3. Screenshot of your Railway Start Command setting

I'll get it working!

