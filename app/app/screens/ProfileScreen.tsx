import { useAlbumScanner } from "app/services/albums/useAlbumScanner"
import { api } from "app/services/api"
import * as storage from "app/utils/storage"
import { Bookmark, Check, Home, Image as ImageIcon, LogOut, Settings, User, UtensilsCrossed } from "lucide-react-native"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState, useRef } from "react"
import {
  Alert,
  Animated,
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
import { GalleryImageCard, RestaurantDetailModal, Text, PreferencesModal } from "../components"
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
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedImageIds, setSelectedImageIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false)

  const [userImages, setUserImages] = useState<Array<any>>([])
  const rotationValue = useRef(new Animated.Value(0)).current

  // Handle rotation animation when loading
  useEffect(() => {
    if (isLoading) {
      rotationValue.setValue(0)
      Animated.loop(
        Animated.timing(rotationValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start()
    }
  }, [isLoading, rotationValue])

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
        id: photo.id,
        type: 'user',
        image: { uri: photo.local_uri },
        name: "User food photo",
        ai_label: photo.ai_label || "",
        label_alternatives: photo.label_alternatives || [],
        category_tag: photo.category_tag || "",
        label_confidence: photo.label_confidence || 0.0,
        label_manually_edited: photo.label_manually_edited || false
      }));

    setUserImages(currentImages);
  }
  useEffect(() => { getUserPhotos(); }, []);

  const toggleImageSelection = (imageId: number) => {
    const newSelected = new Set(selectedImageIds)
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId)
    } else {
      newSelected.add(imageId)
    }
    setSelectedImageIds(newSelected)
  }

  const handleDeleteSelectedImages = async () => {
    setDeleteConfirmationVisible(true)
  }

  const handleConfirmDelete = async () => {
    try {
      const imageIds = Array.from(selectedImageIds)
      // Delete each image
      for (const id of imageIds) {
        await api.deleteImage(id)
      }
      // Refresh photos list
      await getUserPhotos()
      // Clear selection
      setSelectedImageIds(new Set())
      setIsSelectMode(false)
      setDeleteConfirmationVisible(false)
    } catch (e) {
      Alert.alert("오류", "사진 삭제 실패")
      setDeleteConfirmationVisible(false)
    }
  }

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
<<<<<<< HEAD
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
=======
        <View style={$profileSectionHorizontal}>
          <TouchableOpacity onPress={() => logout()}>
            <Text style={$userNameHorizontal}>{user.name}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TouchableOpacity
              testID="personalization-button"
              style={$iconButtonSquare}
              onPress={() => setIsPreferencesModalVisible(true)}
            >
              <User size={24} color={colors.palette.neutral700} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="settings-button"
              style={$iconButtonSquare}
              onPress={() => setIsSettingsModalVisible(true)}
            >
              <Settings size={24} color={colors.palette.neutral700} strokeWidth={2} />
            </TouchableOpacity>
          </View>
