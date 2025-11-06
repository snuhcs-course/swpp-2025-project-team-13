import { Bookmark, Home, User, X } from "lucide-react-native"
import { observer } from "mobx-react-lite"
import React from "react"
import {
  Dimensions,
  Image,
  ImageStyle,
  ScrollView,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from "react-native"
import { Text } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { colors, spacing } from "../theme"

interface ScrapScreenProps extends AppStackScreenProps<"Scrap"> {}

export const ScrapScreen: React.FC<ScrapScreenProps> = observer(function ScrapScreen({ navigation }) {
  const { menuScrapStore } = useStores()
  const screenWidth = Dimensions.get('window').width
  const imageSize = (screenWidth - spacing.lg * 2 - spacing.sm) / 2 // 2 columns with padding

  // Get scrapped menus from store
  const scrappedMenus = menuScrapStore.scrappedMenusList

  return (
    <View style={$container}>
      <ScrollView style={$scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={$header}>
          <Text style={$headerTitle}>스크랩한 메뉴</Text>
        </View>

        {/* Content */}
        <View style={$gridContainer}>
          {scrappedMenus.length === 0 ? (
            <View style={$emptyState}>
              <Text style={$emptyText}>스크랩한 메뉴가 없습니다</Text>
              <Text style={$emptySubtext}>
                추천 메뉴에서 음식을 스크랩해보세요
              </Text>
            </View>
          ) : (
            <View style={$photoGrid}>
              {scrappedMenus.map((menu) => (
                <View
                  key={menu.id}
                  style={[$photoCard, { width: imageSize, height: imageSize }]}
                >
                  {menu.image_url ? (
                    <Image
                      source={{ uri: menu.image_url }}
                      style={$photoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[$photoImage, $placeholderImage]}>
                      <Text style={$placeholderText}>이미지 없음</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={$removeButton}
                    onPress={() => menuScrapStore.removeScrappedMenu(menu.id)}
                  >
                    <View style={$removeButtonBackground}>
                      <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                  </TouchableOpacity>
                  <View style={$menuOverlay}>
                    <Text style={$menuOverlayTitle} numberOfLines={1}>
                      {menu.menu_name}
                    </Text>
                    <Text style={$menuOverlaySubtitle} numberOfLines={1}>
                      {menu.place_name}
                    </Text>
                    <Text style={$menuOverlayPrice}>
                      ₩{menu.price?.toLocaleString() || '0'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Tabs */}
      <View style={$bottomTabs}>
        <TouchableOpacity
          style={$tabButton}
          testID="FoodigramTab"
          onPress={() => {
            if (__DEV__) {
              console.log(`Scrap: navigated to Foodigram`)
            }
            navigation.navigate("Foodigram")
          }}
        >
          <Home size={24} color={colors.palette.neutral400} strokeWidth={2} />
          <Text style={$tabButtonText}>추천</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={$tabButton}
          testID="ScrapTab"
          onPress={() => {
            if (__DEV__) {
              console.log(`Scrap: tapped scrap button (already on Scrap)`)
            }
            navigation.navigate("Scrap")
          }}
        >
          <Bookmark size={24} color={colors.palette.primary500} strokeWidth={2} />
          <Text style={$tabButtonTextActive}>스크랩</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={$tabButton}
          testID="UserTab"
          onPress={() => {
            if (__DEV__) {
              console.log(`Scrap: navigated to Profile`)
            }
            navigation.navigate("Profile")
          }}
        >
          <User size={24} color={colors.palette.neutral400} strokeWidth={2} />
          <Text style={$tabButtonText}>마이페이지</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $scrollView: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  marginBottom: 80, // Space for bottom tabs
}

const $header: ViewStyle = {
  paddingTop: spacing.xxxl,
  paddingBottom: spacing.lg,
  paddingHorizontal: spacing.lg,
}

const $headerTitle: TextStyle = {
  fontSize: 22,
  fontWeight: "bold",
  color: colors.text,
}

const $gridContainer: ViewStyle = {
  paddingTop: spacing.md,
}

const $photoGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  paddingHorizontal: spacing.lg,
  gap: spacing.sm,
  paddingBottom: spacing.xl,
}

const $photoCard: ViewStyle = {
  borderRadius: 24,
  overflow: "hidden",
  backgroundColor: colors.palette.neutral200,
}

const $photoImage: ImageStyle = {
  width: "100%",
  height: "100%",
}

const $placeholderImage: ViewStyle = {
  backgroundColor: colors.palette.neutral300,
  justifyContent: "center",
  alignItems: "center",
}

const $placeholderText: TextStyle = {
  color: colors.palette.neutral500,
  fontSize: 12,
  fontWeight: "500",
}

const $menuOverlay: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "rgba(0,0,0,0.7)",
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
}

const $menuOverlayTitle: TextStyle = {
  color: "#fff",
  fontSize: 13,
  fontWeight: "700",
  marginBottom: 2,
}

const $menuOverlaySubtitle: TextStyle = {
  color: "rgba(255,255,255,0.85)",
  fontSize: 11,
  marginBottom: 2,
}

const $menuOverlayPrice: TextStyle = {
  color: "#fff",
  fontSize: 11,
  fontWeight: "600",
}

const $removeButton: ViewStyle = {
  position: "absolute",
  top: spacing.xs,
  right: spacing.xs,
  zIndex: 10,
}

const $removeButtonBackground: ViewStyle = {
  width: 20,
  height: 20,
  borderRadius: 14,
  backgroundColor: "rgba(0,0,0,0.3)",
  alignItems: "center",
  justifyContent: "center",
}

const $emptyState: ViewStyle = {
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.xxl,
}

const $emptyText: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral400,
  marginBottom: spacing.xs,
  fontWeight: "bold",
}

const $emptySubtext: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral400,
  textAlign: "center",
}

const $bottomTabs: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 80,
  flexDirection: "row",
  borderTopWidth: 0.5,
  borderTopColor: colors.palette.neutral300,
  backgroundColor: "#ffffff",
  zIndex: 100,
  paddingBottom: spacing.xs,
}

const $tabButton: ViewStyle = {
  flex: 1,
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.sm,
  gap: 4,
}

const $tabButtonText: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral400,
  fontWeight: "500",
}

const $tabButtonTextActive: TextStyle = {
  fontSize: 11,
  color: colors.palette.primary500,
  fontWeight: "600",
}

