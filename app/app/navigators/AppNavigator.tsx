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

  const checkLoginStatus = useCallback(async () => {
    const loginStatus = await storage.loadString("IS_LOGGED_IN")

    if (loginStatus === "true") {
      // If IS_LOGGED_IN flag exists, verify if the actual session is valid
      try {
        await api.getCsrf() // Get CSRF token first
        const response = await api.me() // Verify session with actual API call

        if (response.ok) {
          // Session is valid
          setIsLoggedIn((prevLoggedIn) => {
            if (prevLoggedIn !== true) {
              // Reset navigation to Foodigram when logging in
              setTimeout(() => {
                if (navigationRef.isReady()) {
                  navigationRef.reset({
                    index: 0,
                    routes: [{ name: "Foodigram" }],
                  })
                }
              }, 0)
            }
            return true
          })
        } else {
          // Session is invalid - remove flag and logout
          await storage.remove("IS_LOGGED_IN")
          setIsLoggedIn((prevLoggedIn) => {
            if (prevLoggedIn !== false) {
              // Reset navigation to Welcome when logging out
              setTimeout(() => {
                if (navigationRef.isReady()) {
                  navigationRef.reset({
                    index: 0,
                    routes: [{ name: "Welcome" }],
                  })
                }
              }, 0)
            }
            return false
          })
        }
      } catch (error) {
        // Network error or other issues - safely logout
        await storage.remove("IS_LOGGED_IN")
        setIsLoggedIn((prevLoggedIn) => {
          if (prevLoggedIn !== false) {
            // Reset navigation to Welcome when logging out
            setTimeout(() => {
              if (navigationRef.isReady()) {
                navigationRef.reset({
                  index: 0,
                  routes: [{ name: "Welcome" }],
                })
              }
            }, 0)
          }
          return false
        })
      }
    } else {
      setIsLoggedIn((prevLoggedIn) => {
        if (prevLoggedIn !== false && prevLoggedIn !== null) {
          // Reset navigation to Welcome when logging out
          setTimeout(() => {
            if (navigationRef.isReady()) {
              navigationRef.reset({
                index: 0,
                routes: [{ name: "Welcome" }],
              })
            }
          }, 0)
        }
        return false
      })
    }
  }, [])

  useEffect(() => {
    // Check login status on mount
    checkLoginStatus()

    // Listen for app state changes to re-check login status
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        checkLoginStatus()
      }
    })

    // Periodically check login status to catch both login completions and logouts
    let intervalId: NodeJS.Timeout | null = null
    if (!isLoggedIn) {
      // Check frequently when not logged in (to catch login completions)
      intervalId = setInterval(() => {
        checkLoginStatus()
      }, 500) // Check every 500ms when not logged in
    } else {
      // Check periodically when logged in (to catch logouts)
      intervalId = setInterval(() => {
        checkLoginStatus()
      }, 1000) // Check every 1s when logged in
    }

    return () => {
      subscription.remove()
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [checkLoginStatus, isLoggedIn])

  if (isLoggedIn === null) {
    // Still checking login status, could show a splash screen here
    return null
  }

  // Single stack with all screens
  return (
    <Stack.Navigator
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
