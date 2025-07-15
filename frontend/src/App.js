import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8001';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('tracker');
  const [meals, setMeals] = useState([]);
  const [todayTotals, setTodayTotals] = useState({});
  const [dailyGoals, setDailyGoals] = useState({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // New social features states
  const [newPost, setNewPost] = useState({ content: '', image: null });
  const [showComments, setShowComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [editingPost, setEditingPost] = useState({});
  const [editingComment, setEditingComment] = useState({});
  const [profileEdit, setProfileEdit] = useState({
    name: '',
    bio: '',
    goal: '',
    daily_calorie_goal: '',
    daily_protein_goal: '',
    daily_carbs_goal: '',
    daily_fat_goal: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

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
      console.log('Making request to:', `${API_BASE_URL}${endpoint}`);
      console.log('Request body:', authForm);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authForm)
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      setToken(data.token);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setAuthForm({ email: '', password: '', name: '', goal: 'maintenance' });
    } catch (error) {
      console.error('Auth error:', error);
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

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) return;
    
    setLoading(true);
    try {
      let imageUrl = null;
      
      // Upload image if provided
      if (newPost.image) {
        const formData = new FormData();
        formData.append('file', newPost.image);
        
        const response = await fetch(`${API_BASE_URL}/api/posts/temp/upload-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          imageUrl = data.image_url;
        }
      }
      
      await apiCall('/api/posts/create', {
        method: 'POST',
        body: JSON.stringify({
          content: newPost.content,
          image_url: imageUrl
        })
      });
      
      setNewPost({ content: '', image: null });
      loadFeed();
      alert('Post created successfully!');
    } catch (error) {
      alert(`Failed to create post: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async (postId, commentContent) => {
    if (!commentContent.trim()) return;
    
    try {
      await apiCall(`/api/posts/${postId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ content: commentContent })
      });
      
      setNewComment({ ...newComment, [postId]: '' });
      loadFeed();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleEditPost = async (postId, newContent) => {
    if (!newContent.trim()) return;
    
    try {
      await apiCall(`/api/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent })
      });
      
      setEditingPost({ ...editingPost, [postId]: false });
      loadFeed();
    } catch (error) {
      console.error('Failed to edit post:', error);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await apiCall(`/api/posts/${postId}`, {
        method: 'DELETE'
      });
      
      loadFeed();
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const handleEditComment = async (postId, commentId, newContent) => {
    if (!newContent.trim()) return;
    
    try {
      await apiCall(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: newContent })
      });
      
      setEditingComment({ ...editingComment, [commentId]: false });
      loadFeed();
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await apiCall(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE'
      });
      
      loadFeed();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const updateData = {};
      Object.keys(profileEdit).forEach(key => {
        if (profileEdit[key] && profileEdit[key] !== user[key]) {
          updateData[key] = profileEdit[key];
        }
      });
      
      if (Object.keys(updateData).length > 0) {
        await apiCall('/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });
        
        // Update local user state
        setUser({ ...user, ...updateData });
        alert('Profile updated successfully!');
      }
      
      setIsEditingProfile(false);
    } catch (error) {
      alert(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShareMeal = async (mealId) => {
    try {
      await apiCall(`/api/posts/share-meal/${mealId}`, { method: 'POST' });
      alert('Meal shared to feed!');
      loadFeed();
    } catch (error) {
      console.error('Failed to share meal:', error);
    }
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  // Image Modal Component
  const ImageModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;
    
    return (
      <div className="image-modal-overlay" onClick={onClose}>
        <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="image-modal-close" onClick={onClose}>
            ✕
          </button>
          <img src={imageUrl} alt="Full size" className="image-modal-img" />
        </div>
      </div>
    );
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
      <div className="min-h-screen bg-gray-100 flex flex-col">
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
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              />
            )}
            
            <input
              type="email"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
            
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
            
            {authMode === 'signup' && (
              <select
                value={authForm.goal}
                onChange={(e) => setAuthForm({...authForm, goal: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="bulking">Bulking</option>
                <option value="cutting">Cutting</option>
                <option value="maintenance">Maintenance</option>
              </select>
            )}
            
            <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
              {loading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
            </button>
            <button 
              type="button" 
              onClick={async () => {
                console.log('Direct test button clicked');
                try {
                  const response = await fetch('http://127.0.0.1:8001/api/health');
                  const data = await response.json();
                  console.log('Health check success:', data);
                  alert('Health check success: ' + JSON.stringify(data));
                } catch (error) {
                  console.error('Health check failed:', error);
                  toast.error('Health check failed: ' + error.message);
                }
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
              style={{marginTop: '10px', backgroundColor: '#007bff'}}
            >
              Test API Connection
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
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
                      <button 
                        onClick={() => handleShareMeal(meal.meal_id)}
                        className="share-meal-button"
                      >
                        📤 Share
                      </button>
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
            
            {/* Post Creation Form */}
            <div className="create-post-section">
              <h3>Share Your Experience</h3>
              <form onSubmit={handleCreatePost} className="create-post-form">
                <textarea
                  placeholder="What's on your mind? Share your meal, workout, or progress!"
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  rows="3"
                  className="post-content-input"
                />
                <div className="post-actions-row">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewPost({...newPost, image: e.target.files[0]})}
                    id="post-image-upload"
                    className="hidden"
                  />
                  <label htmlFor="post-image-upload" className="image-upload-label">
                    📷 {newPost.image ? 'Image selected' : 'Add Photo'}
                  </label>
                  <button type="submit" disabled={loading || !newPost.content.trim()} className="post-submit-button">
                    {loading ? 'Posting...' : '📝 Post'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Posts Feed */}
            <div className="posts-container">
              {posts.length === 0 ? (
                <p className="no-posts">No posts yet. Be the first to share your meal!</p>
              ) : (
                posts.map((post, index) => (
                  <div key={index} className="post-card">
                    <div className="post-header">
                      <h4>{post.author_name}</h4>
                      <div className="post-header-right">
                        <span className="post-time">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                        {post.user_id === user.user_id && (
                          <div className="post-options">
                            <button 
                              onClick={() => setEditingPost({ ...editingPost, [post.post_id]: post.content })}
                              className="edit-button"
                              title="Edit post"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDeletePost(post.post_id)}
                              className="delete-button"
                              title="Delete post"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="post-content">
                      {editingPost[post.post_id] !== undefined ? (
                        <div className="edit-post-form">
                          <textarea
                            value={editingPost[post.post_id]}
                            onChange={(e) => setEditingPost({ ...editingPost, [post.post_id]: e.target.value })}
                            className="edit-post-input"
                            rows="3"
                          />
                          <div className="edit-post-actions">
                            <button 
                              onClick={() => handleEditPost(post.post_id, editingPost[post.post_id])}
                              className="save-button"
                            >
                              ✅ Save
                            </button>
                            <button 
                              onClick={() => setEditingPost({ ...editingPost, [post.post_id]: undefined })}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded-md text-sm transition-colors"
                            >
                              ❌ Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p>{post.content}</p>
                          {post.image_url && (
                            <img 
                              src={post.image_url} 
                              alt="Post" 
                              className="post-image"
                              onClick={() => setSelectedImage(post.image_url)}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                console.log('Image failed to load:', post.image_url);
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="post-actions">
                      <button 
                        onClick={() => handleLike(post.post_id)}
                        className={`like-button ${post.likes?.includes(user.user_id) ? 'liked' : ''}`}
                      >
                        💪 {post.likes?.length || 0}
                      </button>
                      <button 
                        onClick={() => toggleComments(post.post_id)}
                        className="comment-button"
                      >
                        💬 {post.comments?.length || 0}
                      </button>
                    </div>
                    
                    {/* Comments Section */}
                    {showComments[post.post_id] && (
                      <div className="comments-section">
                        <div className="comments-list">
                          {post.comments?.map((comment, commentIndex) => (
                            <div key={commentIndex} className="comment">
                              <div className="comment-header">
                                <strong>{comment.author_name}</strong>
                                <span className="comment-time">
                                  {new Date(comment.created_at).toLocaleTimeString()}
                                </span>
                                {comment.user_id === user.user_id && (
                                  <div className="comment-options">
                                    <button 
                                      onClick={() => setEditingComment({ ...editingComment, [comment.comment_id]: comment.content })}
                                      className="edit-comment-button"
                                      title="Edit comment"
                                    >
                                      ✏️
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteComment(post.post_id, comment.comment_id)}
                                      className="delete-comment-button"
                                      title="Delete comment"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="comment-content">
                                {editingComment[comment.comment_id] !== undefined ? (
                                  <div className="edit-comment-form">
                                    <input
                                      type="text"
                                      value={editingComment[comment.comment_id]}
                                      onChange={(e) => setEditingComment({ ...editingComment, [comment.comment_id]: e.target.value })}
                                      className="edit-comment-input"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          handleEditComment(post.post_id, comment.comment_id, editingComment[comment.comment_id]);
                                        }
                                      }}
                                    />
                                    <div className="edit-comment-actions">
                                      <button 
                                        onClick={() => handleEditComment(post.post_id, comment.comment_id, editingComment[comment.comment_id])}
                                        className="save-comment-button"
                                      >
                                        ✅
                                      </button>
                                      <button 
                                        onClick={() => setEditingComment({ ...editingComment, [comment.comment_id]: undefined })}
                                        className="cancel-comment-button"
                                      >
                                        ❌
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span>{comment.content}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="add-comment">
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={newComment[post.post_id] || ''}
                            onChange={(e) => setNewComment({...newComment, [post.post_id]: e.target.value})}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleComment(post.post_id, newComment[post.post_id]);
                              }
                            }}
                            className="comment-input"
                          />
                          <button 
                            onClick={() => handleComment(post.post_id, newComment[post.post_id])}
                            className="comment-submit-button"
                          >
                            📩
                          </button>
                        </div>
                      </div>
                    )}
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
              {user.bio && <p className="profile-bio">{user.bio}</p>}
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
            
            {/* Profile Edit Button */}
            <div className="profile-actions">
              <button 
                className="edit-profile-button"
                onClick={() => {
                  setIsEditingProfile(true);
                  setProfileEdit({
                    name: user.name || '',
                    bio: user.bio || '',
                    goal: user.goal || '',
                    daily_calorie_goal: user.daily_calorie_goal || '',
                    daily_protein_goal: user.daily_protein_goal || '',
                    daily_carbs_goal: user.daily_carbs_goal || '',
                    daily_fat_goal: user.daily_fat_goal || ''
                  });
                }}
              >
                ✏️ Edit Profile
              </button>
            </div>
            
            {/* Profile Edit Form */}
            {isEditingProfile && (
              <div className="profile-edit-card">
                <h3>Edit Profile</h3>
                <form onSubmit={handleProfileUpdate} className="profile-edit-form">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={profileEdit.name}
                    onChange={(e) => setProfileEdit({...profileEdit, name: e.target.value})}
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <textarea
                    placeholder="Bio (optional)"
                    value={profileEdit.bio}
                    onChange={(e) => setProfileEdit({...profileEdit, bio: e.target.value})}
                    rows="3"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={profileEdit.goal}
                    onChange={(e) => setProfileEdit({...profileEdit, goal: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="bulking">Bulking</option>
                    <option value="cutting">Cutting</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  
                  <h4>Daily Goals</h4>
                  <div className="goals-grid">
                    <input
                      type="number"
                      placeholder="Calorie Goal"
                      value={profileEdit.daily_calorie_goal}
                      onChange={(e) => setProfileEdit({...profileEdit, daily_calorie_goal: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Protein Goal (g)"
                      value={profileEdit.daily_protein_goal}
                      onChange={(e) => setProfileEdit({...profileEdit, daily_protein_goal: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Carbs Goal (g)"
                      value={profileEdit.daily_carbs_goal}
                      onChange={(e) => setProfileEdit({...profileEdit, daily_carbs_goal: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Fat Goal (g)"
                      value={profileEdit.daily_fat_goal}
                      onChange={(e) => setProfileEdit({...profileEdit, daily_fat_goal: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="profile-edit-actions">
                    <button type="submit" disabled={loading} className="update-button">
                      {loading ? 'Updating...' : '💾 Update Profile'}
                    </button>
                    <button 
                      type="button" 
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded-md text-sm transition-colors" 
                      onClick={() => setIsEditingProfile(false)}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
      <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      <ToastContainer />
    </div>
  );
}

export default App;
