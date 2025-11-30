# Foodigram - Iteration 5 Demo

## 📱 Project Overview

**Foodigram** is a mobile app that provides personalized food recommendation services. It recommends customized menus and restaurants based on user preferences, allergy information, location, and more.

## 🚀 Demo Setup & Execution

### Prerequisites

- **Node.js**: 18+ (recommended: 20+)
- **Python**: 3.13+ 
- **uv**: Python package manager
- **Android SDK**: minimum version 23
- **JDK**: 17 (for Gradle)
- **adb**: for Android device/emulator connection

### Optional: AWS Setup (if using AWS services)

```bash
pip install awscli
aws configure # Enter AWS credentials in .env.dev

cd app
npm install -g @aws-amplify/cli
amplify pull --appId dhwiac5kwn2e4 --envName dev
```

### Native Modules (Pre-installed)

The following native modules are already configured:

- **expo-image-picker**: Gallery multi-select for photo uploads
- **expo-location**: Location services for onboarding

```bash
cd app/
npx expo install expo-image-picker expo-location
```

### Backend Setup

```bash
# Navigate to server directory
cd server/

# Set up virtual environment and dependencies
psource venv/bin/activate  # Activate virtual environment
uv sync                    # Install dependencies with uv

# Database setup
python manage.py makemigrations  # Create database migrations
python manage.py migrate         # Apply migrations
python manage.py createsuperuser # Create admin user (required for authentication)

# Start development server
python manage.py runserver       # Start Django development server
```

### Frontend Setup

```bash
cd app/

# Install dependencies
npm install

# Development
npm start              # Start Expo development server
npm run android        # Run on Android
npm run ios           # Run on iOS
npm run web           # Run on web

# Code Quality
npm run lint          # Run ESLint and Prettier
npm run compile       # TypeScript type checking
npm test              # Run Jest tests
```

### Device Connection

For physical Android device (if login fails with NETWORK_ERROR):

```bash
adb reverse tcp:8000 tcp:8000  # Port forwarding for Django backend
```

### Important Notes

- **react-native-svg version**: Currently using v15.2.0, but note that <15 (use ~14.1.0) is recommended to avoid Android rendering issues with RNSVGPath components
- **Port forwarding**: Expo CLI doesn't auto-configure port forwarding for custom backend ports, so manual setup is required
- **Authentication**: Custom User model is configured with unique email authentication
- **Development stage**: Both frontend and backend are in early development with basic functionality

## 🎯 Demo Features

https://drive.google.com/file/d/1tlHzBuI8_7rsfAoKKlqrYBgL7qWDTa4s/view?usp=sharing

### Core Functionality

#### 1. **User Onboarding & Preference Collection**

- Taste preference settings (spicy, sweet, salty levels)
- Allergy information input
- Disliked ingredients selection
- Preferred food categories selection

#### 2. **AI-Powered Food Recommendation System**

- **Menu-level recommendations**: Individual menu item suggestions
- **Restaurant-level recommendations**: Full restaurant recommendations
- **Personalized vectors**: Customized recommendations based on user preferences
- **Hybrid scoring**: Combines text similarity, popularity, distance, and price

#### 3. **Gallery Integration & Analysis**

- Photo library access permissions
- TensorFlow.js-powered food image analysis
- User food history pattern analysis
- Automatic preference learning from gallery photos

### Achieved Goals

✅ **Personalized Recommendation System**

- Customized recommendations based on user preferences
- Multi-dimensional filtering (allergies, distance, price, etc.)

✅ **AI/ML Technology Integration**

- Korean text embedding using Sentence Transformers
- Client-side image analysis with TensorFlow.js

✅ **Scalable Architecture**

- Modular recommendation system
- Vector database utilization
- RESTful API design

✅ **Optimized User Experience**

- Intuitive onboarding flow
- Real-time recommendation results
- Responsive UI/UX

## 🎬 Demo Video

### Core Feature Demonstrations

1. **Onboarding Process**

   - User preference setting process
   - Allergy and disliked ingredient selection
   - Category preference settings

2. **Recommendation System Operation**

   - Personalized menu recommendation results
   - Filtering features (categories, allergies)
   - Real-time recommendation updates

3. **Gallery Analysis**

   - Photo library access
   - Food image analysis results
   - History-based pattern analysis

4. **API Response & Performance**
   - Recommendation API call process
   - Response time and accuracy
   - Various scenario testing

## 🛠 Technology Stack

### Frontend

- **React Native**: Cross-platform mobile app built with Expo
- **Expo**: Development and deployment platform
- **TypeScript**: Type safety with strict mode
- **MobX State Tree (MST)**: State management
- **React Navigation v6**: Navigation system
- **TensorFlow.js**: Client-side ML for food image analysis
- **Ignite**: React Native boilerplate structure
- **i18n-js**: Internationalization support

### Backend

- **Django 5.2.6**: Web framework
- **Django REST Framework**: RESTful API with ViewSets
- **Sentence Transformers**: Korean text embedding
- **scikit-learn**: Machine learning utilities
- **Custom User Model**: Extended AbstractUser with email authentication
- **Session Authentication**: Django session-based auth
- **PostgreSQL**: Production database (Docker)
- **uv**: Modern Python package manager

### Database

- **PostgreSQL**: Production database (Docker)
