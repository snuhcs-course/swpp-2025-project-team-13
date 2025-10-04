import React, { useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, Image, ImageStyle, TouchableOpacity } from "react-native"
import { Home, User } from "lucide-react-native"
import { Text } from "app/components"
import * as storage from "app/utils/storage"
import { api } from "app/services/api"
import { AppStackScreenProps } from "app/navigators"
import { colors, spacing } from "app/theme"
import { useSafeAreaInsetsStyle } from "app/utils/useSafeAreaInsetsStyle"

const avatar = require("../../assets/images/welcome-face.png")

interface ProfileScreenProps extends AppStackScreenProps<"Profile"> {}

export const ProfileScreen = observer(function ProfileScreen({ navigation }: ProfileScreenProps) {
  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.me()
        const d: any = res.data
        if (mounted && res.ok && d && d.username) setUsername(d.username)
      } catch (e) {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <View style={$container}>
      <View style={$topContainer}>
        <Image source={avatar} style={$avatar} resizeMode="cover" />
  <Text preset="heading" style={$name}>{username ?? "Jane Doe"}</Text>
  <Text size="md">Food lover · Seoul</Text>
      </View>

      <View style={[$bottomContainer, $bottomContainerInsets, { paddingBottom: 90 }]}>
        <Text>Welcome to your profile. Edit your details and preferences here.</Text>
        <TouchableOpacity
          style={$logoutButton}
          onPress={async () => {
            try {
              await api.logout()
            } catch (e) {
              // ignore network errors and continue logout locally
            }
            await storage.remove("IS_LOGGED_IN")
            navigation.replace("Login")
          }}
        >
          <Text style={$logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Tabs (same layout as Foodigram) */}
  <View style={$bottomTabs}>
        <TouchableOpacity
          style={$tabButton}
          onPress={() => navigation.navigate("Foodigram")}
        >
          <Home size={28} color={colors.palette.neutral500} />
          <Text style={$tabText}>Recommendation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[$tabButton, $tabButtonActive]}
          onPress={() => navigation.navigate("Profile")}
        >
          <User size={28} color={colors.palette.primary500} />
          <Text style={[$tabText, $tabTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $bottomTabs: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 65,
  flexDirection: "row",
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
  backgroundColor: colors.background,
}

const $tabButton: ViewStyle = {
  flex: 1,
  height: "100%",
  alignItems: "center",
  justifyContent: "space-evenly",
  flexDirection: "column",
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
}

const $tabButtonActive: ViewStyle = {
  backgroundColor: colors.palette.primary100,
}

const $tabText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral500,
}

const $tabTextActive: TextStyle = {
  color: colors.palette.primary500,
}

const $topContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
}

const $avatar: ImageStyle = {
  width: 120,
  height: 120,
  borderRadius: 60,
  marginBottom: spacing.md,
}

const $name: TextStyle = {
  marginBottom: spacing.xs,
}

const $bottomContainer: ViewStyle = {
  padding: spacing.lg,
  backgroundColor: colors.palette.neutral100,
}

const $logoutButton: ViewStyle = {
  marginTop: spacing.md,
  backgroundColor: colors.palette.primary500,
  paddingVertical: spacing.sm,
  borderRadius: 12,
  alignItems: "center",
}

const $logoutText: TextStyle = {
  color: colors.palette.neutral100,
  fontWeight: "600",
}
