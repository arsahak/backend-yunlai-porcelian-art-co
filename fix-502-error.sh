#!/bin/bash

# =============================================================================
# 502 Bad Gateway Fix Script for Yunlai Backend on Digital Ocean
# =============================================================================

set -e  # Exit on error

echo "=========================================="
echo "🔧 Starting 502 Error Fix Process..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - CHANGE THESE VALUES
DOMAIN="api.yourdomain.com"  # ⚠️ CHANGE THIS to your actual subdomain
BACKEND_DIR="/root/yunlai-porcelian-art-co/backend"  # ⚠️ CHANGE THIS to your backend path
BACKEND_PORT="5000"
APP_NAME="yunlai-backend"

echo -e "${YELLOW}📝 Configuration:${NC}"
echo "Domain: $DOMAIN"
echo "Backend Directory: $BACKEND_DIR"
echo "Backend Port: $BACKEND_PORT"
echo ""

# =============================================================================
# Step 1: Check if Node.js and npm are installed
# =============================================================================
echo -e "${GREEN}Step 1:${NC} Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}✓ Node.js is installed:${NC} $(node --version)"
fi

# =============================================================================
# Step 2: Install PM2 globally
# =============================================================================
echo -e "\n${GREEN}Step 2:${NC} Installing/Updating PM2..."
sudo npm install -g pm2
pm2 update
echo -e "${GREEN}✓ PM2 installed/updated${NC}"

# =============================================================================
# Step 3: Navigate to backend and install dependencies
# =============================================================================
echo -e "\n${GREEN}Step 3:${NC} Setting up backend application..."
if [ -d "$BACKEND_DIR" ]; then
    cd "$BACKEND_DIR"
    echo "Current directory: $(pwd)"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    else
        echo -e "${GREEN}✓ Dependencies already installed${NC}"
    fi
    
    # Build the project if needed
    if [ -f "package.json" ]; then
        echo "Building TypeScript..."
        npm run build
        echo -e "${GREEN}✓ Build completed${NC}"
    fi
else
    echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
    echo "Please update BACKEND_DIR variable in this script!"
    exit 1
fi

# =============================================================================
# Step 4: Check if .env file exists
# =============================================================================
echo -e "\n${GREEN}Step 4:${NC} Checking environment variables..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found!${NC}"
    echo "Creating basic .env file..."
    cat > .env << EOF
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/yunlai-porcelain
# or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/yunlai-porcelain

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

# Server Configuration
PORT=$BACKEND_PORT
NODE_ENV=production

# API URL (for CORS)
FRONTEND_URL=https://yourdomain.com
EOF
    echo -e "${YELLOW}⚠️  Please edit .env file with your actual MongoDB URI and other settings!${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# =============================================================================
# Step 5: Stop any existing backend process
# =============================================================================
echo -e "\n${GREEN}Step 5:${NC} Stopping existing backend processes..."
pm2 delete $APP_NAME 2>/dev/null || echo "No existing PM2 process to stop"
sudo pkill -f "node.*server.js" 2>/dev/null || echo "No node processes to kill"
echo -e "${GREEN}✓ Old processes stopped${NC}"

# =============================================================================
# Step 6: Start backend with PM2
# =============================================================================
echo -e "\n${GREEN}Step 6:${NC} Starting backend with PM2..."
cd "$BACKEND_DIR"
pm2 start dist/server.js --name $APP_NAME -i 1 --log-date-format="YYYY-MM-DD HH:mm:ss Z"
pm2 save
echo -e "${GREEN}✓ Backend started with PM2${NC}"

# Setup PM2 startup script
echo "Setting up PM2 to start on boot..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
pm2 save

# =============================================================================
# Step 7: Verify backend is running
# =============================================================================
echo -e "\n${GREEN}Step 7:${NC} Verifying backend is running..."
sleep 3
if curl -s http://localhost:$BACKEND_PORT > /dev/null; then
    echo -e "${GREEN}✓ Backend is responding on port $BACKEND_PORT${NC}"
