# 📱 Demo App (Prototype)


https://github.com/user-attachments/assets/41dee7f6-34cc-4076-a824-746e7942ff2d


A prototype **mobile app** showcasing basic navigation and layout using mock data.  
The app features the following main sections:

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

---

## 🔐 Login

- Opens with a **Login screen** featuring a “Sign in with Apple” button.  
- This screen is **UI-only for demo purposes** — authentication logic is not yet implemented.  
- Tapping the button transitions directly to the **Home screen**.

---

## 🏠 Home (Recommendations)

- Displays a **scrollable list of recommendation cards** after login.  
- Each card shows a mock recommendation with:
  - 🖼 Image  
  - 📝 Title  
  - 💬 Description  
- A **bottom navigation bar** allows switching between Home and Profile.

---

## 🙍 Profile

- Accessible via the **bottom tab bar**.  
- Shows:
  - 👤 User avatar  
  - 🏷 Nickname  
  - ⚙️ Action buttons like “Edit Profile” and “Logout”  
- All contents are **placeholders for now**.

---

## 🚧 Future Improvements

- ✅ Real social login integration (Apple, Google, Kakao)  
- ✅ Backend connection for personalized recommendations  
- ✅ Profile editing functionality and data persistence  
- ✅ State management and error handling  

---
