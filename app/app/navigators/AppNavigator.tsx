/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import { observer } from "mobx-react-lite"
import React, { useState, useEffect, useCallback } from "react"
import { useColorScheme, AppState, AppStateStatus } from "react-native"
import * as Screens from "app/screens"
import Config from "../config"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { colors } from "app/theme"
import * as storage from "app/utils/storage"
import { api } from "app/services/api"
import { userAuthFacade } from "app/services/registration/UserAuthFacade"
import { useStores } from "app/models"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * If no params are allowed, pass through `undefined`. Generally speaking, we
 * recommend using your MobX-State-Tree store(s) to keep application state
 * rather than passing state through navigation params.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 *   https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type AppStackParamList = {
  Welcome: undefined
  Login: undefined
  SignUp: undefined
  Onboarding: undefined
  Foodigram: undefined
  Scrap: undefined
  Profile: undefined
  // 🔥 Your screens go here
  // IGNITE_GENERATOR_ANCHOR_APP_STACK_PARAM_LIST
}

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = observer(function AppStack() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const rootStore = useStores()

  const checkLoginStatus = useCallback(async () => {
    const loginStatus = await storage.loadString("IS_LOGGED_IN")

    if (loginStatus === "true") {
      // If IS_LOGGED_IN flag exists, verify if the actual session is valid
      try {
        await api.getCsrf() // Get CSRF token first
        const response = await api.me() // Verify session with actual API call

        if (response.ok) {
          // Django session is valid, now ensure AWS Cognito authentication
          const cognitoAuth = await userAuthFacade.checkAuthenticationStatus()
          console.log('AWS Cognito authentication status:', cognitoAuth)
          
          if (!cognitoAuth.isAuthenticated) {
            // Django session exists but Cognito session is missing - try to restore it
            console.log('Django authenticated but Cognito not - attempting to restore Cognito session')
            try {
              const storedUsername = await storage.loadString("STORED_USERNAME")
              const storedPassword = await storage.loadString("STORED_PASSWORD")
              
              if (storedUsername && storedPassword) {
                console.log(`Restoring Cognito session for user: ${storedUsername}`)
                const loginResult = await userAuthFacade.loginUser({
                  username: storedUsername,
                  password: storedPassword
                })
                
                if (!loginResult.success) {
                  console.log('Failed to restore Cognito session:', loginResult.errorMessage)
                  // Continue anyway - Django session is still valid
                }
              }
            } catch (error) {
              console.log('Error restoring Cognito session:', error)
              // Continue anyway - Django session is still valid
            }
          }
          
          // Only load user data if not already logged in (initial login)
          // This prevents clearing stores when app comes to foreground
          if (isLoggedIn !== true) {
            console.log("🔄 Session valid - loading user data from backend (initial login)")
            await rootStore.loadUserDataFromBackend()
            console.log("✅ User data loading completed - setting login state to true")
          } else {
            console.log("✅ Session valid - user already logged in, preserving existing data")
          }
          
          setIsLoggedIn(true)
        } else {
          // Session is invalid - remove flag and logout
          // Only clear user data if we were previously logged in
          if (isLoggedIn === true) {
            await storage.remove("IS_LOGGED_IN")
            await rootStore.clearUserData()
          } else {
            await storage.remove("IS_LOGGED_IN")
          }
          setIsLoggedIn(false)
        }
      } catch (error) {
        // Network error or other issues - safely logout
        // Only clear user data if we were previously logged in
        if (isLoggedIn === true) {
          await storage.remove("IS_LOGGED_IN")
          await rootStore.clearUserData()
        } else {
          await storage.remove("IS_LOGGED_IN")
        }
        setIsLoggedIn(false)
      }
    } else {
      // Only clear user data once when transitioning from logged in to logged out
      if (isLoggedIn === true) {
        await rootStore.clearUserData()
      }
      setIsLoggedIn(false)
    }
  }, [rootStore, isLoggedIn])

  useEffect(() => {
    // Check login status on mount
    checkLoginStatus()

    // Listen for app state changes to re-check login status
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        checkLoginStatus()
      }
    })

    // Only check periodically if not logged in to avoid infinite loops when logged in
    let intervalId: NodeJS.Timeout | null = null
    if (isLoggedIn !== true) {
      intervalId = setInterval(() => {
        checkLoginStatus()
      }, 10000) // Check every 10 seconds only when not logged in
    }

    return () => {
      subscription.remove()
      if (intervalId) clearInterval(intervalId)
    }
  }, [checkLoginStatus, isLoggedIn])

  if (isLoggedIn === null) {
    // Still checking login status, could show a splash screen here
    return null
  }

  // Single stack with all screens - key prop forces remount on login state change
  return (
    <Stack.Navigator
      key={isLoggedIn ? "authenticated" : "unauthenticated"}
      screenOptions={{ headerShown: false, navigationBarColor: colors.background }}
      initialRouteName={isLoggedIn ? "Foodigram" : "Welcome"}
    >
      {/* Auth screens */}
      <Stack.Screen name="Welcome" component={Screens.WelcomeScreen} />
      <Stack.Screen name="Login" component={Screens.LoginScreen} />
      <Stack.Screen name="SignUp" component={Screens.SignUpScreen} />
      <Stack.Screen name="Onboarding" component={Screens.OnboardingScreen} />
      
      {/* App screens */}
      <Stack.Screen
        name="Foodigram"
        component={Screens.FoodigramScreen}
        options={{ animation: 'none' }}
      />
      <Stack.Screen
        name="Scrap"
        component={Screens.ScrapScreen}
        options={{ animation: 'none' }}
      />
      <Stack.Screen
        name="Profile"
        component={Screens.ProfileScreen}
        options={{ animation: 'none' }}
      />
      {/** 🔥 Your screens go here */}
      {/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}
    </Stack.Navigator>
  )
})

export interface NavigationProps
  extends Partial<React.ComponentProps<typeof NavigationContainer>> {}

export const AppNavigator = observer(function AppNavigator(props: NavigationProps) {
  const colorScheme = useColorScheme()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={colorScheme === "dark" ? DarkTheme : DefaultTheme}
      {...props}
    >
      <AppStack />
    </NavigationContainer>
  )
})
