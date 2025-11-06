import React, { useCallback, useEffect, useRef } from "react"
import { Animated, TouchableOpacity, View, ViewStyle, TextStyle } from "react-native"
import { Text } from "./Text"
import { colors, spacing } from "../theme"

interface ScrapToastProps {
  visible: boolean
  onDismiss: () => void
  onNavigate: () => void
}

export const ScrapToast: React.FC<ScrapToastProps> = ({ visible, onDismiss, onNavigate }) => {
  const slideAnim = useRef(new Animated.Value(100)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss()
    })
  }, [onDismiss])

  useEffect(() => {
    if (!visible) {
      hideToast()
      return
    }

    // Show animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
      hideToast()
    }, 4000)

    return () => clearTimeout(timer)
  }, [visible, hideToast])

  const handleNavigate = () => {
    hideToast()
    onNavigate()
  }

  if (!visible) return null

  return (
    <Animated.View
      style={[
        $toastContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={$toastContent}>
        <Text style={$toastText}>스크랩 탭에서 확인하세요</Text>
        <TouchableOpacity style={$navigateButton} onPress={handleNavigate}>
          <Text style={$navigateButtonText}>보러가기</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

const $toastContainer: ViewStyle = {
  position: "absolute",
  bottom: 100,
  left: spacing.lg,
  right: spacing.lg,
  zIndex: 1000,
}

const $toastContent: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: colors.palette.neutral900,
  borderRadius: 12,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
}

const $toastText: TextStyle = {
  flex: 1,
  color: "#FFFFFF",
  fontSize: 14,
  marginRight: spacing.md,
}

const $navigateButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.md,
  borderRadius: 8,
}

const $navigateButtonText: TextStyle = {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: "600",
}

