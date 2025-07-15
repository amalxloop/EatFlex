# EatFlex Deployment Guide - Render

## Prerequisites

1. **MongoDB Atlas Account**: Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **OpenRouter API Key**: Get your API key from [OpenRouter](https://openrouter.ai/)
3. **Render Account**: Sign up at [Render](https://render.com/)
4. **GitHub Repository**: Your code should be in a GitHub repository

## Step 1: Set up MongoDB Atlas

1. Create a new cluster (free tier is sufficient)
2. Create a database user with read/write permissions
3. Get your connection string (it will look like):
   ```
   mongodb+srv://username:password@cluster0.mongodb.net/eatflex?retryWrites=true&w=majority
   ```

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. **Fork/Clone this repository** to your GitHub account
2. **Update environment variables** in `render.yaml`:
   - Replace `your-username:your-password` with your MongoDB Atlas credentials
   - Replace `your-openrouter-api-key` with your actual OpenRouter API key
3. **Connect to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository containing your EatFlex code
   - Render will automatically detect the `render.yaml` file and deploy both services

### Option B: Manual Deployment

#### Backend Deployment

1. **Create a new Web Service** in Render
2. **Connect your repository**
3. **Configure the service**:
   - **Name**: `eatflex-backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Plan**: Free

4. **Set Environment Variables**:
   - `JWT_SECRET`: Generate a random secret key
   - `MONGO_URL`: Your MongoDB Atlas connection string
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `PORT`: 8000 (Render will set this automatically)

#### Frontend Deployment

1. **Create a new Static Site** in Render
2. **Connect your repository**
3. **Configure the site**:
   - **Name**: `eatflex-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/build`

4. **Set Environment Variables**:
   - `REACT_APP_API_URL`: Your backend service URL (e.g., `https://eatflex-backend.onrender.com`)

## Step 3: Configure CORS

Update the `allowed_origins` in `backend/server.py` to include your frontend URL:

```python
allowed_origins = [
    "http://localhost:3000",
    "https://your-frontend-name.onrender.com",  # Replace with your actual frontend URL
    "https://eatflex.onrender.com",
]
```

## Step 4: Test Your Deployment

1. **Access your frontend**: Visit your frontend URL
2. **Test authentication**: Try to sign up/login
3. **Test API**: Check that all features work correctly

## Environment Variables Summary

### Backend (.env or Render Environment Variables)
- `JWT_SECRET`: Secret key for JWT token generation
- `MONGO_URL`: MongoDB connection string
- `OPENROUTER_API_KEY`: OpenRouter API key for meal analysis
- `PORT`: Port number (automatically set by Render)

### Frontend (.env or Render Environment Variables)
- `REACT_APP_API_URL`: Backend API URL

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your frontend URL is in the `allowed_origins` list
2. **Database Connection**: Verify your MongoDB connection string is correct
3. **API Key Issues**: Ensure your OpenRouter API key is valid
4. **Build Failures**: Check the build logs in Render dashboard

### Debugging

1. **Check Render logs**: Go to your service dashboard and check the logs
2. **Test locally**: Make sure everything works locally first
3. **Environment variables**: Double-check all environment variables are set correctly

## Free Tier Limitations

- **Backend**: 500 hours per month, sleeps after 15 minutes of inactivity
- **Frontend**: Unlimited bandwidth, global CDN
- **Database**: MongoDB Atlas free tier (512MB storage)

## Going to Production

For production deployment:

1. **Remove wildcards** from CORS origins
2. **Use production database** with proper backup
3. **Set up monitoring** and error tracking
4. **Consider upgrading** to paid plans for better performance
5. **Add SSL certificates** (automatically provided by Render)

## Support

If you encounter issues:
1. Check the Render documentation
2. Review the logs in your Render dashboard
3. Verify all environment variables are correctly set
4. Test locally to isolate issues
