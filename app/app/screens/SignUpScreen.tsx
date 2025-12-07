import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, TouchableOpacity, Alert, TextInput, ScrollView } from "react-native"
import { Text, SignUpSuccessModal, SignUpErrorModal } from "app/components"
import { AppStackScreenProps } from "app/navigators"
import { userAuthFacade } from "app/services/registration"
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
  
  // Validation states
  const [fullNameError, setFullNameError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const [successModalVisible, setSuccessModalVisible] = useState(false)
  const [errorModalVisible, setErrorModalVisible] = useState(false)
  const [signUpErrorMessage, setSignUpErrorMessage] = useState("")

  // Validation functions
  const validateFullName = (value: string) => {
    if (value.length > 0 && value.length < 6) {
      setFullNameError("아이디는 6자 이상이어야 합니다.")
    } else {
      setFullNameError("")
    }
  }

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (value.length > 0 && !emailRegex.test(value)) {
      setEmailError("이메일을 확인하세요.")
    } else {
      setEmailError("")
    }
  }

  const validatePassword = (value: string) => {
    if (value.length > 0 && value.length < 8) {
      setPasswordError("비밀번호는 8자 이상이어야 합니다.")
    } else {
      setPasswordError("")
      // Re-validate confirm password when password changes
      if (confirmPassword && value !== confirmPassword) {
        setConfirmPasswordError("비밀번호가 일치하지 않습니다.")
      } else if (confirmPassword && value === confirmPassword) {
        setConfirmPasswordError("")
      }
    }
  }

  const validateConfirmPassword = (value: string) => {
    if (value.length > 0 && value !== password) {
      setConfirmPasswordError("비밀번호가 일치하지 않습니다.")
    } else {
      setConfirmPasswordError("")
    }
  }

  // Check if form is valid
  const isFormValid = () => {
    return fullName.length >= 6 && 
           fullNameError === "" &&
           email.length > 0 && 
           emailError === "" &&
           password.length >= 8 && 
           passwordError === "" &&
           confirmPassword === password && 
           confirmPasswordError === ""
  }

  const handleSuccessModalClose = () => {
    setSuccessModalVisible(false)
    // New users always go to onboarding (which starts with location screen)
    navigation.replace("Onboarding")
  }

  async function tryRegister() {
    // Form validation
    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setSignUpErrorMessage("모든 항목을 입력해 주세요.")
      setErrorModalVisible(true)
      return
    }

    if (password.length < 8) {
      setSignUpErrorMessage("비밀번호는 8자 이상이어야 합니다.")
      setErrorModalVisible(true)
      return
    }

    if (password !== confirmPassword) {
      setSignUpErrorMessage("비밀번호와 비밀번호 확인이 일치하지 않습니다.")
      setErrorModalVisible(true)
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setSignUpErrorMessage("올바른 이메일 주소를 입력해 주세요.")
      setErrorModalVisible(true)
      return
    }

    setIsLoading(true)
    try {
      const result = await userAuthFacade.registerUser({
        username: fullName,
        email,
        password,
      })

      if (!result.success) {
        setSignUpErrorMessage(result.errorMessage ?? "회원가입에 실패하였습니다.")
        setErrorModalVisible(true)
        return
      }

      setSuccessModalVisible(true)
    } catch (e) {
      setSignUpErrorMessage("회원가입 중 오류가 발생하였습니다.")
      setErrorModalVisible(true)
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
            <View style={$labelContainer}>
              <Text style={$label}>아이디</Text>
              {fullNameError ? <Text style={$errorText}>{fullNameError}</Text> : null}
            </View>
            <TextInput
              testID="signup-username-input"
              style={[
                $input, 
                fullNameError ? $inputError : null
              ]}
              placeholder="아이디을 입력해 주세요"
              placeholderTextColor="#9c5749"
              value={fullName}
              onChangeText={setFullName}
              onBlur={() => validateFullName(fullName)}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Email Address */}
          <View style={$inputWrapper}>
            <View style={$labelContainer}>
              <Text style={$label}>이메일 주소</Text>
              {emailError ? <Text style={$errorText}>{emailError}</Text> : null}
            </View>
            <TextInput
              testID="signup-email-input"
              style={[
                $input,
                emailError ? $inputError : null
              ]}
              placeholder="이메일을 입력해 주세요"
              placeholderTextColor="#9c5749"
              value={email}
              onChangeText={setEmail}
              onBlur={() => validateEmail(email)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={$inputWrapper}>
            <View style={$labelContainer}>
              <Text style={$label}>비밀번호</Text>
              {passwordError ? <Text style={$errorText}>{passwordError}</Text> : null}
            </View>
            <View style={[
              $passwordContainer,
              passwordError ? $passwordContainerError : null
            ]}>
              <TextInput
                testID="signup-password-input"
                style={$passwordInput}
                placeholder="비밀번호를 입력해 주세요"
                placeholderTextColor="#9c5749"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onBlur={() => validatePassword(password)}
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
            <View style={$labelContainer}>
              <Text style={$label}>비밀번호 확인</Text>
              {confirmPasswordError ? <Text style={$errorText}>{confirmPasswordError}</Text> : null}
            </View>
            <View style={[
              $passwordContainer,
              confirmPasswordError ? $passwordContainerError : null
            ]}>
              <TextInput
                testID="signup-confirm-password-input"
                style={$passwordInput}
                placeholder="비밀번호를 한 번 더 입력해 주세요"
                placeholderTextColor="#9c5749"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onBlur={() => validateConfirmPassword(confirmPassword)}
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
              testID="signup-submit-button"
              style={[$signUpButton, (isLoading || !isFormValid()) && $signUpButtonDisabled]}
              onPress={tryRegister}
              disabled={isLoading || !isFormValid()}
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
      
      <SignUpSuccessModal
        visible={successModalVisible}
        onClose={handleSuccessModalClose}
      />

      <SignUpErrorModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        errorMessage={signUpErrorMessage}
      />
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

const $labelContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
}

const $errorText: TextStyle = {
  fontSize: 12,
  color: "#f66c51",
  fontWeight: "500",
}

const $inputError: ViewStyle = {
  borderWidth: 1,
  borderColor: "#f66c51",
}

const $passwordContainerError: ViewStyle = {
  borderWidth: 1,
  borderColor: "#f66c51",
}
