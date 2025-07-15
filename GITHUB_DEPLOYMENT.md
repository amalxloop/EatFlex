# EatFlex GitHub Deployment Guide

## 1. Deploy to GitHub

### Push Code to GitHub
```bash
# Stage and commit your changes
git add .
git commit -m "Update EatFlex with UI fixes and deployment ready"

# Push to GitHub (you'll need to authenticate)
git push origin main
```

### Authentication Options
If you get authentication errors, you can:

1. **Use GitHub CLI** (recommended):
   ```bash
   # Install gh CLI if not installed
   # For Arch Linux:
   sudo pacman -S github-cli
   
   # Authenticate
   gh auth login
   
   # Then push
   git push origin main
   ```

2. **Use Personal Access Token**:
   - Go to GitHub.com → Settings → Developer settings → Personal access tokens
   - Create a new token with repo permissions
   - Use it as password when prompted

## 2. Deploy Frontend to Vercel/Netlify

### Option A: Vercel (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub account
3. Import your EatFlex repository
4. Set build settings:
   - Framework: Create React App
   - Build command: `cd frontend && npm run build`
   - Output directory: `frontend/build`
5. Add environment variables:
   - `REACT_APP_API_URL`: Your backend URL

### Option B: Netlify
1. Go to [netlify.com](https://netlify.com)
2. Connect your GitHub account
3. Import your EatFlex repository
4. Set build settings:
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/build`
5. Add environment variables in site settings

## 3. Deploy Backend to Railway/Render

### Option A: Railway (Recommended)
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub account
3. Create new project from GitHub repo
4. Select the root directory
5. Add environment variables:
   - `MONGO_URL`: Your MongoDB connection string
   - `JWT_SECRET`: A secure secret key
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
6. Set start command: `cd backend && python -m uvicorn server:app --host 0.0.0.0 --port $PORT`

### Option B: Render
1. Go to [render.com](https://render.com)
2. Connect your GitHub account
3. Create new Web Service
4. Select your repository
5. Set:
   - Build command: `cd backend && pip install -r requirements.txt`
   - Start command: `cd backend && python -m uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Add environment variables

## 4. Database Setup

### MongoDB Atlas (Free)
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free cluster
3. Create database user
4. Get connection string
5. Add to backend environment variables

## 5. API Keys Setup

### OpenRouter API (for AI features)
1. Go to [openrouter.ai](https://openrouter.ai)
2. Create account and get API key
3. Add to backend environment variables

## 6. Post-Deployment Steps

1. **Update CORS settings** in backend/server.py:
   ```python
   allowed_origins = [
       "https://your-frontend-domain.vercel.app",
       "https://your-custom-domain.com",
       # Remove localhost in production
   ]
   ```

2. **Update API URL** in frontend:
   - Set `REACT_APP_API_URL` to your backend URL

3. **Test the deployment**:
   - Check frontend loads correctly
   - Test user registration/login
   - Test meal logging
   - Test AI analysis (if OpenRouter key is set)
   - Test social features

## 7. Domain Setup (Optional)

### Custom Domain
1. **For Vercel**: Go to project settings → Domains
2. **For Netlify**: Go to site settings → Domain management
3. Add your custom domain and follow DNS instructions

## 8. GitHub Actions (Optional CI/CD)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Install dependencies
      run: cd frontend && npm install
    
    - name: Build frontend
      run: cd frontend && npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        working-directory: ./frontend
```

## 9. Monitoring and Maintenance

1. **Set up monitoring**:
   - Use platform-specific monitoring (Vercel Analytics, Railway metrics)
   - Set up error tracking (Sentry)

2. **Regular updates**:
   - Keep dependencies updated
   - Monitor for security vulnerabilities
   - Regular database backups

## 10. Environment Variables Summary

### Backend (.env)
```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/eatflex
JWT_SECRET=your-super-secure-secret-key-here
OPENROUTER_API_KEY=your-openrouter-api-key
PORT=8001
```

### Frontend (.env)
```
REACT_APP_API_URL=https://your-backend-domain.railway.app
```

## Troubleshooting

### Common Issues:
1. **CORS errors**: Check allowed_origins in backend
2. **API connection failed**: Verify API_URL environment variable
3. **Database connection**: Check MongoDB connection string
4. **Build failures**: Check Node.js version compatibility

### Debug Steps:
1. Check deployment logs
2. Verify environment variables
3. Test API endpoints directly
4. Check network console in browser

## Success Checklist

- [ ] Code pushed to GitHub
- [ ] Frontend deployed and accessible
- [ ] Backend deployed and running
- [ ] Database connected and working
- [ ] Environment variables set correctly
- [ ] CORS configured properly
- [ ] API endpoints responding
- [ ] User registration/login working
- [ ] Meal logging functional
- [ ] Social features working
- [ ] AI analysis working (if configured)
- [ ] Custom domain configured (if applicable)

Your EatFlex application should now be live and accessible to users!
