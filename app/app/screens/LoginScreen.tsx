import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, TouchableOpacity, Alert } from "react-native"
import { TextField } from "app/components/TextField"
import { Button } from "app/components/Button"
import { Text } from "app/components"
import { AppStackScreenProps } from "app/navigators"
import { colors, spacing } from "app/theme"
import * as storage from "app/utils/storage"
import { api } from "app/services/api"
import { handleSignIn } from "app/services/aws/handleAwsSignin"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen = observer(function LoginScreen({ navigation }: LoginScreenProps) {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  async function tryLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter username and password.")
      return
    }

    setIsLoading(true)
    try {
      // Ensure CSRF cookie is set
      await api.getCsrf()
      const res = await api.login(username, password)
      if (!res.ok) {
        const errorMessage = (res.data as any)?.detail || "Login failed."
        Alert.alert("Login Failed", errorMessage)
        return
      }

      // log into aws amplify
      await handleSignIn(username, password);

      await storage.saveString("IS_LOGGED_IN", "true")
      
      // Check if user has preferences set
      try {
        const preferencesResponse = await api.getPreferences()
        if (preferencesResponse.ok && preferencesResponse.data) {
          // User has preferences, go directly to main app
          navigation.replace("Foodigram")
        } else {
          // User has no preferences, show onboarding
          navigation.replace("Onboarding")
        }
      } catch (error) {
        // If error checking preferences, show onboarding to be safe
        navigation.replace("Onboarding")
      }
    } catch (e) {
      Alert.alert("Error", "An error occurred during login.")
      console.log(e)
    } finally {
      setIsLoading(false)
    }
  }

  async function tryRegister() {
    // Form validation
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in all fields.")
      return
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.")
      return
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long.")
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email format.")
      return
    }

    setIsLoading(true)
    try {
      // Ensure CSRF cookie is set
      await api.getCsrf()
      const res = await api.register(username, email, password)
      if (!res.ok) {
        const errorMessage = (res.data as any)?.detail || "Registration failed."
        Alert.alert("Registration Failed", errorMessage)
        return
      }
      
      // Auto login after successful registration
      await storage.saveString("IS_LOGGED_IN", "true")
      Alert.alert("Success", "Registration completed!", [
        { 
          text: "OK", 
          onPress: () => {
            // New users always go to onboarding
            navigation.replace("Onboarding")
          }
        }
      ])
    } catch (e) {
      Alert.alert("Error", "An error occurred during registration.")
      console.log(e)
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    setUsername("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
  }

  function toggleMode() {
    setIsLoginMode(!isLoginMode)
    resetForm()
  }

  return (
    <View style={$container}>
      <View style={$form}>
        <Text style={$title}>{isLoginMode ? "Login" : "Sign Up"}</Text>
        
        <TextField 
          placeholder="Username" 
          value={username} 
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        
        {!isLoginMode && (
          <TextField 
            placeholder="Email" 
            value={email} 
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
        
        <TextField 
          placeholder="Password" 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword}
        />
        
        {!isLoginMode && (
          <TextField 
            placeholder="Confirm Password" 
            secureTextEntry 
            value={confirmPassword} 
            onChangeText={setConfirmPassword}
          />
        )}
        
        {!isLoginMode && (
          <Text style={$validationText}>
            • Password must be at least 8 characters{'\n'}
            • Passwords must match{'\n'}
            • Email must be valid format
          </Text>
        )}
        
        <Button 
          text={isLoginMode ? "Log In" : "Sign Up"} 
          style={$submitButton} 
          onPress={isLoginMode ? tryLogin : tryRegister}
          disabled={isLoading}
        />
        
        <TouchableOpacity onPress={toggleMode} style={$toggleButton}>
          <Text style={$toggleText}>
            {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  justifyContent: "center",
  padding: spacing.lg,
}

const $form: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  padding: spacing.lg,
  borderRadius: 12,
}

const $title: TextStyle = {
  fontSize: 24,
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: spacing.lg,
  color: colors.text,
}

const $submitButton: ViewStyle = {
  marginTop: spacing.md,
}

const $toggleButton: ViewStyle = {
  marginTop: spacing.md,
  alignItems: "center",
}

const $toggleText: TextStyle = {
  color: colors.palette.primary500,
  fontSize: 14,
}

const $validationText: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginTop: spacing.sm,
  marginBottom: spacing.xs,
  lineHeight: 16,
}

// (no unused headline)
