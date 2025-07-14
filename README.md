# EatFlex

EatFlex is an AI-powered fitness and social nutrition web application designed to help users plan, track, and manage their meals flexibly. Built with a FastAPI Python backend and a modern React frontend, EatFlex provides a comprehensive social platform for nutrition tracking and community engagement.

## Features

### 🔐 Authentication & User Management
- **Secure User Authentication:** JWT-based login and registration system
- **Profile Customization:** Edit profile information, bio, and daily nutrition goals
- **Goal Setting:** Set personal fitness goals (bulking, cutting, maintenance)

### 🍽️ Meal Tracking & AI Analysis
- **AI-Powered Meal Analysis:** Upload photos of meals for automatic nutritional analysis using GPT-4o Vision
- **Manual Meal Logging:** Add meals with detailed nutritional information
- **Daily Progress Tracking:** Visual progress bars for calories, protein, carbs, and fat
- **Meal History:** View and track meal patterns over time

### 📱 Social Features
- **Social Feed:** Share meals, workouts, and progress with the community
- **Post Creation:** Create posts with text and images
- **Interactive Engagement:** Like and comment on posts
- **Meal Sharing:** Share your logged meals directly to your social feed
- **Community Building:** Follow other users and build a fitness community

### 📊 Nutrition Tracking
- **Comprehensive Macronutrient Tracking:** Track calories, protein, carbs, and fat
- **Customizable Daily Goals:** Set and adjust daily nutrition targets
- **Progress Visualization:** Real-time progress bars and statistics
- **Streak Tracking:** Monitor consistency with daily tracking streaks

## Technologies Used

- **Frontend:** React, HTML5, CSS3, JavaScript ES6+
- **Backend:** Python FastAPI, MongoDB
- **AI Integration:** OpenRouter API with GPT-4o Vision for meal analysis
- **Authentication:** JWT tokens with bcrypt password hashing
- **Database:** MongoDB for user data, meals, and social posts
- **Styling:** Custom CSS with modern design patterns

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3.x
- pip (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/amalxloop/EatFlex.git
   cd EatFlex
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py  # or whatever main file starts your backend
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

4. **Access the App**
   Open your browser and go to `http://localhost:3000` (or the port shown in your terminal).

## Folder Structure

```
EatFlex/
├── backend/       # Python backend application
├── frontend/      # React frontend application
├── README.md
└── ...
```

## Contributing

Contributions are welcome! Please open issues to discuss any major changes and submit pull requests for review.

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please open an issue or contact [amalxloop](https://github.com/amalxloop).
