# SNU-SWPP-Template

You can use the README file to showcase and promote your mobile app. The template provided below is just a starting point. Feel free to craft your README as you see fit. 

Please note that the README doesn't affect your grade and is not included in documentation(Wiki).

# Foodigram

Recommends foods

![Application Screenshot](path_to_screenshot.png)

## Features

- Feature 1: Brief description
- Feature 2: Brief description
- ...

## Getting Started

### Prerequisites

- Minimum Android SDK Version [23]
- JDK 17 (for Gradle)
- Node.js (20+ recommended) and npm
- uv
- adb (comes with platform-tools) and a USB-connected Android device or emulator

### How to run

#### frontend:
```bash
cd app
npm install
npm run android
```

#### backend:

First, set up the django environment.
```bash
cd server
uv run python manage.py migrate
uv run python manage.py createsuperuser # this is necessary because register function is not implemented yet.
```

Then, run the app:
```bash
uv run python manage.py runserver
```

#### notes:
When running the mobile app on a physical device or emulator you must ensure the frontend can reach the backend. For example:

- adb reverse (for a device connected via USB):

```bash
# forwards device port 8000 to your machine's 8000
adb reverse tcp:8000 tcp:8000
```

- other options: use your host machine's LAN IP in the app config, or use a tunneling service.

### Installation

[Installation link here]
