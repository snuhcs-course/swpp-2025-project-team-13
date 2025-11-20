import { Text } from "app/components"
import { AppStackScreenProps } from "app/navigators"
import { userAuthFacade } from "app/services/registration"
import { Eye, EyeOff } from "lucide-react-native"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { Alert, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"

interface LoginScreenProps extends AppStackScreenProps<"Login"> { }

export const LoginScreen = observer(function LoginScreen({ navigation }: LoginScreenProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function tryLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert("아이디와 비밀번호를 입력해주세요.")
      return
    }

    setIsLoading(true)
    try {
      const result = await userAuthFacade.loginUser({ username, password })
      if (!result.success) {
        Alert.alert("로그인 실패", result.errorMessage ?? "로그인에 실패했습니다.")
        return
      }

      navigation.replace(result.hasPreferences ? "Foodigram" : "Onboarding")
    } catch (e) {
      Alert.alert("로그인 중 문제가 발생했습니다.")
      console.log(e)
    } finally {
      setIsLoading(false)
    }
  }

  function navigateToSignUp() {
    navigation.navigate("SignUp")
  }

  return (
    <View style={$containerNew}>
      <View style={$contentWrapper}>
        <View style={$formNew}>
          <View style={$inputWrapper}>
            <Text style={$label}>아이디</Text>
            <TextInput
              style={$input}
              testID="login-username-input"
              placeholder=""
              placeholderTextColor="#9c5749"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={$inputWrapper}>
            <Text style={$label}>비밀번호</Text>
            <View style={$passwordContainer}>
              <TextInput
                style={$passwordInput}
                testID="login-password-input"
                placeholder=""
                placeholderTextColor="#9c5749"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={$eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <Eye size={24} color="#9c5749" />
                ) : (
                  <EyeOff size={24} color="#9c5749" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={$forgotPassword}>
            <Text style={$forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[$loginButton, isLoading && $loginButtonDisabled]}
            testID="login-submit-button"
            onPress={tryLogin}
            disabled={isLoading}
          >
            <Text style={$loginButtonText}>로그인</Text>
          </TouchableOpacity>

          <View style={$signUpPrompt}>
            <Text style={$signUpPromptText}>
              아직 계정이 없으신가요?{" "}
              <Text style={$signUpLink} onPress={navigateToSignUp}>
                회원가입
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
})

const $containerNew: ViewStyle = {
  flex: 1,
  backgroundColor: "#f8f6f5",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 40,
}

const $contentWrapper: ViewStyle = {
  width: "100%",
  maxWidth: 480,
  alignItems: "center",
}

const $formNew: ViewStyle = {
  width: "100%",
}

const $inputWrapper: ViewStyle = {
  width: "100%",
  marginBottom: 12,
}

const $label: TextStyle = {
  fontSize: 16,
  fontWeight: "500",
  color: "#1c100d",
  marginBottom: 8,
}

const $input: TextStyle = {
  width: "100%",
  height: 56,
  backgroundColor: "#f4e9e7",
  borderRadius: 12,
  paddingHorizontal: 16,
  fontSize: 16,
  color: "#1c100d",
}

const $passwordContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#f4e9e7",
  borderRadius: 12,
  height: 56,
}

const $passwordInput: TextStyle = {
  flex: 1,
  height: "100%",
  paddingHorizontal: 16,
  fontSize: 16,
  color: "#1c100d",
}

const $eyeButton: ViewStyle = {
  paddingHorizontal: 16,
  justifyContent: "center",
  alignItems: "center",
}

const $forgotPassword: ViewStyle = {
  alignSelf: "flex-end",
  marginTop: 4,
  marginBottom: 12,
}

const $forgotPasswordText: TextStyle = {
  fontSize: 14,
  color: "#f66c51",
  textDecorationLine: "underline",
}

const $loginButton: ViewStyle = {
  width: "100%",
  height: 48,
  backgroundColor: "#f66c51",
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
  marginTop: 12,
}

const $loginButtonDisabled: ViewStyle = {
  opacity: 0.6,
}

const $loginButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: "#FFFFFF",
}

const $signUpPrompt: ViewStyle = {
  marginTop: 16,
  alignItems: "center",
}

const $signUpPromptText: TextStyle = {
  fontSize: 14,
  color: "#9c5749",
  textAlign: "center",
}

const $signUpLink: TextStyle = {
  fontSize: 14,
  color: "#f66c51",
  fontWeight: "500",
  textDecorationLine: "underline",
}
