import { useAlbumScanner } from "app/services/albums/useAlbumScanner"
import { api } from "app/services/api"
import { getImage as getImageName } from "app/utils/imagenameFromAsseturi"
import * as storage from "app/utils/storage"
import { Asset } from "expo-media-library"
import { Bookmark, Home, Image as ImageIcon, LogOut, Settings, User, X } from "lucide-react-native"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import {
  Dimensions,
  Image,
  ImageStyle,
  Modal,
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
  const { foodHistoryStore } = useStores()
  const { scanAlbums } = useAlbumScanner();
  const screenWidth = Dimensions.get('window').width
  const imageSize = (screenWidth - spacing.lg * 2 - spacing.sm) / 2 // 2 columns with padding
  const [userName, setUserName] = useState("")
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isPreferencesModalVisible, setIsPreferencesModalVisible] = useState(false)
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false)

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
    const photoList = await api.getUserPhotos();

    const currentImages = photoList
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

        {/* Content */}
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
          testID="ScrapTab"
          onPress={() => {
            if (__DEV__) {
              console.log(`Profile: navigated to Scrap`)
            }
            navigation.navigate("Scrap")
          }}
        >
          <Bookmark size={24} color={colors.palette.neutral400} strokeWidth={2} />
          <Text style={$tabButtonText}>스크랩</Text>
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

      {/* Floating Settings Button */}
      <TouchableOpacity
        testID="settings-floating-button"
        style={$floatingSettingsButton}
        onPress={() => setIsSettingsModalVisible(true)}
      >
        <Settings size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Floating Gallery Button */}
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
        <ImageIcon size={28} color="#FFFFFF" />
      </TouchableOpacity>

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

      {/* Settings Modal */}
      <Modal
        visible={isSettingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSettingsModalVisible(false)}
      >
        <View style={$settingsModalBackdrop}>
          <View style={$settingsModalContainer}>
            <View style={$settingsModalContent}>
              {/* Header */}
              <View style={$settingsModalHeader}>
                <Text style={$settingsModalTitle}>설정</Text>
                <TouchableOpacity 
                  onPress={() => setIsSettingsModalVisible(false)} 
                  style={$settingsCloseButton}
                >
                  <X size={24} color={colors.palette.neutral700} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={$settingsModalBody}>
                <TouchableOpacity
                  onPress={() => {
                    setIsSettingsModalVisible(false)
                    logout()
                  }}
                  style={$settingsLogoutButton}
                >
                  <LogOut size={20} color={colors.error} />
                  <Text style={$settingsLogoutText}>로그아웃</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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

const $floatingSettingsButton: ViewStyle = {
  position: "absolute",
  bottom: spacing.xl + 80 + 80, // Above gallery button
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

const $settingsModalBackdrop: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.lg,
}

const $settingsModalContainer: ViewStyle = {
  width: "100%",
  maxWidth: 400,
}

const $settingsModalContent: ViewStyle = {
  backgroundColor: colors.background,
  borderRadius: 12,
  overflow: "hidden",
}

const $settingsModalHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $settingsModalTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
}

const $settingsCloseButton: ViewStyle = {
  padding: spacing.xs,
}

const $settingsModalBody: ViewStyle = {
  padding: spacing.md,
}

const $settingsMenuItem: ViewStyle = {
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderRadius: 8,
  marginBottom: spacing.sm,
}

const $settingsMenuItemText: TextStyle = {
  fontSize: 16,
  color: colors.text,
  fontWeight: "500",
}

const $settingsLogoutButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  backgroundColor: colors.background,
  gap: spacing.sm,
  marginTop: spacing.md,
}

const $settingsLogoutText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.error,
}