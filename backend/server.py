from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from pydantic import BaseModel
from datetime import datetime, timedelta
import os
import uuid
import jwt
import bcrypt
import base64
import requests
from typing import Optional, List
import json

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URL)
db = client['eatflex']

# Collections
users_collection = db['users']
meals_collection = db['meals']
posts_collection = db['posts']
recipes_collection = db['recipes']
streaks_collection = db['streaks']

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'eatflex-secret-key')

# OpenRouter API configuration
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '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')
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

security = HTTPBearer()

# Pydantic models
class UserSignup(BaseModel):
    email: str
    password: str
    name: str
    goal: str = "maintenance"  # bulking, cutting, maintenance

class UserLogin(BaseModel):
    email: str
    password: str

class MealLog(BaseModel):
    name: str
    ingredients: Optional[str] = None
    quantity: Optional[str] = None
    calories: Optional[int] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None

class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    meal_id: Optional[str] = None

class RecipeCreate(BaseModel):
    name: str
    ingredients: str
    instructions: str
    calories: int
    protein: float
    carbs: float
    fat: float
    servings: int

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    daily_calorie_goal: Optional[int] = None
    daily_protein_goal: Optional[int] = None
    daily_carbs_goal: Optional[int] = None
    daily_fat_goal: Optional[int] = None
    bio: Optional[str] = None

