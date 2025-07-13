#!/usr/bin/env python3
"""
EatFlex Backend API Testing Suite
Tests all endpoints including authentication, meal tracking, AI analysis, and social features
"""

import requests
import sys
import json
import base64
from datetime import datetime
import os

class EatFlexAPITester:
    def __init__(self, base_url="https://41af3f92-6840-4120-a59b-0b9c2b7953cf.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_user_password = "TestPass123!"
        self.test_user_name = "Test User"

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def api_call(self, method, endpoint, data=None, files=None, expected_status=200):
        """Make API call with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files is None:
            headers['Content-Type'] = 'application/json'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers={k: v for k, v in headers.items() if k != 'Content-Type'}, files=files, data=data)
                else:
                    response = requests.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            return success, response.json() if success and response.content else {}, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_health_check(self):
        """Test health endpoint"""
        success, response, status = self.api_call('GET', '/api/health')
        return self.log_test("Health Check", success, f"Status: {status}")

    def test_user_signup(self):
        """Test user registration"""
        signup_data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "name": self.test_user_name,
            "goal": "maintenance"
        }
        
        success, response, status = self.api_call('POST', '/api/auth/signup', signup_data)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['user_id']
            return self.log_test("User Signup", True, f"User ID: {self.user_id}")
        else:
            return self.log_test("User Signup", False, f"Status: {status}, Response: {response}")

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        success, response, status = self.api_call('POST', '/api/auth/login', login_data)
        
        if success and 'token' in response:
            self.token = response['token']
            return self.log_test("User Login", True, f"Token received")
        else:
            return self.log_test("User Login", False, f"Status: {status}")

    def test_get_user_info(self):
        """Test getting current user info"""
        success, response, status = self.api_call('GET', '/api/auth/me')
        
        if success and 'user_id' in response:
            return self.log_test("Get User Info", True, f"Name: {response.get('name')}")
        else:
            return self.log_test("Get User Info", False, f"Status: {status}")

    def test_manual_meal_log(self):
        """Test manual meal logging"""
        meal_data = {
            "name": "Test Chicken Salad",
            "ingredients": "Chicken breast, lettuce, tomatoes, olive oil",
            "quantity": "1 bowl",
            "calories": 350,
            "protein": 30.5,
            "carbs": 15.2,
            "fat": 18.3
        }
        
        success, response, status = self.api_call('POST', '/api/meals/log', meal_data)
        
        if success and 'meal_id' in response:
            return self.log_test("Manual Meal Log", True, f"Meal ID: {response['meal_id']}")
        else:
            return self.log_test("Manual Meal Log", False, f"Status: {status}")

    def test_get_today_meals(self):
        """Test getting today's meals"""
        success, response, status = self.api_call('GET', '/api/meals/today')
        
        if success and 'meals' in response and 'totals' in response:
            meals_count = len(response['meals'])
            total_calories = response['totals'].get('calories', 0)
            return self.log_test("Get Today's Meals", True, f"Meals: {meals_count}, Total calories: {total_calories}")
        else:
            return self.log_test("Get Today's Meals", False, f"Status: {status}")

    def test_ai_meal_analysis(self):
        """Test AI meal analysis with a sample image"""
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77mgAAAABJRU5ErkJggg==')
        
        files = {
            'file': ('test_meal.png', test_image_data, 'image/png')
        }
        
        success, response, status = self.api_call('POST', '/api/meals/analyze', files=files)
        
        if success and 'analysis' in response:
            analysis = response['analysis']
            return self.log_test("AI Meal Analysis", True, f"Analyzed: {analysis.get('name')}, Calories: {analysis.get('calories')}")
        else:
            return self.log_test("AI Meal Analysis", False, f"Status: {status}, Response: {response}")

    def test_get_meal_history(self):
        """Test getting meal history"""
        success, response, status = self.api_call('GET', '/api/meals/history')
        
        if success and 'meals' in response:
            meals_count = len(response['meals'])
            return self.log_test("Get Meal History", True, f"History meals: {meals_count}")
        else:
            return self.log_test("Get Meal History", False, f"Status: {status}")

    def test_create_post(self):
        """Test creating a social post"""
        post_data = {
            "content": "Just had an amazing healthy meal! 💪",
            "image_url": None,
            "meal_id": None
        }
        
        success, response, status = self.api_call('POST', '/api/posts/create', post_data)
        
        if success and 'post_id' in response:
            self.test_post_id = response['post_id']
            return self.log_test("Create Post", True, f"Post ID: {response['post_id']}")
        else:
            return self.log_test("Create Post", False, f"Status: {status}")

    def test_get_feed(self):
        """Test getting social feed"""
        success, response, status = self.api_call('GET', '/api/posts/feed')
        
        if success and 'posts' in response:
            posts_count = len(response['posts'])
            return self.log_test("Get Social Feed", True, f"Posts: {posts_count}")
        else:
            return self.log_test("Get Social Feed", False, f"Status: {status}")

    def test_like_post(self):
        """Test liking a post"""
        if not hasattr(self, 'test_post_id'):
            return self.log_test("Like Post", False, "No post ID available")
        
        success, response, status = self.api_call('POST', f'/api/posts/{self.test_post_id}/like')
        
        if success:
            return self.log_test("Like Post", True, f"Message: {response.get('message')}")
        else:
            return self.log_test("Like Post", False, f"Status: {status}")

    def test_invalid_auth(self):
        """Test invalid authentication"""
        # Save current token
        original_token = self.token
        self.token = "invalid_token"
        
        success, response, status = self.api_call('GET', '/api/auth/me', expected_status=401)
        
        # Restore token
        self.token = original_token
        
        return self.log_test("Invalid Auth Handling", success, f"Correctly rejected invalid token")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting EatFlex Backend API Tests")
        print("=" * 50)
        
        # Health check
        self.test_health_check()
        
        # Authentication tests
        if self.test_user_signup():
            self.test_get_user_info()
            
            # Test login with existing user
            self.test_user_login()
            
            # Meal tracking tests
            self.test_manual_meal_log()
            self.test_get_today_meals()
            self.test_get_meal_history()
            
            # AI analysis test (core feature)
            self.test_ai_meal_analysis()
            
            # Social features tests
            if self.test_create_post():
                self.test_like_post()
            
            self.test_get_feed()
            
            # Security test
            self.test_invalid_auth()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend is working correctly.")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed. Check the issues above.")
            return 1

def main():
    """Main test runner"""
    tester = EatFlexAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())