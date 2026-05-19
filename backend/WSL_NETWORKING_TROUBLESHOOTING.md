# WSL Networking Troubleshooting for Neon PostgreSQL

## Problem: ETIMEDOUT When Connecting from WSL to Neon

When running WasteLink backend in WSL and connecting to Neon PostgreSQL, you may see:

```
Error: connect ETIMEDOUT
```

This guide provides step-by-step diagnosis and fixes.

---

## Quick Diagnosis

Run this test to identify the issue:

```bash
# From WSL terminal
wsl -d Ubuntu-22.04 -u localhost8081 bash -c "timeout 5 nc -zv ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech 6432; echo 'Exit code:' $?"
```

**Expected output if working**:
```
succeeded
Exit code: 0
```

**If timeout**:
```
(timeout)
Exit code: 124
```

Then follow steps below.

---

## Solution 1: Restart WSL Network Stack (MOST COMMON FIX)

### Windows PowerShell (as Administrator):

```powershell
# Shutdown all WSL instances
wsl --shutdown

# Wait 5 seconds
Start-Sleep -Seconds 5

# Start WSL again
wsl

# Verify network is working
wsl -d Ubuntu-22.04 ping 8.8.8.8
```

**Success indicator**: `ping` should return responses

---

## Solution 2: Update WSL Networking Configuration

### Check Current WSL Version

```powershell
wsl --version
```

**Minimum required**: WSL 2.0.0+

### Update WSL

```powershell
# Run as Administrator
wsl --update
wsl --shutdown
```

---

## Solution 3: Verify DNS Resolution

DNS is critical for connecting to `ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech`

### Test DNS from WSL

```bash
# From WSL terminal
nslookup ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech

# Should return something like:
# Server:         172.31.208.1
# Address:        172.31.208.1#53
# 
# Non-authoritative answer:
# Name:   ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech
# Address: 34.212.123.45
```

### If DNS Fails

1. **Update WSL resolv.conf**:

```bash
# From WSL terminal (sudo may be required)
echo "nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 1.1.1.1" | sudo tee /etc/resolv.conf > /dev/null

# Verify
cat /etc/resolv.conf
```

2. **Or use Windows PowerShell to flush DNS cache**:

```powershell
# From Windows (as Administrator)
ipconfig /flushdns
ipconfig /release
ipconfig /renew
```

---

## Solution 4: Check Windows Firewall

PostgreSQL uses port **6432** (Neon pooler) or **5432** (direct connection)

### Windows PowerShell (as Administrator):

```powershell
# Check if outbound port 6432 is blocked
netsh advfirewall firewall show rule name=all | findstr "6432"

# Add rule to allow outbound PostgreSQL (if needed)
netsh advfirewall firewall add rule `
  name="Allow Neon PostgreSQL Pooler" `
  dir=out `
  action=allow `
  protocol=tcp `
  remoteport=6432

# Add rule to allow outbound PostgreSQL direct
netsh advfirewall firewall add rule `
  name="Allow Neon PostgreSQL Direct" `
  dir=out `
  action=allow `
  protocol=tcp `
  remoteport=5432
```

---

## Solution 5: Switch from Pooler to Direct Endpoint

The pooler endpoint (`*-pooler.c-7.us-east-1.aws.neon.tech:6432`) sometimes has connectivity issues in WSL.

### Get Direct Endpoint

1. **In Neon console**, click on your project
2. Under **Connection String**, select the dropdown
3. Look for the option without `-pooler` in the hostname
4. It will be on port **5432** instead of 6432

### Update .env

```env
# OLD (pooler - sometimes times out)
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech:6432/neondb?sslmode=require

# NEW (direct connection)
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-falling-water-ap3jg70w.us-east-1.aws.neon.tech:5432/neondb?sslmode=require
```

### Test Connection

```bash
# From WSL
npm run dev

# In another terminal
curl http://localhost:5000/api/health/db
```

---

## Solution 6: Update WSL .wslconfig