class CommentCreate(BaseModel):
    content: str

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_jwt_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['user_id']
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = verify_jwt_token(credentials.credentials)
    user = users_collection.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def analyze_meal_with_ai(image_data: str, meal_name: str = None) -> dict:
    """Analyze meal using OpenRouter GPT-4o vision"""
    try:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        prompt = f"""Analyze this meal image and provide detailed nutritional information. 
        {'The user says this is: ' + meal_name if meal_name else ''}
        
        Please provide:
        1. Meal name/description
        2. Estimated calories
        3. Protein (grams)
        4. Carbohydrates (grams)
        5. Fat (grams)
        6. Brief ingredient list
        7. Confidence level (1-10)
        
        Return as JSON format:
        {{
            "name": "meal name",
            "calories": 500,
            "protein": 25.5,
            "carbs": 45.2,
            "fat": 18.3,
            "ingredients": "chicken breast, rice, vegetables",
            "confidence": 8
        }}"""
        
        payload = {
            "model": "openai/gpt-4o",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
                    ]
                }
            ],
            "max_tokens": 500,
            "temperature": 0.3
        }
        
        response = requests.post(f"{OPENROUTER_BASE_URL}/chat/completions", headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # Extract JSON from response
            try:
                # Try to parse as JSON directly
                meal_data = json.loads(content)
                return meal_data
            except:
                # If not JSON, create a structured response
                return {
                    "name": meal_name or "Unknown meal",
                    "calories": 400,
                    "protein": 20.0,
                    "carbs": 30.0,
                    "fat": 15.0,
                    "ingredients": "Could not analyze ingredients",
                    "confidence": 5
                }
        else:
            raise Exception(f"API call failed: {response.status_code}")
            
    except Exception as e:
        print(f"AI Analysis error: {e}")
        return {
            "name": meal_name or "Unknown meal",
            "calories": 400,
            "protein": 20.0,
            "carbs": 30.0,
            "fat": 15.0,
"ingredients": "Could not analyze ingredients",
        "confidence": 1
    }

# Profile endpoints
@app.get("/api/profile/{user_id}")
async def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get user profile by ID"""
    user = users_collection.find_one({"user_id": user_id}, {"password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's recent posts
    recent_posts = list(posts_collection.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10))
    
    # Get user's meal history summary
    recent_meals = list(meals_collection.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5))
    
    return {
        "user_id": user['user_id'],
        "name": user['name'],
        "email": user['email'],
        "goal": user['goal'],
        "bio": user.get('bio', ''),
        "followers": len(user.get('followers', [])),
        "following": len(user.get('following', [])),
        "posts_count": user.get('posts_count', 0),
        "current_streak": user.get('current_streak', 0),
        "longest_streak": user.get('longest_streak', 0),
        "created_at": user['created_at'],
        "recent_posts": recent_posts,
        "recent_meals": recent_meals,
        "is_following": user_id in current_user.get('following', []),
        "daily_goals": {
            "calories": user.get('daily_calorie_goal', 2000),
            "protein": user.get('daily_protein_goal', 150),
            "carbs": user.get('daily_carbs_goal', 250),
            "fat": user.get('daily_fat_goal', 70)
        }
    }

@app.put("/api/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    
    if update_data:
        users_collection.update_one(
            {"user_id": current_user['user_id']},
            {"$set": update_data}
        )
    
    return {"message": "Profile updated successfully"}

@app.post("/api/profile/follow/{user_id}")
async def follow_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Follow or unfollow a user"""
    if user_id == current_user['user_id']:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    target_user = users_collection.find_one({"user_id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_following = current_user.get('following', [])
    
    if user_id in current_following:
        # Unfollow
        users_collection.update_one(
            {"user_id": current_user['user_id']},
            {"$pull": {"following": user_id}}
        )
        users_collection.update_one(
            {"user_id": user_id},
            {"$pull": {"followers": current_user['user_id']}}
        )
        return {"message": "User unfollowed", "is_following": False}
    else:
        # Follow
        users_collection.update_one(
            {"user_id": current_user['user_id']},
            {"$push": {"following": user_id}}
        )
        users_collection.update_one(
            {"user_id": user_id},
            {"$push": {"followers": current_user['user_id']}}
        )
        return {"message": "User followed", "is_following": True}

@app.get("/api/profile/followers/{user_id}")
async def get_followers(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get user's followers"""
    user = users_collection.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    followers = []
    for follower_id in user.get('followers', []):
        follower = users_collection.find_one(
            {"user_id": follower_id},
            {"user_id": 1, "name": 1, "goal": 1}
        )
        if follower:
            followers.append(follower)
    
    return {"followers": followers}

@app.get("/api/profile/following/{user_id}")
async def get_following(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get users that this user is following"""
    user = users_collection.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    following = []
    for following_id in user.get('following', []):
        following_user = users_collection.find_one(
            {"user_id": following_id},
            {"user_id": 1, "name": 1, "goal": 1}
        )
        if following_user:
            following.append(following_user)
    
    return {"following": following}

# Authentication endpoints
@app.post("/api/auth/signup")
async def signup(user: UserSignup):
    # Check if user exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "password": hashed_password,
        "goal": user.goal,
        "created_at": datetime.utcnow(),
        "followers": [],
        "following": [],
        "posts_count": 0,
        "current_streak": 0,
        "longest_streak": 0,
        "daily_calorie_goal": 2000,
        "daily_protein_goal": 150,
        "daily_carbs_goal": 250,
        "daily_fat_goal": 70
    }
    
    users_collection.insert_one(user_doc)
    token = create_jwt_token(user_id)
    
    return {"token": token, "user": {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "goal": user.goal
    }}

@app.post("/api/auth/login")
async def login(user: UserLogin):
    user_doc = users_collection.find_one({"email": user.email})
    if not user_doc or not verify_password(user.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user_doc['user_id'])
    return {"token": token, "user": {
        "user_id": user_doc['user_id'],
        "email": user_doc['email'],
        "name": user_doc['name'],
        "goal": user_doc['goal']
    }}

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user['user_id'],
        "email": current_user['email'],
        "name": current_user['name'],
        "goal": current_user['goal'],
        "followers": len(current_user.get('followers', [])),
        "following": len(current_user.get('following', [])),
        "posts_count": current_user.get('posts_count', 0),
        "current_streak": current_user.get('current_streak', 0),
        "longest_streak": current_user.get('longest_streak', 0)
    }

# Meal tracking endpoints
@app.post("/api/meals/log")
async def log_meal(meal: MealLog, current_user: dict = Depends(get_current_user)):
    meal_id = str(uuid.uuid4())
    meal_doc = {
        "meal_id": meal_id,
        "user_id": current_user['user_id'],
        "name": meal.name,
        "ingredients": meal.ingredients,
        "quantity": meal.quantity,
        "calories": meal.calories,
        "protein": meal.protein,
        "carbs": meal.carbs,
        "fat": meal.fat,
        "created_at": datetime.utcnow(),
        "date": datetime.utcnow().strftime("%Y-%m-%d")
    }
    
    meals_collection.insert_one(meal_doc)
    return {"meal_id": meal_id, "message": "Meal logged successfully"}

@app.post("/api/meals/analyze")
async def analyze_meal_photo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read and encode image
    image_data = await file.read()
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    # Analyze with AI
    analysis = await analyze_meal_with_ai(image_base64, file.filename)
    
    # Save analyzed meal
    meal_id = str(uuid.uuid4())
    meal_doc = {
        "meal_id": meal_id,
        "user_id": current_user['user_id'],
        "name": analysis.get('name', 'Unknown meal'),
        "ingredients": analysis.get('ingredients', ''),
        "calories": analysis.get('calories', 0),
        "protein": analysis.get('protein', 0),
        "carbs": analysis.get('carbs', 0),
        "fat": analysis.get('fat', 0),
        "confidence": analysis.get('confidence', 5),
        "created_at": datetime.utcnow(),
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "analyzed_by_ai": True
    }
    
    meals_collection.insert_one(meal_doc)
    
    return {
        "meal_id": meal_id,
        "analysis": analysis,
        "message": "Meal analyzed and logged successfully"
    }

@app.get("/api/meals/today")
async def get_today_meals(current_user: dict = Depends(get_current_user)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    meals = list(meals_collection.find(
        {"user_id": current_user['user_id'], "date": today},
        {"_id": 0}
    ).sort("created_at", -1))
    
    # Calculate totals
    total_calories = sum(meal.get('calories', 0) for meal in meals)
    total_protein = sum(meal.get('protein', 0) for meal in meals)
    total_carbs = sum(meal.get('carbs', 0) for meal in meals)
    total_fat = sum(meal.get('fat', 0) for meal in meals)
    
    return {
        "meals": meals,
        "totals": {
            "calories": total_calories,
            "protein": total_protein,
            "carbs": total_carbs,
            "fat": total_fat
        },
        "goals": {
            "calories": current_user.get('daily_calorie_goal', 2000),
            "protein": current_user.get('daily_protein_goal', 150),
            "carbs": current_user.get('daily_carbs_goal', 250),
            "fat": current_user.get('daily_fat_goal', 70)
        }
    }

@app.get("/api/meals/history")
async def get_meal_history(current_user: dict = Depends(get_current_user)):
    meals = list(meals_collection.find(
        {"user_id": current_user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).limit(50))
    
    return {"meals": meals}

# Basic social endpoints
@app.post("/api/posts/create")
async def create_post(post: PostCreate, current_user: dict = Depends(get_current_user)):
    post_id = str(uuid.uuid4())
    post_doc = {
        "post_id": post_id,
        "user_id": current_user['user_id'],
        "author_name": current_user['name'],
        "content": post.content,
        "image_url": post.image_url,
        "meal_id": post.meal_id,
        "likes": [],
        "comments": [],
        "created_at": datetime.utcnow()
    }
    
    posts_collection.insert_one(post_doc)
    
    # Update user posts count
    users_collection.update_one(
        {"user_id": current_user['user_id']},
        {"$inc": {"posts_count": 1}}
    )
    
    return {"post_id": post_id, "message": "Post created successfully"}

@app.get("/api/posts/feed")
async def get_feed(current_user: dict = Depends(get_current_user)):
    """Get personalized feed based on following"""
    following = current_user.get('following', [])
    
    # Include own posts and posts from followed users
    user_ids = following + [current_user['user_id']]
    
    posts = list(posts_collection.find(
        {"user_id": {"$in": user_ids}} if user_ids else {},
        {"_id": 0}
    ).sort("created_at", -1).limit(20))
    
    # If no personalized posts, show global feed
    if not posts:
        posts = list(posts_collection.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).limit(20))
    
    return {"posts": posts}

@app.get("/api/posts/discover")
async def get_discover_feed(current_user: dict = Depends(get_current_user)):
    """Get discover feed with all posts"""
    posts = list(posts_collection.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(50))
    
    return {"posts": posts}

@app.get("/api/posts/user/{user_id}")
async def get_user_posts(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get posts from a specific user"""
    posts = list(posts_collection.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20))
    
    return {"posts": posts}

@app.post("/api/posts/share-meal/{meal_id}")
async def share_meal_as_post(meal_id: str, current_user: dict = Depends(get_current_user)):
    """Share a meal as a post"""
    meal = meals_collection.find_one({"meal_id": meal_id, "user_id": current_user['user_id']})
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    post_id = str(uuid.uuid4())
    post_doc = {
        "post_id": post_id,
        "user_id": current_user['user_id'],
        "author_name": current_user['name'],
        "content": f"Just had {meal['name']}! 🍽️\n\n📊 Nutrition:\n• {meal.get('calories', 0)} calories\n• {meal.get('protein', 0)}g protein\n• {meal.get('carbs', 0)}g carbs\n• {meal.get('fat', 0)}g fat",
        "image_url": None,
        "meal_id": meal_id,
        "likes": [],
        "comments": [],
        "created_at": datetime.utcnow()
    }
    
    posts_collection.insert_one(post_doc)
    
    # Update user posts count
    users_collection.update_one(
        {"user_id": current_user['user_id']},
        {"$inc": {"posts_count": 1}}
    )
    
    return {"post_id": post_id, "message": "Meal shared successfully"}

@app.post("/api/posts/{post_id}/like")
async def like_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = posts_collection.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    likes = post.get('likes', [])
    user_id = current_user['user_id']
    
    if user_id in likes:
        # Unlike
        posts_collection.update_one(
            {"post_id": post_id},
            {"$pull": {"likes": user_id}}
        )
        return {"message": "Post unliked"}
    else:
        # Like
        posts_collection.update_one(
            {"post_id": post_id},
            {"$push": {"likes": user_id}}
        )
        return {"message": "Post liked"}

@app.post("/api/posts/{post_id}/comment")
async def comment_on_post(post_id: str, comment: CommentCreate, current_user: dict = Depends(get_current_user)):
    """Add a comment to a post"""
    post = posts_collection.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment_doc = {
        "comment_id": str(uuid.uuid4()),
        "user_id": current_user['user_id'],
        "author_name": current_user['name'],
        "content": comment.content,
        "created_at": datetime.utcnow()
    }
    
    posts_collection.update_one(
        {"post_id": post_id},
        {"$push": {"comments": comment_doc}}
    )
    
    return {"message": "Comment added successfully"}

@app.get("/api/posts/{post_id}/comments")
async def get_post_comments(post_id: str, current_user: dict = Depends(get_current_user)):
    """Get comments for a specific post"""
    post = posts_collection.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comments = post.get('comments', [])
    return {"comments": comments}

@app.post("/api/posts/{post_id}/upload-image")
async def upload_post_image(post_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload an image for a post"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # For now, we'll just return a dummy URL
    # In production, you'd upload to a service like AWS S3 or similar
    image_url = f"https://api.eatflex.com/images/{post_id}_{file.filename}"
    
    return {"image_url": image_url}

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": "EatFlex API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)