# Deployment Guide

This guide covers deploying the multiplayer game application with the backend on AWS EC2 and frontend on Vercel.

## Table of Contents
1. [Backend Deployment (AWS EC2)](#backend-deployment-aws-ec2)
2. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
3. [Environment Configuration](#environment-configuration)
4. [Post-Deployment Verification](#post-deployment-verification)

---

## Backend Deployment (AWS EC2)

### Prerequisites
- AWS account with EC2 access
- SSH key pair created in AWS
- Security group configured to allow inbound traffic on port 4000

### Step 1: Launch EC2 Instance

1. Go to AWS EC2 Dashboard
2. Click **Launch Instance**
3. Select **Ubuntu 22.04 LTS** (or latest)
4. Choose instance type: **t3.micro** (eligible for free tier)
5. Create or select an existing key pair (.pem file)
6. Configure security group:
   - Allow SSH (port 22) from your IP
   - Allow inbound traffic on port 4000 from 0.0.0.0/0 (HTTP)
   - Allow outbound traffic on all ports
7. Launch the instance

### Step 2: Connect to EC2 Instance

```bash
# Change permissions on your key pair (first time only)
chmod 400 your-key.pem

# SSH into your instance (replace with your instance IP)
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 3: Setup Node.js on EC2

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 (process manager to keep server running)
sudo npm install -g pm2
```

### Step 4: Clone and Deploy Backend

```bash
# Create app directory
cd /home/ubuntu
mkdir -p app && cd app

# Clone your repository (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/Gamesss.git
cd Gamesss/backend

# Install dependencies
npm install

# Create .env file (if needed for production secrets)
nano .env
# Add any environment variables needed
```

### Step 5: Start Backend with PM2

```bash
# Start the server with PM2
pm2 start server.js --name "game-server"

# Set PM2 to start on system reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs game-server
```

### Step 6: Get Your Backend URL

Your backend will be accessible at:
```
http://YOUR_EC2_PUBLIC_IP:4000
```

**Note:** Save this URL for the frontend deployment (Step 3 under Frontend Deployment).

---

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account (sign up at https://vercel.com)
- GitHub repository with your code
- Backend URL from EC2 deployment

### Step 1: Prepare Frontend for Production

Update `frontend/src/App.js` to use your EC2 backend URL:

```javascript
// Before
const socket = io('http://localhost:4000');

// After
const socket = io('http://YOUR_EC2_PUBLIC_IP:4000');
```

Or use an environment variable:

```javascript
const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:4000');
```

Create `.env.production` file in the `frontend` directory:
```
REACT_APP_SERVER_URL=http://YOUR_EC2_PUBLIC_IP:4000
```

### Step 2: Push to GitHub

```bash
# From your project root
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 3: Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click **Add New → Project**
3. Select your GitHub repository
4. Configure project:
   - **Framework**: React
   - **Root Directory**: `frontend`
5. Add environment variables:
   - Key: `REACT_APP_SERVER_URL`
   - Value: `http://YOUR_EC2_PUBLIC_IP:4000`
6. Click **Deploy**

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod

# When prompted for settings, select appropriate options
# Framework: react
# Build directory: build
```

### Step 4: Get Your Frontend URL

After deployment, Vercel will provide you with a URL like:
```
https://your-project-name.vercel.app
```

---

## Environment Configuration

### Backend Configuration (EC2)

Create `/home/ubuntu/app/Gamesss/backend/.env` if needed:

```env
PORT=4000
NODE_ENV=production
# Add any other environment variables
```

Update `server.js` CORS configuration for production:

```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: ['https://your-project-name.vercel.app', 'http://YOUR_EC2_PUBLIC_IP:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

### Frontend Configuration (Vercel)

Environment variables are already set in Vercel dashboard, but ensure `.env.production` matches:

```
REACT_APP_SERVER_URL=http://YOUR_EC2_PUBLIC_IP:4000
```

---

## Post-Deployment Verification

### Test Backend

```bash
# From your local machine
curl http://YOUR_EC2_PUBLIC_IP:4000/
# Should see: OK or connection response
```

### Test Frontend

1. Visit your Vercel URL: `https://your-project-name.vercel.app`
2. Test game functionality:
   - Create a room
   - Join a room
   - Verify real-time updates work
   - Check console for any connection errors

### Monitor Backend Logs

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# View logs
pm2 logs game-server

# Restart if needed
pm2 restart game-server
```

---

## Troubleshooting

### Frontend Can't Connect to Backend

1. Check EC2 security group allows port 4000
2. Verify backend URL in Vercel environment variables
3. Check browser console for CORS errors
4. Ensure Socket.io connection string is correct

### Backend Not Running

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Check PM2 status
pm2 status

# Restart server
pm2 restart game-server

# View logs
pm2 logs game-server
```

### Update Backend Code

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Navigate to app
cd /home/ubuntu/app/Gamesss/backend

# Pull latest code
git pull origin main

# Install new dependencies (if any)
npm install

# Restart server
pm2 restart game-server
```

### Update Frontend Code

1. Push changes to GitHub
2. Vercel automatically deploys on push to main branch
3. Check deployment status in Vercel dashboard

---

## Cost Estimates

- **AWS EC2**: ~$9-12/month (t3.micro for free tier eligible accounts, then ~$0.0104/hour)
- **Vercel**: Free tier available, Pro tier $20/month if needed

---

## Security Notes

- Never commit `.env` files with sensitive data
- Use security groups to restrict access
- Keep EC2 security updates current
- Monitor logs regularly for suspicious activity
- Use HTTPS (consider adding SSL/TLS with AWS Certificate Manager)