>>>>>>> 30c5877 (feat: frontend mypage redesign & CLIP embedding applied; manual label change supported)
        </View>

        {/* Content */}
        <View style={[$gridContainer, { position: 'relative' }]}>
          {allPhotos.length === 0 ? (
            <View style={$emptyState}>
              <Text style={$emptyText}>사진이 아직 없습니다</Text>
              <Text style={$emptySubtext}>
                갤러리에서 사진을 추가해보세요
              </Text>
            </View>
          ) : (
            <View style={$photoGrid}>
              {allPhotos.map((item) => {
                if (item.type === 'user') {
                  const isSelected = selectedImageIds.has(item.id)
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[$photoCard, { width: imageSize, height: imageSize }]}
                      onPress={() => {
                        if (isSelectMode) {
                          toggleImageSelection(item.id)
                        }
                      }}
                      activeOpacity={isSelectMode ? 0.7 : 1}
                    >
                      {isSelectMode ? (
                        <>
                          <Image
                            source={item.image}
                            style={{
                              width: "100%",
                              height: "100%",
                              opacity: isSelected ? 0.5 : 1,
                            }}
                            resizeMode="cover"
                          />
                          {isSelected && (
                            <View
                              style={{
                                position: "absolute",
                                top: spacing.md,
                                right: spacing.md,
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: colors.error,
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <Check size={16} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          )}
                        </>
                      ) : (
                        <GalleryImageCard
                          imageUri={item.image.uri}
                          label={item.ai_label || "라벨 없음"}
                          alternatives={item.label_alternatives || []}
                          labelManuallyEdited={item.label_manually_edited || false}
                          onLabelChange={async (newLabel: string) => {
                            try {
                              await api.updateImageLabel(item.id, newLabel)
                              // Refresh photos list after updating label
                              await getUserPhotos()
                            } catch (e) {
                              Alert.alert("오류", "라벨 업데이트 실패")
                            }
                          }}
                          onImageDelete={async () => {
                            // This callback is unused now since we removed delete from modal
                            // but keeping for API compatibility
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  )
                } else {
                  // Scrapped item
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[$photoCard, { width: imageSize, height: imageSize }]}
                      onPress={() => {
                        setSelectedRestaurantId(parseInt(item.id))
                        setIsModalVisible(true)
                      }}
                    >
                      <Image
                        source={item.image}
                        style={$photoImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )
                }
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Tabs or Delete Button */}
      {isSelectMode && selectedImageIds.size > 0 ? (
        <View style={[
          $bottomTabs,
          { backgroundColor: colors.error, justifyContent: "center" }
        ]}>
          <TouchableOpacity
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
            onPress={handleDeleteSelectedImages}
          >
            <Text style={{
              color: colors.palette.neutral100,
              fontSize: 16,
              fontWeight: "600"
            }}>
              삭제 ({selectedImageIds.size})
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
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
      )}

      {/* Quick Selection Button */}
      <TouchableOpacity
        testID="quick-select-button"
        style={[
          $floatingSelectButton,
          isSelectMode && { backgroundColor: colors.error }
        ]}
        onPress={() => {
          setIsSelectMode(!isSelectMode)
          if (isSelectMode) {
            setSelectedImageIds(new Set())
          }
        }}
      >
        <Check size={28} color="#FFFFFF" strokeWidth={3} />
      </TouchableOpacity>

      {/* Floating Gallery Button */}
      <TouchableOpacity
        testID="refresh-button"
        style={$floatingButton}
        disabled={isLoading}
        onPress={() => {
          setIsLoading(true)
          scanAlbums(() => {
            // Refresh photos list after new image is uploaded
            setTimeout(() => {
              getUserPhotos()
              setIsLoading(false)
            }, 500)
          })
        }}
      >
        <ImageIcon size={28} color={isLoading ? "#999" : "#FFFFFF"} />
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

      {/* Delete Confirmation Dialog */}
      <Modal visible={deleteConfirmationVisible} transparent animationType="fade">
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.lg,
          }}
          onPress={() => setDeleteConfirmationVisible(false)}
          activeOpacity={1}
        >
          <TouchableOpacity
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              padding: spacing.lg,
              minWidth: 280,
            }}
            onPress={() => {}}
            activeOpacity={1}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.text,
                marginBottom: spacing.md,
              }}
            >
              삭제 확인
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.palette.neutral700,
                marginBottom: spacing.lg,
                lineHeight: 24,
              }}
            >
              {selectedImageIds.size}개의 사진을 삭제하시겠습니까?
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                justifyContent: "flex-end",
              }}
            >
              <TouchableOpacity
                onPress={() => setDeleteConfirmationVisible(false)}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: 8,
                  backgroundColor: colors.palette.neutral200,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.text,
                  }}
                >
                  취소
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmDelete}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: 8,
                  backgroundColor: colors.error,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.palette.neutral100,
                  }}
                >
                  삭제
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={isSettingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSettingsModalVisible(false)}
      >
        <TouchableOpacity
          style={$settingsModalBackdrop}
          onPress={() => setIsSettingsModalVisible(false)}
          activeOpacity={1}
        >
          <TouchableOpacity
            style={$settingsModalContent}
            onPress={() => {}}
            activeOpacity={1}
          >
            <TouchableOpacity
              style={$logoutButtonContainer}
              onPress={() => {
                setIsSettingsModalVisible(false)
                logout()
              }}
            >
              <LogOut size={20} color={colors.error} strokeWidth={2} />
              <Text style={$logoutButtonText}>로그아웃</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: rotationValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            }}
          >
            <UtensilsCrossed
              size={64}
              color={colors.palette.primary500}
              strokeWidth={1.5}
            />
          </Animated.View>
          <Text
            style={{
              marginTop: spacing.lg,
              color: colors.palette.neutral100,
              fontSize: 14,
              fontWeight: "500",
            }}
          >
            로딩중...
          </Text>
        </View>
      )}
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

const $iconButtonSquare: ViewStyle = {
  width: 48,
  height: 48,
  borderRadius: 12,
  backgroundColor: colors.palette.neutral100,
  alignItems: "center",
  justifyContent: "center",
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

const $floatingSelectButton: ViewStyle = {
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

const $settingsModalBackdrop: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.lg,
}

const $settingsModalContent: ViewStyle = {
  backgroundColor: colors.background,
  borderRadius: 12,
  padding: spacing.lg,
  minWidth: 200,
}

const $logoutButtonContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderRadius: 8,
  backgroundColor: colors.palette.neutral100,
  gap: spacing.sm,
}

const $logoutButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.error,
}