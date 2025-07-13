import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('tracker');
  const [meals, setMeals] = useState([]);
  const [todayTotals, setTodayTotals] = useState({});
  const [dailyGoals, setDailyGoals] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auth states
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: '',
    goal: 'maintenance'
  });

  // Meal logging states
  const [mealForm, setMealForm] = useState({
    name: '',
    ingredients: '',
    quantity: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });

  // Photo upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // API helper function
  const apiCall = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    return response.json();
  };

  // Load user data on mount
  useEffect(() => {
    if (token) {
      loadUserData();
    }
  }, [token]);

  const loadUserData = async () => {
    try {
      const userData = await apiCall('/api/auth/me');
      setUser(userData);
      loadTodayMeals();
      loadFeed();
    } catch (error) {
      console.error('Failed to load user data:', error);
      handleLogout();
    }
  };

  const loadTodayMeals = async () => {
    try {
      const data = await apiCall('/api/meals/today');
      setMeals(data.meals || []);
      setTodayTotals(data.totals || {});
      setDailyGoals(data.goals || {});
    } catch (error) {
      console.error('Failed to load meals:', error);
    }
  };

  const loadFeed = async () => {
    try {
      const data = await apiCall('/api/posts/feed');
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to load feed:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const data = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(authForm)
      });
      
      setToken(data.token);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setAuthForm({ email: '', password: '', name: '', goal: 'maintenance' });
    } catch (error) {
      alert(`${authMode === 'login' ? 'Login' : 'Signup'} failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setActiveTab('tracker');
  };

  const handleMealLog = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await apiCall('/api/meals/log', {
        method: 'POST',
        body: JSON.stringify({
          ...mealForm,
          calories: parseInt(mealForm.calories) || 0,
          protein: parseFloat(mealForm.protein) || 0,
          carbs: parseFloat(mealForm.carbs) || 0,
          fat: parseFloat(mealForm.fat) || 0
        })
      });
      
      setMealForm({ name: '', ingredients: '', quantity: '', calories: '', protein: '', carbs: '', fat: '' });
      loadTodayMeals();
      alert('Meal logged successfully!');
    } catch (error) {
      alert(`Failed to log meal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoAnalysis = async () => {
    if (!selectedFile) return;
    
    setAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch(`${API_BASE_URL}/api/meals/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const data = await response.json();
      alert(`Meal analyzed! ${data.analysis.name}: ${data.analysis.calories} cal, ${data.analysis.protein}g protein`);
      setSelectedFile(null);
      loadTodayMeals();
    } catch (error) {
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      await apiCall(`/api/posts/${postId}/like`, { method: 'POST' });
      loadFeed();
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const MacroBar = ({ label, current, goal, color }) => {
    const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    
    return (
      <div className="macro-bar">
        <div className="macro-header">
          <span className="macro-label">{label}</span>
          <span className="macro-values">{current.toFixed(1)} / {goal}</span>
        </div>
        <div className="macro-progress">
          <div 
            className="macro-fill" 
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
      </div>
    );
  };

  // Auth Screen
  if (!user) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-header">
            <h1 className="app-title">EatFlex</h1>
            <p className="app-subtitle">AI-Powered Fitness & Social Nutrition</p>
          </div>
          
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button 
              className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
              onClick={() => setAuthMode('signup')}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {authMode === 'signup' && (
              <input
                type="text"
                placeholder="Full Name"
                value={authForm.name}
                onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                required
              />
            )}
            
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
              required
            />
            
            {authMode === 'signup' && (
              <select
                value={authForm.goal}
                onChange={(e) => setAuthForm({...authForm, goal: e.target.value})}
              >
                <option value="bulking">Bulking</option>
                <option value="cutting">Cutting</option>
                <option value="maintenance">Maintenance</option>
              </select>
            )}
            
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>EatFlex</h1>
        </div>
        
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'tracker' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracker')}
          >
            🍽️ Tracker
          </button>
          <button 
            className={`nav-tab ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            📱 Feed
          </button>
          <button 
            className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
        </div>
        
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'tracker' && (
          <div className="tracker-section">
            <h2>Daily Nutrition Tracker</h2>
            
            {/* Daily Overview */}
            <div className="daily-overview">
              <h3>Today's Progress</h3>
              <div className="macro-bars">
                <MacroBar 
                  label="Calories" 
                  current={todayTotals.calories || 0} 
                  goal={dailyGoals.calories || 2000}
                  color="#00ff41"
                />
                <MacroBar 
                  label="Protein (g)" 
                  current={todayTotals.protein || 0} 
                  goal={dailyGoals.protein || 150}
                  color="#ff4136"
                />
                <MacroBar 
                  label="Carbs (g)" 
                  current={todayTotals.carbs || 0} 
                  goal={dailyGoals.carbs || 250}
                  color="#ffdc00"
                />
                <MacroBar 
                  label="Fat (g)" 
                  current={todayTotals.fat || 0} 
                  goal={dailyGoals.fat || 70}
                  color="#0074d9"
                />
              </div>
            </div>

            {/* AI Photo Analysis */}
            <div className="photo-analysis">
              <h3>📸 AI Meal Analysis</h3>
              <div className="photo-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="upload-label">
                  {selectedFile ? selectedFile.name : 'Choose Photo'}
                </label>
                <button 
                  onClick={handlePhotoAnalysis}
                  disabled={!selectedFile || analyzing}
                  className="analyze-button"
                >
                  {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                </button>
              </div>
            </div>

            {/* Manual Meal Log */}
            <div className="manual-log">
              <h3>Manual Meal Log</h3>
              <form onSubmit={handleMealLog} className="meal-form">
                <input
                  type="text"
                  placeholder="Meal name"
                  value={mealForm.name}
                  onChange={(e) => setMealForm({...mealForm, name: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="Ingredients"
                  value={mealForm.ingredients}
                  onChange={(e) => setMealForm({...mealForm, ingredients: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Quantity"
                  value={mealForm.quantity}
                  onChange={(e) => setMealForm({...mealForm, quantity: e.target.value})}
                />
                <div className="macro-inputs">
                  <input
                    type="number"
                    placeholder="Calories"
                    value={mealForm.calories}
                    onChange={(e) => setMealForm({...mealForm, calories: e.target.value})}
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Protein (g)"
                    value={mealForm.protein}
                    onChange={(e) => setMealForm({...mealForm, protein: e.target.value})}
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Carbs (g)"
                    value={mealForm.carbs}
                    onChange={(e) => setMealForm({...mealForm, carbs: e.target.value})}
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Fat (g)"
                    value={mealForm.fat}
                    onChange={(e) => setMealForm({...mealForm, fat: e.target.value})}
                  />
                </div>
                <button type="submit" disabled={loading} className="log-button">
                  {loading ? 'Logging...' : 'Log Meal'}
                </button>
              </form>
            </div>

            {/* Today's Meals */}
            <div className="todays-meals">
              <h3>Today's Meals</h3>
              <div className="meals-list">
                {meals.length === 0 ? (
                  <p className="no-meals">No meals logged today. Start by analyzing a photo or logging manually!</p>
                ) : (
                  meals.map((meal, index) => (
                    <div key={index} className="meal-card">
                      <div className="meal-header">
                        <h4>{meal.name}</h4>
                        {meal.analyzed_by_ai && <span className="ai-badge">AI</span>}
                      </div>
                      <div className="meal-macros">
                        <span>{meal.calories || 0} cal</span>
                        <span>{meal.protein || 0}g protein</span>
                        <span>{meal.carbs || 0}g carbs</span>
                        <span>{meal.fat || 0}g fat</span>
                      </div>
                      {meal.ingredients && (
                        <p className="meal-ingredients">{meal.ingredients}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="feed-section">
            <h2>Social Feed</h2>
            <div className="posts-container">
              {posts.length === 0 ? (
                <p className="no-posts">No posts yet. Be the first to share your meal!</p>
              ) : (
                posts.map((post, index) => (
                  <div key={index} className="post-card">
                    <div className="post-header">
                      <h4>{post.author_name}</h4>
                      <span className="post-time">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="post-content">
                      <p>{post.content}</p>
                      {post.image_url && (
                        <img src={post.image_url} alt="Post" className="post-image" />
                      )}
                    </div>
                    <div className="post-actions">
                      <button 
                        onClick={() => handleLike(post.post_id)}
                        className={`like-button ${post.likes?.includes(user.user_id) ? 'liked' : ''}`}
                      >
                        💪 {post.likes?.length || 0}
                      </button>
                      <button className="comment-button">
                        💬 {post.comments?.length || 0}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-section">
            <h2>Profile</h2>
            <div className="profile-card">
              <h3>{user.name}</h3>
              <p className="profile-goal">Goal: {user.goal}</p>
              <div className="profile-stats">
                <div className="stat">
                  <span className="stat-number">{user.posts_count || 0}</span>
                  <span className="stat-label">Posts</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{user.followers || 0}</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{user.following || 0}</span>
                  <span className="stat-label">Following</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{user.current_streak || 0}</span>
                  <span className="stat-label">Current Streak</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;