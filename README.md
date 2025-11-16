# Foodigram - Iteration 2 Demo

## 📱 Project Overview

**Foodigram** is a mobile app that provides personalized food recommendation services. It recommends customized menus and restaurants based on user preferences, allergy information, location, and more.

## 🚀 Demo Setup & Execution

### Prerequisites

- **Node.js**: 18+ (recommended: 20+)
- **Python**: 3.8+
- **uv**: Python package manager
- **Android SDK**: minimum version 23
- **JDK**: 17 (for Gradle)
- **adb**: for Android device/emulator connection

# AWS setup

```bash
pip install awscli
aws configure # and then enter AWS credentials in .env.dev

cd app
npm install -g @aws-amplify/cli
amplify pull --appId dhwiac5kwn2e4 --envName dev
```

## Native modules required

```bash
- expo-image-picker (gallery multi-select for “10장 업로드”)
- expo-location (온보딩 위치 사용)

cd app
npm config set legacy-peer-deps true
npx expo install expo-image-picker expo-location
```

### Backend Setup

```bash
# Turn on postgresql docker
cd server/psql/settings
docker compose up -d

# Turn on django server
cd ../.. # now at server
uv sync
uv run python manage.py migrate
uv run python manage.py createsuperuser  # Required for authentication
uv run python manage.py runserver
```

### Frontend Setup

```bash
# Java 17 required
cd app
npm install
npx expo prebuild
npm run android
```

### Device Connection

For physical Android device:

```bash
adb reverse tcp:8000 tcp:8000
```

## 🎯 Demo Features

https://github.com/user-attachments/assets/22d484f0-d6fc-4e7c-a7cb-571468e34619

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

- **React Native**: Cross-platform mobile app
- **Expo**: Development and deployment platform
- **TypeScript**: Type safety
- **MobX**: State management
- **TensorFlow.js**: Client-side ML

### Backend

- **Django**: Web framework
- **Django REST Framework**: API development
- **ChromaDB**: Vector database
- **Sentence Transformers**: Text embedding
- **scikit-learn**: Machine learning utilities

### Database

- **SQLite**: Relational database
- **ChromaDB**: Vector search engine
