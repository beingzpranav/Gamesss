# Quick Deploy Guide (PM2 Ready)

## Backend Deployment to EC2 (Right Now)

### Step 1: SSH into EC2
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 2: Clone & Setup Backend
```bash
cd /home/ubuntu
mkdir -p app && cd app
git clone https://github.com/YOUR_USERNAME/Gamesss.git
cd Gamesss/backend
npm install
```

### Step 3: Start with PM2
```bash
# Start the server
pm2 start server.js --name "game-server"

# Auto-restart on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs game-server
```

**Your Backend URL:** `http://YOUR_EC2_PUBLIC_IP:4000`

---

## Frontend Deployment to Vercel

### Step 1: Update Backend URL in Frontend

Edit `frontend/src/App.js`:
```javascript
// Change this line:
const socket = io('http://localhost:4000');

// To this:
const socket = io('http://YOUR_EC2_PUBLIC_IP:4000');
```

### Step 2: Push to GitHub
```bash
cd frontend
git add .
git commit -m "Update backend URL for production"
git push origin main
```

### Step 3: Connect Vercel to GitHub

1. Go to https://vercel.com/dashboard
2. Click **Add New → Project**
3. Select your GitHub repo
4. **Root Directory:** `frontend`
5. **Framework:** React
6. **Add Environment Variable:**
   - `REACT_APP_SERVER_URL` = `http://YOUR_EC2_PUBLIC_IP:4000`
7. Click **Deploy**

**Your Frontend URL:** `https://your-project-name.vercel.app`

---

## Quick Verification

### Test Backend
```bash
curl http://YOUR_EC2_PUBLIC_IP:4000/
```

### Test Frontend
Open `https://your-project-name.vercel.app` in browser → Create/Join room → Should work!

---

## Common Commands

**SSH into EC2:**
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

**View Backend Logs:**
```bash
pm2 logs game-server
```

**Restart Backend:**
```bash
pm2 restart game-server
```

**Update Backend Code:**
```bash
cd /home/ubuntu/app/Gamesss/backend
git pull origin main
npm install
pm2 restart game-server
```

**Update Frontend:**
Just push to GitHub → Vercel auto-deploys

---

## Troubleshooting

**Frontend can't connect to backend?**
- Check EC2 security group allows port 4000
- Verify backend URL in Vercel environment variables
- Check browser console for errors

**Backend won't start?**
```bash
pm2 logs game-server  # Check logs
pm2 restart game-server
```

**Need to rebuild frontend?**
Vercel auto-rebuilds on GitHub push. If manual needed:
```bash
cd frontend
npm run build
```
