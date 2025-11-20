import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, TouchableOpacity, Alert, TextInput, ScrollView } from "react-native"
import { Text } from "app/components"
import { AppStackScreenProps } from "app/navigators"
import { userRegistrationFacade } from "app/services/registration"
import { Eye, EyeOff } from "lucide-react-native"

interface SignUpScreenProps extends AppStackScreenProps<"SignUp"> {}

export const SignUpScreen = observer(function SignUpScreen({ navigation }: SignUpScreenProps) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function tryRegister() {
    // Form validation
    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("모든 항목을 입력해 주세요.")
      return
    }

    if (password.length < 8) {
      Alert.alert("비밀번호는 8자 이상이어야 합니다.")
      return
    }

    if (password !== confirmPassword) {
      Alert.alert("비밀번호와 비밀번호 확인이 일치하지 않습니다.")
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert("올바른 이메일 주소를 입력해 주세요.")
      return
    }

    setIsLoading(true)
    try {
      const result = await userRegistrationFacade.registerUser({
        username: fullName,
        email,
        password,
      })

      if (!result.success) {
        Alert.alert("회원가입 실패", result.errorMessage ?? "회원가입에 실패하였습니다.")
        return
      }

      Alert.alert("회원가입 완료", "맛집 여정을 시작해보세요!", [
        { 
          text: "확인", 
          onPress: () => {
            // New users always go to onboarding
            navigation.replace("Onboarding")
          }
        }
      ])
    } catch (e) {
      Alert.alert("회원가입 중 오류가 발생하였습니다.")
      console.log(e)
    } finally {
      setIsLoading(false)
    }
  }

  function navigateToLogin() {
    navigation.navigate("Login")
  }

  return (
    <ScrollView 
      style={$container}
      contentContainerStyle={$scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={$contentWrapper}>
        {/* Title */}
        <Text style={$title}>계정 생성</Text>
        
        {/* Form */}
        <View style={$form}>
          {/* Full Name */}
          <View style={$inputWrapper}>
            <Text style={$label}>아이디</Text>
            <TextInput
              style={$input}
              placeholder="아이디을 입력해 주세요"
              placeholderTextColor="#9c5749"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Email Address */}
          <View style={$inputWrapper}>
            <Text style={$label}>이메일 주소</Text>
            <TextInput
              style={$input}
              placeholder="이메일을 입력해 주세요"
              placeholderTextColor="#9c5749"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={$inputWrapper}>
            <Text style={$label}>비밀번호</Text>
            <View style={$passwordContainer}>
              <TextInput
                style={$passwordInput}
                placeholder="비밀번호를 입력해 주세요"
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

          {/* Confirm Password */}
          <View style={$inputWrapper}>
            <Text style={$label}>비밀번호 확인</Text>
            <View style={$passwordContainer}>
              <TextInput
                style={$passwordInput}
                placeholder="비밀번호를 한 번 더 입력해 주세요"
                placeholderTextColor="#9c5749"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={$eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <Eye size={24} color="#9c5749" />
                ) : (
                  <EyeOff size={24} color="#9c5749" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Button */}
          <View style={$buttonWrapper}>
            <TouchableOpacity 
              style={[$signUpButton, isLoading && $signUpButtonDisabled]}
              onPress={tryRegister}
              disabled={isLoading}
            >
              <Text style={$signUpButtonText}>가입하기</Text>
            </TouchableOpacity>
          </View>

          {/* Login Prompt */}
          <View style={$loginPrompt}>
            <Text style={$loginPromptText}>
              이미 계정이 있으신가요?{" "}
              <Text style={$loginLink} onPress={navigateToLogin}>
                로그인
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: "#fcf9f8",
}

const $scrollContent: ViewStyle = {
  flexGrow: 1,
  justifyContent: "center",
  paddingHorizontal: 16,
  paddingVertical: 40,
}

const $contentWrapper: ViewStyle = {
  width: "100%",
  maxWidth: 480,
  alignSelf: "center",
  alignItems: "center",
}

const $title: TextStyle = {
  fontSize: 32,
  fontWeight: "700",
  color: "#1c100d",
  textAlign: "center",
  marginBottom: 24,
  paddingTop: 48,
  paddingBottom: 12,
}

const $form: ViewStyle = {
  width: "100%",
}

const $inputWrapper: ViewStyle = {
  width: "100%",
  paddingHorizontal: 16,
  paddingVertical: 8,
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

const $buttonWrapper: ViewStyle = {
  width: "100%",
  paddingHorizontal: 16,
  paddingVertical: 16,
}

const $signUpButton: ViewStyle = {
  width: "100%",
  height: 48,
  backgroundColor: "#f66c51",
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
}

const $signUpButtonDisabled: ViewStyle = {
  opacity: 0.6,
}

const $signUpButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: "#FFFFFF",
}

const $loginPrompt: ViewStyle = {
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 8,
}

const $loginPromptText: TextStyle = {
  fontSize: 14,
  color: "#9c5749",
}

const $loginLink: TextStyle = {
  fontSize: 14,
  color: "#f66c51",
  fontWeight: "600",
  textDecorationLine: "underline",
}

