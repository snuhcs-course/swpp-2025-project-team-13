import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle } from "react-native"
import { TextField } from "app/components/TextField"
import { Button } from "app/components/Button"
import { AppStackScreenProps } from "app/navigators"
import { colors, spacing } from "app/theme"
import * as storage from "app/utils/storage"
import { api } from "app/services/api"

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen = observer(function LoginScreen({ navigation }: LoginScreenProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  async function tryLogin() {
    try {
      // Ensure CSRF cookie is set
      await api.getCsrf()
      const res = await api.login(username, password)
      if (!res.ok) {
        // show a simple alert for now
        alert("Login failed: " + (res.data ? JSON.stringify(res.data) : String(res.problem)))
        return
      }
      await storage.saveString("IS_LOGGED_IN", "true")
      navigation.replace("Foodigram")
    } catch (e) {
      alert("Login error")
    }
  }

  return (
    <View style={$container}>
      <View style={$form}>
        <TextField placeholder="Username" value={username} onChangeText={setUsername} />
        <TextField placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <Button text="Log in" style={$loginButton} onPress={tryLogin} />
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

const $loginButton: ViewStyle = {
  marginTop: spacing.md,
}

// (no unused headline)
