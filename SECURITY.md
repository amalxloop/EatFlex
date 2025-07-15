# Security Guide for EatFlex Deployment

## ⚠️ IMPORTANT: Before Deploying

### 1. **Environment Variables - NEVER HARDCODE**
- All sensitive information should be set as environment variables in Render dashboard
- **NEVER** commit actual API keys or database credentials to Git

### 2. **Files to Keep Private**
These files are already excluded from Git but double-check:
- `.env` - Contains local development secrets
- `backend_test.py` - Internal testing file
- `test_result.md` - Test results
- Any `*test*.html` or `*test*.json` files

### 3. **Manual Environment Variable Setup**
When deploying to Render, set these manually in the dashboard:

**Backend Service:**
```
JWT_SECRET=your-random-secret-key-generate-a-new-one
MONGO_URL=mongodb+srv://username:password@cluster0.mongodb.net/eatflex?retryWrites=true&w=majority
OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key-here
```

**Frontend Service:**
```
REACT_APP_API_URL=https://your-backend-name.onrender.com
```

### 4. **Security Checklist Before Going Live**

✅ **API Keys:**
- [ ] Remove any hardcoded API keys from code
- [ ] Set all keys as environment variables in Render dashboard
- [ ] Generate new JWT secret for production

✅ **Database:**
- [ ] Use MongoDB Atlas with proper authentication
- [ ] Restrict database access to specific IP ranges if possible
- [ ] Use strong database passwords

✅ **CORS:**
- [ ] Update `allowed_origins` in `backend/server.py` to only include your actual frontend domain
- [ ] Remove `"*"` from allowed origins in production

✅ **Test Files:**
- [ ] Confirm test files are in .gitignore
- [ ] Don't deploy test endpoints to production

### 5. **Production Security Updates**

Before going live, update `backend/server.py`:

```python
# PRODUCTION CORS - Remove wildcard
allowed_origins = [
    "https://your-frontend-name.onrender.com",  # Your actual frontend URL
    "https://your-custom-domain.com"  # If you have a custom domain
]
```

### 6. **Monitoring & Logs**
- Monitor Render logs for any exposed secrets
- Set up error tracking
- Never log sensitive information

### 7. **Emergency Response**
If you accidentally commit secrets:
1. **Immediately revoke** the exposed API keys
2. **Generate new keys** and update environment variables
3. **Rotate JWT secret** (users will need to re-login)
4. **Remove from Git history** using `git filter-branch` or BFG Repo-Cleaner

## Quick Security Verification

Run this command to check for potential secrets in your code:
```bash
grep -r "sk-" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "mongodb+srv" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "password" . --exclude-dir=node_modules --exclude-dir=.git
```

## Safe Deployment Process

1. **Local Testing:** Test with `.env` file locally
2. **Code Review:** Double-check no secrets are committed
3. **Deploy:** Use Render dashboard to set environment variables
4. **Verify:** Test production deployment
5. **Monitor:** Keep an eye on logs for any issues

Remember: **When in doubt, don't commit it!** It's better to set variables manually in the dashboard than risk exposing secrets.
