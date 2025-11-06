import { useAlbumScanner } from "app/services/albums/useAlbumScanner"
import { api } from "app/services/api"
import { getImage as getImageName } from "app/utils/imagenameFromAsseturi"
import * as storage from "app/utils/storage"
import { Asset } from "expo-media-library"
import { Home, Plus, User } from "lucide-react-native"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
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
import { PreferencesModal, RestaurantDetailModal, Text } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { colors, spacing } from "../theme"

interface ProfileScreenProps extends AppStackScreenProps<"Profile"> { }

export const ProfileScreen: React.FC<ProfileScreenProps> = observer(function ProfileScreen({ navigation }) {
  const { foodHistoryStore, menuScrapStore } = useStores()
  const { scanAlbums } = useAlbumScanner();
  const screenWidth = Dimensions.get('window').width
  const imageSize = (screenWidth - spacing.lg * 2 - spacing.sm) / 2 // 2 columns with padding
  const [userName, setUserName] = useState("")
  const [activeTab, setActiveTab] = useState<'photos' | 'restaurants'>('photos')
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isPreferencesModalVisible, setIsPreferencesModalVisible] = useState(false)

  const [userImages, setUserImages] = useState<Array<{ id: string, type: string, image: any, name: string }>>([
    // { id: 'user1', type: 'user', image: require("../../assets/images/restaurant1.jpg"), name: 'My Food Photo 1' },
    // { id: 'user2', type: 'user', image: require("../../assets/images/restaurant2.jpg"), name: 'My Food Photo 2' },
  ]);

  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const res = await api.me()
          const d: any = res.data
          if (mounted && res.ok && d && d.username) setUserName(d.username)
        } catch (e) {
          // ignore
        }
      })()
    return () => {
      mounted = false
    }
  }, [])

  async function getUserPhotos() {
    const photo_list = await api.getUserPhotos();

    const currentImages = photo_list
      .filter(photo => photo.local_uri)
      .map(photo => ({
        id: photo.local_uri,
        type: 'user',
        image: { uri: photo.local_uri },
        name: "User food photo"
      }));

    setUserImages(prevImages => [...prevImages, ...currentImages]);
  }
  useEffect(() => { getUserPhotos(); }, []);

  // Mock data for profile
  const user = {
    name: userName,
  }

  // Get scrapped menus from store
  const scrappedMenus = menuScrapStore.scrappedMenusList

  // Get scrapped items from store
  const scrappedFoods = foodHistoryStore.scrappedItemsList

  // Convert scrapped foods to consistent format
  const scrappedImages = scrappedFoods.map(food => ({
    id: food.id.toString(),
    type: 'scrapped',
    image: { uri: food.image },
    name: food.name
  }))

  // Combine user images and scrapped images
  const allPhotos = [...userImages, ...scrappedImages]

  const logout = async () => {
    try {
      await api.logout()
    } catch (e) {
      // ignore network errors and continue logout locally
    }
    await storage.remove("IS_LOGGED_IN")
    navigation.replace("Welcome")
  }

  return (
    <View style={$container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={$header}>
        <View style={$headerButton} />
        <Text style={$headerTitle}>Profile</Text>
        <TouchableOpacity
          style={$headerButton}
          onPress={() => handleSettingsPress()}
        >
          <Settings size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={$scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={$profileSection}>
          <View style={$profileImageContainer}>
            <Image
              style={$profileImage}
              resizeMode="cover"
            />
          </View>
          <Text style={$userName}>{user.name}</Text>

          <TouchableOpacity
            testID="settings-button"
            style={$editButton}
            onPress={() => setIsPreferencesModalVisible(true)}
          >
            <Text style={$editButtonText}>취향 설정</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={$tabContainer}>
          <TouchableOpacity
            style={[$tab, activeTab === 'photos' && $tabActive]}
            onPress={() => setActiveTab('photos')}
          >
            <Text style={[
              $tabText,
              activeTab === 'photos' && $tabTextActive
            ]}>
              히스토리
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[$tab, activeTab === 'restaurants' && $tabActive]}
            onPress={() => setActiveTab('restaurants')}
          >
            <Text style={[
              $tabText,
              activeTab === 'restaurants' && $tabTextActive
            ]}>
              찜한 메뉴
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'photos' ? (
          <View style={$gridContainer}>
            {allPhotos.length === 0 ? (
              <View style={$emptyState}>
                <Text style={$emptyText}>사진이 아직 없습니다</Text>
                <Text style={$emptySubtext}>
                  갤러리에서 사진을 추가해보세요
                </Text>
              </View>
            ) : (
              <View style={$photoGrid}>
                {allPhotos.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[$photoCard, { width: imageSize, height: imageSize }]}
                    onPress={() => {
                      if (item.type === 'scrapped') {
                        setSelectedRestaurantId(parseInt(item.id))
                        setIsModalVisible(true)
                      }
                    }}
                  >
                    <Image
                      source={item.image}
                      style={$photoImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={$gridContainer}>
            {scrappedMenus.length === 0 ? (
              <View style={$emptyState}>
                <Text style={$emptyText}>찜한 메뉴가 없습니다</Text>
                <Text style={$emptySubtext}>
                  추천 메뉴에서 음식을 스크랩해보세요
                </Text>
              </View>
            ) : (
              <View style={$photoGrid}>
                {scrappedMenus.map((menu) => (
                  <TouchableOpacity
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
                    <View style={$menuOverlay}>
                      <Text style={$menuOverlayTitle} numberOfLines={1}>
                        {menu.menu_name}
                      </Text>
                      <Text style={$menuOverlaySubtitle} numberOfLines={1}>
                        {menu.place_name}
                      </Text>
                      <Text style={$menuOverlayPrice}>
                        ₩{menu.price.toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Tabs */}
      <View style={$bottomTabs}>
        <TouchableOpacity
          style={$tabButton}
          testID="FoodigramTab"
          onPress={() => {
            if (__DEV__) {
              console.log(`Profile: navigated to Foodigram`)
            }
            navigation.navigate("Foodigram")
          }}
        >
          <Home size={24} color={colors.palette.neutral400} strokeWidth={2} />
          <Text style={$tabButtonText}>추천</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={$tabButton}
          testID="UserTab"
          onPress={() => {
            if (__DEV__) {
              console.log(`Profile: tapped profile button (already on Profile)`)
            }
            navigation.navigate("Profile")
          }}
        >
          <User size={24} color={colors.palette.primary500} strokeWidth={2} />
          <Text style={$tabButtonTextActive}>마이페이지</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Add Button - Only show on My Photos tab */}
      {activeTab === 'photos' && (
        <TouchableOpacity
          testID="refresh-button"
          style={$floatingButton}
          onPress={() => {
            scanAlbums((asset: Asset) => {
              setUserImages(userImages => [...userImages, {
                id: asset.id,
                type: 'user',
                image: { uri: asset.uri },
                name: getImageName(asset),
              }]);
            })
          }}
        >
          <Plus size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Restaurant Detail Modal */}
      <RestaurantDetailModal
        restaurantId={selectedRestaurantId}
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false)
          setSelectedRestaurantId(null)
        }}
      />

      {/* Preferences Modal */}
      <PreferencesModal
        visible={isPreferencesModalVisible}
        onClose={() => setIsPreferencesModalVisible(false)}
      />
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

// --- 새로 추가된 horizontal profile section 스타일 ---
const $profileSectionHorizontal: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: spacing.lg,
  paddingTop: spacing.xxxl, 
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.xs,
}

const $userNameHorizontal: TextStyle = {
  fontSize: 22,
  fontWeight: "bold",
  color: colors.text,
}

const $editButtonHorizontal: ViewStyle = {
  backgroundColor: "#f66c51",
  paddingHorizontal: 20,
  borderRadius: 12,
  height: 40,
  alignItems: "center",
  justifyContent: "center",
  marginLeft: spacing.md,
}

const $editButtonText: TextStyle = {
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: "bold",
}

const $tabContainer: ViewStyle = {
  flexDirection: "row",
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
  marginTop: spacing.md,
}

const $tab: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.md,
  alignItems: "center",
  borderBottomWidth: 3,
  borderBottomColor: "transparent",
}

const $tabActive: ViewStyle = {
  borderBottomColor: colors.palette.primary500,
}

const $tabText: TextStyle = {
  fontSize: 14,
  fontWeight: "bold",
  color: colors.palette.neutral500,
}

const $tabTextActive: TextStyle = {
  color: colors.palette.primary500,
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

const $floatingButton: ViewStyle = {
  position: "absolute",
  bottom: spacing.xl + 80, // Above bottom tabs
  right: spacing.xl,
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: colors.palette.primary500,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
}