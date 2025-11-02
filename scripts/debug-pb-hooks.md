# PocketBase Hooks Debugging Guide

## Step A: Test if hooks are loading

### 1. SSH into PocketBase container
```bash
railway ssh --service pocketbase
```

### 2. Create probe hook
```bash
mkdir -p /pb/pb_data/pb_hooks
cat > /pb/pb_data/pb_hooks/00_probe.js <<'EOF'
routerAdd('GET', '/hooks_ping', (c) => c.json({ ok: true }))

onRecordAfterCreateRequest((e) => {
  try { console.log('[probe] afterCreate', e.collection?.name || 'unknown', e.record?.id || null) } catch {}
})
EOF
exit
```

### 3. Restart PocketBase
```bash
railway redeploy --service pocketbase --yes
```

### 4. Test the probe
```bash
# Should return: {"ok":true}
curl -sS https://pocketbase-production-8501.up.railway.app/hooks_ping
```

### 5. Watch logs
```bash
railway logs --service pocketbase
```
Then send a DM - you should see `[probe] afterCreate messages <id>`

---

## Step B: Force-load hooks (if Step A returns 404)

### 1. Check current PB process
```bash
railway ssh --service pocketbase
readlink -f /proc/1/cwd
tr '\0' ' ' </proc/1/cmdline; echo
exit
```

### 2. Test hooks with explicit hooksDir
```bash
railway ssh --service pocketbase
apk add --no-cache curl >/dev/null
/pb/pocketbase serve --dir /pb/pb_data --hooksDir /pb/pb_data/pb_hooks --http 0.0.0.0:8090 >/tmp/pb8090.log 2>&1 &
sleep 1
curl -sS http://127.0.0.1:8090/hooks_ping
# Should return: {"ok":true}
exit
```

### 3. Update Railway Start Command
In Railway UI, set the Start Command to:
```bash
/pb/pocketbase serve --dir /pb/pb_data --hooksDir /pb/pb_data/pb_hooks --http 0.0.0.0:8080
```

Then redeploy and test `/hooks_ping` again.

---

## Step C: Install notifications hook (after probe works)

### 1. SSH and create notifications hook
```bash
railway ssh --service pocketbase
cat > /pb/pb_data/pb_hooks/notifications.js <<'EOF'
const URL = $os.getenv('SUPABASE_NOTIFICATIONS_URL') || ''
const SECRET = $os.getenv('SUPABASE_NOTIFICATIONS_SECRET') || ''
const ANON = $os.getenv('SUPABASE_ANON_KEY') || ''

function post(notifications) {
  if (!URL || !Array.isArray(notifications) || notifications.length === 0) return
  const headers = { 'Content-Type': 'application/json' }
  if (ANON) { headers.Authorization = `Bearer ${ANON}`; headers.apikey = ANON }
  if (SECRET) { headers['x-push-secret'] = SECRET }
  try {
    const res = $http.send({ method: 'POST', url: URL, headers, body: JSON.stringify({ notifications }) })
    console.log('[push] response', res.statusCode)
    if (res.statusCode >= 300) console.log('[push] error', res.raw)
  } catch (err) { console.log('[push] request error', String(err)) }
}

function nameOf(id){ try{ const u=$app.dao().findFirstRecordByFilter('users',`id = "${id}"`); return (u?.get('name')||u?.get('userName')||'Someone') }catch{ return 'Someone' } }
function trunc(s,n){ if(!s) return ''; return s.length<=n?s:(s.slice(0,n-1)+'…') }

onRecordAfterCreateRequest((e)=>{
  if (!URL) return
  if (e.collection?.name !== 'messages') return
  const r = e.record; const conv = r.get('conversation'); const sender = r.get('sender')
  if (!conv || !sender) return

  const ms = $app.dao().findRecordsByFilter('memberships', `conversation = "${conv}"`)
  const ids = new Set(); for (const m of ms||[]) { const u=m.get('user'); if (u && u!==sender) ids.add(u) }
  if (ids.size===0) return

  const recips=[]; for (const rid of ids){ try{ const b=$app.dao().findFirstRecordByFilter('blocked_users',`blocker = "${rid}" && blocked = "${sender}"`); if(!b) recips.push(rid) }catch{ recips.push(rid) } }
  if (recips.length===0) return

  const title = (()=>{ const nm=nameOf(sender); const body=trunc(r.get('text')||'',120); return body?`${nm}: ${body}`:`${nm} sent a message` })()
  post([{ recipientIds: recips, title, data: { type:'message:new', conversationId:conv, messageId:r.id, threadId:conv } }])
})
EOF
exit
```

### 2. Redeploy and test
```bash
railway redeploy --service pocketbase --yes
railway logs --service pocketbase   # leave open
# Send a DM and watch for: [push] response 200
```

---

## Required Environment Variables

Make sure these are set in Railway for the pocketbase service:

- `SUPABASE_NOTIFICATIONS_URL` - Your Supabase edge function URL
- `SUPABASE_NOTIFICATIONS_SECRET` - Secret for authentication
- `SUPABASE_ANON_KEY` - Supabase anon key

---

## Troubleshooting Results

✅ **If /hooks_ping returns {"ok":true}**
- Hooks are loading! Proceed to Step C

❌ **If still 404 after --hooksDir test**
- PB binary may not have scripting support
- Consider: swap binary or deploy sidecar worker

---

## Next Steps

1. Start with Step A
2. Report back what you see when you curl `/hooks_ping`
3. We'll proceed based on the result

