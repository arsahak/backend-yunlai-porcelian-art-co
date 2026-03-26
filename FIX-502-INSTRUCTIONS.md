# 🚀 How to Fix 502 Bad Gateway on Digital Ocean

## Quick Setup (3 Steps)

### Step 1: Upload the Script to Your Server

**Option A: Using SCP (from your local machine)**
```bash
scp fix-502-error.sh root@your-server-ip:/root/
```

**Option B: Create directly on server**
```bash
# SSH into your server first
ssh root@your-server-ip

# Create the script
nano fix-502-error.sh
# Paste the script content, then save with Ctrl+X, Y, Enter
```

### Step 2: Edit Configuration Variables

Open the script and change these lines (around line 18-20):
```bash
nano fix-502-error.sh
```

Change:
- `DOMAIN="api.yourdomain.com"` → Your actual subdomain (e.g., `api.yunlai.com`)
- `BACKEND_DIR="/root/yunlai-porcelian-art-co/backend"` → Your actual backend path

Save with `Ctrl+X`, `Y`, `Enter`

### Step 3: Run the Script

```bash
# Make it executable
chmod +x fix-502-error.sh

# Run it
sudo ./fix-502-error.sh
```

---

## What the Script Does Automatically:

✅ **Installs Node.js** (if not installed)
✅ **Installs PM2** (process manager)
✅ **Installs backend dependencies**
✅ **Builds the TypeScript code**
✅ **Creates .env file** (if missing)
✅ **Starts backend with PM2**
✅ **Configures Nginx** with proper proxy settings
✅ **Sets up firewall rules**
✅ **Optionally installs SSL certificate**
✅ **Tests everything** and shows status

---

## Alternative: Manual Commands (If You Prefer)

If you want to run commands one by one instead:

```bash
# 1. Go to your backend directory
cd /root/yunlai-porcelian-art-co/backend

# 2. Install PM2
sudo npm install -g pm2

# 3. Install dependencies
npm install

# 4. Build
npm run build

# 5. Start with PM2
pm2 start dist/server.js --name yunlai-backend
pm2 save
pm2 startup

# 6. Test backend
curl http://localhost:5000

# 7. Configure Nginx
sudo nano /etc/nginx/sites-available/api.yourdomain.com
# Paste the nginx config from the script

# 8. Enable and restart
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 9. Check status
pm2 status
sudo systemctl status nginx
```

---

## Troubleshooting Commands

```bash
# Check if backend is running
pm2 list
pm2 logs yunlai-backend

# Check backend port
sudo netstat -tulpn | grep :5000

# Test backend locally
curl http://localhost:5000
curl http://localhost:5000/health

# Check Nginx errors
sudo tail -f /var/log/nginx/error.log

# Restart everything
pm2 restart yunlai-backend
sudo systemctl restart nginx
```

---

## Common Issues & Fixes

### Issue 1: "Cannot connect to MongoDB"
**Fix:**
```bash
cd /root/yunlai-porcelian-art-co/backend
nano .env
# Add your MongoDB connection string:
# MONGODB_URI=mongodb://localhost:27017/yunlai-porcelain
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/yunlai-porcelain
```

### Issue 2: "PM2 command not found"
**Fix:**
```bash
sudo npm install -g pm2
export PATH=$PATH:/usr/bin
```

### Issue 3: "Port 5000 already in use"
**Fix:**
```bash
# Find what's using the port
sudo lsof -i :5000
# Kill it
sudo kill -9 <PID>
# Or change port in .env
echo "PORT=5001" >> .env
```

### Issue 4: DNS not resolving
**Fix:**
- Make sure your subdomain DNS A record points to your server IP
- Wait 5-10 minutes for DNS propagation
- Test with: `dig api.yourdomain.com`

---

## After Running the Script

1. **Test your API:**
   ```bash
   curl http://api.yourdomain.com/health
   ```

2. **Check logs if issues:**
   ```bash
   pm2 logs yunlai-backend
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Make sure environment variables are set:**
   ```bash
   cd /root/yunlai-porcelian-art-co/backend
   cat .env
   ```

---

## Need Help?

If the script fails:
1. Copy the error message
2. Run: `pm2 logs yunlai-backend --lines 50`
3. Run: `sudo tail -50 /var/log/nginx/error.log`
4. Share the output

---

**Ready to run? Just execute:**
```bash
sudo ./fix-502-error.sh
```