Create/edit `C:\Users\<YourUsername>\.wslconfig`:

```ini
[wsl2]
# Networking improvements
resolvConf=/etc/resolv.conf
dnsTunnelingEnabled=true
autoProxy=true

[interop]
enabled=true
appendWindowsPath=true

[interop process]
enabled=true

[boot]
command=/bin/bash -c 'service systemd-resolved restart'
```

Then restart:

```powershell
wsl --shutdown
wsl
```

---

## Solution 7: Check ISP/Network Blocking

Some networks block outbound PostgreSQL connections (ports 5432/6432)

### Workaround Options

1. **Use mobile hotspot** (to test if it's ISP/network issue)
2. **Use VPN** (routes traffic differently)
3. **Test from coffee shop WiFi** (isolated network test)

### Alternative: Use SSH Tunnel

If outbound PostgreSQL is blocked:

```bash
# Create SSH tunnel through jump host (requires separate server)
ssh -L 5432:ep-falling-water-ap3jg70w.us-east-1.aws.neon.tech:5432 user@jump-host

# Then connect to localhost:5432
DATABASE_URL=postgresql://user:pass@localhost:5432/neondb
```

---

## Solution 8: Increase Connection Timeout

If network is slow, increase timeout in `backend/src/config/db.js`:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,  // Increased from 10000 (10sec → 30sec)
  idleTimeoutMillis: 60000,        // Increased from 30000 (30sec → 60sec)
  max: 5,
});
```

---

## Solution 9: Use Windows Native PostgreSQL (Test)

To isolate if it's WSL-specific:

1. **Install PostgreSQL on Windows** (https://www.postgresql.org/download/windows/)
2. **Try connecting from Windows Command Prompt**:

```bash
# Using psql (if installed)
psql "postgresql://user:pass@ep-falling-water-ap3jg70w.us-east-1.aws.neon.tech:5432/neondb"

# Or using telnet to test port
telnet ep-falling-water-ap3jg70w.us-east-1.aws.neon.tech 5432
```

**If this works but WSL doesn't**: It's a WSL-specific networking issue (use Solutions 1-8)

**If this also fails**: It's a system-wide issue (firewall, ISP, VPN)

---

## Solution 10: Neon Status & Service Health

Check if Neon is experiencing issues:

1. **Neon Status Page**: https://status.neon.tech
2. **AWS Status**: https://status.aws.amazon.com
3. **Your specific region**: Check if `us-east-1` is affected

If Neon is down, wait for restoration. Otherwise, continue troubleshooting.

---

## Complete Diagnostic Checklist

Run these commands and save output for support:

```bash
# From WSL
echo "=== WSL Info ===" && wsl -l -v
echo "=== DNS ===" && nslookup ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech
echo "=== Port Test ===" && timeout 5 nc -zv ep-falling-water-ap3jg70w-pooler.c-7.us-east-1.aws.neon.tech 6432
echo "=== Internet ===" && ping -c 1 8.8.8.8
echo "=== Backend Test ===" && curl http://localhost:5000/api/health/db
```

---

## When to Escalate

If none of these solutions work:

1. **Open WSL issue**: https://github.com/microsoft/WSL/issues
2. **Open Neon issue**: https://github.com/neondatabase/neon/issues
3. **Include output from diagnostic checklist above**

---

## Quick Reference: Step-by-Step for Total Reset

If you're stuck, try this complete reset:

```powershell
# From Windows PowerShell (as Administrator)

# 1. Shutdown WSL
wsl --shutdown

# 2. Update WSL
wsl --update

# 3. Restart Windows (optional but recommended)
Restart-Computer

# 4. Clear DNS
ipconfig /flushdns

# 5. Reopen WSL
wsl

# 6. Update system
sudo apt update && sudo apt upgrade -y

# 7. Try connecting again
cd /home/localhost8081/wastelink/backend
npm run dev

# In another terminal:
curl http://localhost:5000/api/health/db
```

---

**Last Updated**: 2026-05-19
