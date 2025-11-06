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
import React, { useState, useEffect } from "react"
import { useColorScheme } from "react-native"
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

  useEffect(() => {
    async function checkLoginStatus() {
      const loginStatus = await storage.loadString("IS_LOGGED_IN")
      
      if (loginStatus === "true") {
        // If IS_LOGGED_IN flag exists, verify if the actual session is valid
        try {
          await api.getCsrf() // Get CSRF token first
          const response = await api.me() // Verify session with actual API call
          
          if (response.ok) {
            // Session is valid
            setIsLoggedIn(true)
          } else {
            // Session is invalid - remove flag and logout
            await storage.remove("IS_LOGGED_IN")
            setIsLoggedIn(false)
          }
        } catch (error) {
          // Network error or other issues - safely logout
          await storage.remove("IS_LOGGED_IN")
          setIsLoggedIn(false)
        }
      } else {
        setIsLoggedIn(false)
      }
    }
    checkLoginStatus()
  }, [])

  if (isLoggedIn === null) {
    // Still checking login status, could show a splash screen here
    return null
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, navigationBarColor: colors.background }}
      initialRouteName={isLoggedIn ? "Foodigram" : "Welcome"}
    >
          <Stack.Screen name="Welcome" component={Screens.WelcomeScreen} />
          <Stack.Screen name="Login" component={Screens.LoginScreen} />
          <Stack.Screen name="SignUp" component={Screens.SignUpScreen} />
          <Stack.Screen name="Onboarding" component={Screens.OnboardingScreen} />
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
