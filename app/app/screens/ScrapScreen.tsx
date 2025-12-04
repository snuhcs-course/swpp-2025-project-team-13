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
  ViewStyle,
  Linking,
  Platform,
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
  
  // Debug logging to track what data ScrapScreen has
  React.useEffect(() => {
    console.log(`🔍 ScrapScreen: Rendered with ${scrappedMenus.length} scraped menus`)
    if (scrappedMenus.length > 0) {
      console.log("🔍 ScrapScreen: Menu names:", scrappedMenus.map(m => m.menu_name))
    }
  }, [scrappedMenus.length])

  // Open Naver Map with menu location (Android only)
  const openNaverMap = React.useCallback(async (menu: typeof scrappedMenus[0]) => {
    if (Platform.OS !== 'android') {
      return
    }

    if (!menu.coordinates || menu.coordinates.length < 2) {
      console.warn('Menu coordinates not available:', menu.place_name)
      return
    }

    // Convert MST array to regular array
    const coords = Array.from(menu.coordinates)
    const [lng, lat] = coords as [number, number] // coordinates is [longitude, latitude]
    const placeName = encodeURIComponent(menu.place_name || '')
    const appName = 'com.foodigram'

    // Naver Map Intent URL format for Android
    // intent://place?lat={위도}&lng={경도}&name={장소명}&appname={앱이름}#Intent;scheme=nmap;package=com.nhn.android.nmap;end
    const intentUrl = `intent://place?lat=${lat}&lng=${lng}&name=${placeName}&appname=${appName}#Intent;scheme=nmap;package=com.nhn.android.nmap;end`

    try {
      const canOpen = await Linking.canOpenURL(intentUrl)
      if (canOpen) {
        await Linking.openURL(intentUrl)
      } else {
        // Fallback: try direct nmap:// scheme
        const directUrl = `nmap://place?lat=${lat}&lng=${lng}&name=${placeName}&appname=${appName}`
        await Linking.openURL(directUrl)
      }
    } catch (error) {
      console.error('Failed to open Naver Map:', error)
    }
  }, [])
  

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
                <TouchableOpacity
                  key={menu.id}
                  activeOpacity={0.9}
                  onPress={() => openNaverMap(menu)}
                  style={[$photoCard, { width: imageSize, height: imageSize + 48 }]}
                >
                  <View style={[$imageContainer, { height: imageSize }]}>
                    {menu.image_url && menu.image_url.trim() ? (
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
                    
                    {/* Category Badge */}
                    {menu.category && menu.category !== "restaurant" && (
                      <View style={$categoryBadge}>
                        <Text style={$categoryText}>{menu.category}</Text>
                      </View>
                    )}

                    {/* X Remove Button */}
                    <TouchableOpacity
                      style={$removeButton}
                      onPress={(e) => {
                        e.stopPropagation()
                        menuScrapStore.removeScrappedMenu(menu.id)
                      }}
                    >
                      <View style={$removeButtonBackground}>
                        <X size={14} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Bottom info bar - matches FoodCard style */}
                  <View style={$infoBar}>
                    <View style={$infoBarContent}>
                      <Text style={$infoBarTitle} numberOfLines={1}>
                        {menu.menu_name}
                      </Text>
                      <Text style={$infoBarSubtitle} numberOfLines={1}>
                        {menu.place_name}
                      </Text>
                    </View>
                    <View style={$priceContainer}>
                      <Text style={$priceText}>
                        ₩{(menu.price || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
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
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.background,
  marginBottom: spacing.sm,
}

const $imageContainer: ViewStyle = {
  position: "relative",
  width: "100%",
  flex: 1,
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

const $categoryBadge: ViewStyle = {
  position: "absolute",
  top: spacing.xs,
  left: spacing.xs,
  backgroundColor: colors.palette.primary100,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  borderRadius: 6,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
  elevation: 3,
}

const $categoryText: TextStyle = {
  fontSize: 9,
  color: colors.palette.primary600,
  fontWeight: "600",
}


const $infoBar: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  minHeight: 48,
}

const $infoBarContent: ViewStyle = {
  flex: 1,
  marginRight: spacing.sm,
}

const $infoBarTitle: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
  marginBottom: 2,
}

const $infoBarSubtitle: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
}

const $priceContainer: ViewStyle = {
  alignItems: "flex-end",
}

const $priceText: TextStyle = {
  fontSize: 13,
  fontWeight: "700",
  color: colors.palette.primary500,
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

