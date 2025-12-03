/**
 * These are configuration settings for the dev environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
import Constants from 'expo-constants'
import { Platform } from 'react-native'

// Get the local machine IP from Expo's manifest
// This will be automatically set when running expo start
const getApiUrl = () => {
  // Option 1: For physical Android device with adb reverse (PREFERRED)
  // Run: adb reverse tcp:8000 tcp:8000
  // This is the most secure option as Django only needs to listen on localhost
  if (Platform.OS === 'android' && __DEV__) {
    // Try localhost first (works if adb reverse is set up)
    console.log('[CONFIG] Android device detected - using localhost (requires adb reverse)')
    return "http://localhost:8000/api/v1"
  }
  
  // Option 2: For Expo Go app, use the debuggerHost which contains the machine IP
  // This requires Django to run with: python manage.py runserver 0.0.0.0:8000
  const hostUri = Constants.expoConfig?.hostUri || 
                  (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
                  (Constants as any).manifest?.debuggerHost
  
  console.log('[CONFIG] Detected hostUri:', hostUri)
  console.log('[CONFIG] Platform:', Platform.OS)
  
  if (hostUri) {
    // Extract IP address (remove port if present)
    const ip = hostUri.split(':')[0]
    const apiUrl = `http://${ip}:8000/api/v1`
    console.log('[CONFIG] Using API URL:', apiUrl)
    return apiUrl
  }
  
  // Option 3: Fallback based on platform
  const fallbackUrl = Platform.select({
    android: "http://10.0.2.2:8000/api/v1", // Android emulator
    ios: "http://localhost:8000/api/v1",     // iOS simulator
    default: "http://localhost:8000/api/v1"
  })
  
  console.log('[CONFIG] Using fallback API URL:', fallbackUrl)
  return fallbackUrl
}

export default {
  // API_URL will dynamically use the machine's IP address
  // This works for both physical devices and emulators
  API_URL: getApiUrl(),
}