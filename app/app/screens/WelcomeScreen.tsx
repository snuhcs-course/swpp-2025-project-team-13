import { observer } from "mobx-react-lite"
import React, { FC } from "react"
import { View, ImageBackground, TouchableOpacity, Text as RNText, StyleSheet, ViewStyle, TextStyle } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { useSafeAreaInsetsStyle } from "../utils/useSafeAreaInsetsStyle"
import { MaterialIcons } from "@expo/vector-icons"
// eslint-disable-next-line camelcase
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans"
import { LinearGradient } from "expo-linear-gradient"

const backgroundImage = require("../../assets/images/welcome-background.jpg")

const PRIMARY_COLOR = "#f66c51"
const WHITE_COLOR = "#FFFFFF"
const OVERLAY_COLOR = "rgba(255, 255, 255, 0.2)"
const TEXT_SHADOW_COLOR = "rgba(0, 0, 0, 0.8)"

interface WelcomeScreenProps extends AppStackScreenProps<"Welcome"> {}

export const WelcomeScreen: FC<WelcomeScreenProps> = observer(function WelcomeScreen(
  { navigation }
) {
  // eslint-disable-next-line camelcase
  const [fontsLoaded] = useFonts({
    // eslint-disable-next-line camelcase
    PlusJakartaSans_400Regular,
    // eslint-disable-next-line camelcase
    PlusJakartaSans_700Bold,
  })

  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])

  if (!fontsLoaded) {
    return null
  }

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={backgroundImage} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.6)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.contentWrapper}>
          {/* Content */}
          <View style={styles.centerContent}>
            <View style={styles.logoContainer}>
              <MaterialIcons name="restaurant" size={36} color="white" />
              <RNText style={styles.logoText}>
                Foodigram
              </RNText>
            </View>
            <RNText style={styles.subtitleText}>
              Your personalized food journey starts here
            </RNText>
          </View>

          {/* Buttons */}
          <View style={[styles.buttonContainer, $bottomContainerInsets]}>
            <View style={styles.buttonWrapper}>
              <TouchableOpacity 
                style={styles.signUpButton}
                onPress={() => navigation.navigate("SignUp")}
              >
                <RNText style={styles.buttonText}>
                  Sign Up
                </RNText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.logInButton}
                onPress={() => navigation.navigate("Login")}
              >
                <RNText style={styles.buttonText}>
                  Log In
                </RNText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  )
})

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  } as ViewStyle,
  buttonContainer: {
    padding: 16,
    paddingBottom: 24,
  } as ViewStyle,
  buttonText: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: WHITE_COLOR,
    fontSize: 16,
    fontWeight: "bold",
  } as TextStyle,
  buttonWrapper: {
    gap: 12,
    maxWidth: 480,
    alignItems: "stretch",
    alignSelf: "center",
    width: "100%",
  } as ViewStyle,
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 16,
  } as ViewStyle,
  container: {
    flex: 1,
  } as ViewStyle,
  contentWrapper: {
    position: "relative",
    zIndex: 10,
    flex: 1,
    justifyContent: "space-between",
  } as ViewStyle,
  logInButton: {
    backgroundColor: OVERLAY_COLOR,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  logoText: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: WHITE_COLOR,
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 38,
    textShadowColor: TEXT_SHADOW_COLOR,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  } as TextStyle,
  signUpButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  subtitleText: {
    fontFamily: "PlusJakartaSans_400Regular",
    color: WHITE_COLOR,
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
    textShadowColor: TEXT_SHADOW_COLOR,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  } as TextStyle,
})