else
    echo -e "${RED}❌ Backend is not responding!${NC}"
    echo "Checking PM2 logs:"
    pm2 logs $APP_NAME --lines 20 --nostream
    exit 1
fi

# =============================================================================
# Step 8: Configure Nginx
# =============================================================================
echo -e "\n${GREEN}Step 8:${NC} Configuring Nginx..."

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Increase timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Logging
    access_log /var/log/nginx/${DOMAIN}_access.log;
    error_log /var/log/nginx/${DOMAIN}_error.log;

    location / {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Handle file uploads
    client_max_body_size 100M;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "Testing Nginx configuration..."
if sudo nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
    sudo systemctl restart nginx
    echo -e "${GREEN}✓ Nginx restarted${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors!${NC}"
    exit 1
fi

# =============================================================================
# Step 9: Configure Firewall
# =============================================================================
echo -e "\n${GREEN}Step 9:${NC} Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 22/tcp  # SSH
    sudo ufw --force enable
    echo -e "${GREEN}✓ Firewall configured${NC}"
else
    echo -e "${YELLOW}⚠️  UFW not found, skipping firewall configuration${NC}"
fi

# =============================================================================
# Step 10: Install SSL Certificate (Optional)
# =============================================================================
echo -e "\n${GREEN}Step 10:${NC} SSL Certificate Setup..."
read -p "Do you want to install SSL certificate with Let's Encrypt? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if ! command -v certbot &> /dev/null; then
        echo "Installing Certbot..."
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    echo "Installing SSL certificate for $DOMAIN..."
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email || echo "Certbot setup needs manual intervention"
else
    echo "Skipping SSL setup. You can run this later: sudo certbot --nginx -d $DOMAIN"
fi

# =============================================================================
# Step 11: Final Status Check
# =============================================================================
echo -e "\n${GREEN}=========================================="
echo "📊 Final Status Check"
echo "==========================================${NC}"

echo -e "\n${GREEN}Backend Status:${NC}"
pm2 list
pm2 info $APP_NAME

echo -e "\n${GREEN}Nginx Status:${NC}"
sudo systemctl status nginx --no-pager | head -10

echo -e "\n${GREEN}Port Check:${NC}"
sudo netstat -tulpn | grep :$BACKEND_PORT || echo "Port not found"

echo -e "\n${GREEN}Testing Endpoints:${NC}"
echo "Local test:"
curl -s http://localhost:$BACKEND_PORT/health | jq . || curl -s http://localhost:$BACKEND_PORT/health

echo -e "\n${GREEN}Public test (if DNS is configured):${NC}"
curl -s http://$DOMAIN/health | jq . || curl -s http://$DOMAIN/health

# =============================================================================
# Summary and Next Steps
# =============================================================================
echo -e "\n${GREEN}=========================================="
echo "✅ Setup Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${GREEN}Backend Application:${NC}"
echo "  Status: $(pm2 describe $APP_NAME | grep status | awk '{print $4}')"
echo "  Port: $BACKEND_PORT"
echo "  Logs: pm2 logs $APP_NAME"
echo ""
echo -e "${GREEN}Nginx:${NC}"
echo "  Domain: $DOMAIN"
echo "  Config: /etc/nginx/sites-available/$DOMAIN"
echo "  Logs: sudo tail -f /var/log/nginx/${DOMAIN}_error.log"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo "  pm2 restart $APP_NAME    # Restart backend"
echo "  pm2 logs $APP_NAME        # View logs"
echo "  sudo systemctl restart nginx  # Restart Nginx"
echo "  sudo nginx -t             # Test Nginx config"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Make sure DNS is pointing to this server's IP"
echo "  2. Update .env file with correct MongoDB URI"
echo "  3. Test your API: curl http://$DOMAIN/health"
echo "  4. Check logs if issues: pm2 logs $APP_NAME"
echo ""
echo -e "${GREEN}=========================================${NC}"
