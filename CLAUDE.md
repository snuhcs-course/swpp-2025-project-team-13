# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native mobile app with a Django REST API backend. The project follows a typical full-stack architecture with separate client and server directories.

- **Frontend**: React Native app built with Expo and Ignite boilerplate
- **Backend**: Django REST API with custom user authentication and social features

## Development Commands

### Frontend (React Native)
All frontend commands should be run from the `app/` directory:

```bash
cd app/

# Development
npm start              # Start Expo development server
npm run android        # Run on Android
npm run ios           # Run on iOS
npm run web           # Run on web

# Code Quality
npm run lint          # Run ESLint and Prettier
npm run compile       # TypeScript type checking
npm test              # Run Jest tests
npm run test:watch    # Run tests in watch mode

# Building
npm run build:android:dev    # Build Android development
npm run build:ios:dev       # Build iOS development
npm run build:android:prod  # Build Android production
npm run build:ios:prod     # Build iOS production
```

### Backend (Django)
All backend commands should be run from the `server/` directory:

```bash
cd server/

# Development
python manage.py runserver    # Start development server
python manage.py makemigrations  # Create database migrations
python manage.py migrate        # Apply migrations
python manage.py test          # Run tests
python manage.py createsuperuser  # Create admin user

# Django admin
python manage.py shell        # Django shell
python manage.py collectstatic  # Collect static files
```

## Project Architecture

### Frontend Architecture (React Native + Expo)
- **Framework**: React Native with Expo
- **State Management**: MobX State Tree (MST)
- **Navigation**: React Navigation v6
- **UI**: Custom components with theme system
- **Internationalization**: i18n-js with multiple language support
- **Testing**: Jest with React Native Testing Library

**Key Directories:**
- `app/app/components/` - Reusable UI components
- `app/app/screens/` - Screen components 
- `app/app/models/` - MobX State Tree models
- `app/app/navigators/` - Navigation configuration
- `app/app/services/` - API and external service integrations
- `app/app/theme/` - Colors, typography, spacing definitions
- `app/app/utils/` - Shared utilities and helpers

### Backend Architecture (Django REST Framework)
- **Framework**: Django 5.2.6 with Django REST Framework
- **Database**: SQLite (development)
- **Authentication**: Custom User model with session authentication
- **API**: RESTful API with ViewSets and custom actions

**Key Features:**
- Custom User model extending AbstractUser
- Profile system with JSON preferences
- Follow/Following system with request/accept flow
- Follow suggestions functionality
- Pagination (20 items per page)

**Models:**
- `User` - Custom user with unique email
- `Profile` - User profiles with bio and preferences
- `Follow` - Follow relationships with status (requested/accepted)

## Code Conventions

### Frontend
- TypeScript with strict mode enabled
- ESLint with Standard config + React Native rules
- Prettier for code formatting (100 char line width, no semicolons)
- Path aliases: `app/*` and `assets/*`
- MobX State Tree for state management patterns

### Backend  
- Django REST Framework ViewSets
- Service layer pattern in `services.py` files
- Custom permissions and serializers
- Database constraints for data integrity

## Testing

### Frontend Testing
- Jest configuration in `app/jest.config.js`
- Test files should be co-located with components
- Use React Native Testing Library for component tests
- Maestro for end-to-end testing

### Backend Testing
- Django's built-in test framework
- Test files in each app's `tests.py`

## Important Notes

- The frontend uses Ignite boilerplate structure
- Custom User model is configured (`AUTH_USER_MODEL = 'users.User'`)
- Frontend has strict TypeScript configuration
- Both apps are in early development stage with basic Welcome screen
- Follow system includes request/accept workflow for privacy