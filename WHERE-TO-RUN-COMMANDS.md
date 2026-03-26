# 🎯 EXACT COMMANDS - WHERE TO RUN THEM

## 📍 Part 1: ON YOUR LOCAL WINDOWS MACHINE (Git Bash)

```bash
# You are here now:
# arsah@DESKTOP-C8R7HVT MINGW64 /f/yunlai-porcelian-art-co/backend

# Step 1: Upload the fix script to your server
scp fix-502-error.sh root@YOUR_SERVER_IP:/root/
# Replace YOUR_SERVER_IP with your actual IP (e.g., 164.92.xxx.xxx)
# Enter your server password when asked

# Step 2: Connect to your server via SSH
ssh root@YOUR_SERVER_IP
# Enter your server password
# After this command, you'll be INSIDE your server ✅
```

---

## 📍 Part 2: ON YOUR DIGITAL OCEAN SERVER (After SSH)

**After running `ssh root@YOUR_SERVER_IP`, you'll see something like:**
```bash
root@your-server-name:~#
```

**Now you're INSIDE the server! Run these commands:**

```bash
# ============================================
# COMMANDS TO RUN ON THE SERVER (NOT LOCAL!)
# ============================================

# Step 1: Check if backend directory exists
ls -la /root/yunlai-porcelian-art-co/backend
# or try:
ls -la ~/yunlai-porcelian-art-co/backend

# Step 2: Navigate to backend directory
cd /root/yunlai-porcelian-art-co/backend
# (adjust path if different)

# Step 3: Install PM2 globally
npm install -g pm2

# Step 4: Install dependencies
npm install

# Step 5: Build the project
npm run build

# Step 6: Create .env file if it doesn't exist
nano .env
# Add these lines:
# MONGODB_URI=mongodb://localhost:27017/yunlai-porcelain
# JWT_SECRET=your-secret-key-here
# PORT=5000
# NODE_ENV=production
# Save with: Ctrl+X, then Y, then Enter

# Step 7: Start the backend with PM2
pm2 start dist/server.js --name yunlai-backend

# Step 8: Save PM2 configuration
pm2 save

# Step 9: Set up PM2 to start on boot
pm2 startup
# Run the command it shows you

# Step 10: Test if backend is running
curl http://localhost:5000
curl http://localhost:5000/health

# Step 11: Configure Nginx
nano /etc/nginx/sites-available/api.yourdomain.com
# Paste the Nginx configuration (see below)
# Save with: Ctrl+X, then Y, then Enter

# Step 12: Enable the Nginx site
ln -sf /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/

# Step 13: Test Nginx configuration
nginx -t

# Step 14: Restart Nginx
systemctl restart nginx

# Step 15: Test the API
curl http://api.yourdomain.com/health

# Done! 🎉
```

---

## 📋 Nginx Configuration to Paste

**When you run** `nano /etc/nginx/sites-available/api.yourdomain.com`

**Paste this** (replace `api.yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 100M;
    
    access_log /var/log/nginx/api_access.log;
    error_log /var/log/nginx/api_error.log;
}
```

**Then press:** `Ctrl+X`, then `Y`, then `Enter`

---

## 🔍 Quick Reference

| Location | Command Prompt Looks Like | What to Run |
|----------|---------------------------|-------------|
| **Local Windows** | `arsah@DESKTOP-C8R7HVT MINGW64` | `ssh root@YOUR_SERVER_IP` |
| **Digital Ocean Server** | `root@server-name:~#` | All the server commands above |

---

## 🚀 FASTEST WAY (Copy-Paste All at Once)

**After SSH into server**, copy and paste this entire block:

```bash
cd /root/yunlai-porcelian-art-co/backend && \
npm install -g pm2 && \
npm install && \
npm run build && \
pm2 delete yunlai-backend 2>/dev/null || true && \
pm2 start dist/server.js --name yunlai-backend && \
pm2 save && \
pm2 startup && \
curl http://localhost:5000
```

**If that works, then configure Nginx:**

```bash
cat > /etc/nginx/sites-available/api.yourdomain.com << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 100M;
}
EOF

ln -sf /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/ && \
nginx -t && \
systemctl restart nginx && \
echo "✅ Done! Test with: curl http://api.yourdomain.com/health"
```

---

## ❓ Still Confused? Follow This Exact Flow:

### 1. ON YOUR LOCAL MACHINE:
```bash
ssh root@YOUR_SERVER_IP
# You'll be asked for password, enter it
```

### 2. AFTER YOU SEE `root@something:~#` - YOU'RE ON THE SERVER!
```bash
cd /root/yunlai-porcelian-art-co/backend
pm2 start dist/server.js --name yunlai-backend
```

### 3. CHECK IF IT WORKS:
```bash
curl http://localhost:5000
```

### 4. IF YOU SEE JSON OUTPUT ✅, CONFIGURE NGINX:
```bash
nano /etc/nginx/sites-available/api.yourdomain.com
# Paste the nginx config
# Press Ctrl+X, Y, Enter
```

### 5. ACTIVATE NGINX:
```bash
ln -sf /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 💡 Need Help?

**If you see this prompt:** `arsah@DESKTOP-C8R7HVT` → You're on LOCAL machine → Run `ssh root@YOUR_SERVER_IP`

**If you see this prompt:** `root@server-name:~#` → You're on SERVER → Run the backend commands

**Replace in ALL commands:**
- `YOUR_SERVER_IP` → Your actual IP (like `164.92.123.45`)
- `api.yourdomain.com` → Your actual subdomain (like `api.yunlai.com`)
