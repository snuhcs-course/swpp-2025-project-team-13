import { useAlbumScanner } from "app/services/albums/useAlbumScanner"
import { api } from "app/services/api"
import { userAuthFacade } from "app/services/registration"
import * as Location from "expo-location"
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
import { GalleryImageCard, RestaurantDetailModal, Text, PreferencesModal, SettingsModal, AccountDeletionWarningModal, PasswordConfirmationModal, AccountDeletionSuccessModal, AccountDeletionErrorModal, LogoutConfirmationModal } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { colors, spacing } from "../theme"

interface ProfileScreenProps extends AppStackScreenProps<"Profile"> {}

export const ProfileScreen: React.FC<ProfileScreenProps> = observer(function ProfileScreen({ navigation }) {
  const rootStore = useStores()
  const { foodHistoryStore } = rootStore
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
  const [deletionWarningVisible, setDeletionWarningVisible] = useState(false)
  const [passwordConfirmationVisible, setPasswordConfirmationVisible] = useState(false)
  const [deletionSuccessVisible, setDeletionSuccessVisible] = useState(false)
  const [deletionErrorVisible, setDeletionErrorVisible] = useState(false)
  const [deletionErrorMessage, setDeletionErrorMessage] = useState("")
  const [logoutConfirmationVisible, setLogoutConfirmationVisible] = useState(false)
  
  // Location states
  const [userCoordinates, setUserCoordinates] = useState<[number, number] | null>(null)
  const [showLocationCoordinates, setShowLocationCoordinates] = useState(true) // Always show, but content varies
  const [isLocationRestricted, setIsLocationRestricted] = useState(false)
  const [isLocationLoading, setIsLocationLoading] = useState(true)
  const [locationLoadingDots, setLocationLoadingDots] = useState("")
  
  // Gallery permission modal
  const [galleryPermissionModalVisible, setGalleryPermissionModalVisible] = useState(false)
  
  // Album scan completion modal
  const [albumScanCompleteModalVisible, setAlbumScanCompleteModalVisible] = useState(false)
  const [foundImageCount, setFoundImageCount] = useState(0)
  
  // Gallery access state
  const [isGalleryAccessEnabled, setIsGalleryAccessEnabled] = useState(true)

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

  // Animate loading dots for location text
  useEffect(() => {
    if (!isLocationLoading) return

    const interval = setInterval(() => {
      setLocationLoadingDots(prev => {
        if (prev === "") return "."
        if (prev === ".") return ".."
        if (prev === "..") return "..."
        return ""
      })
    }, 1000) // Change dots every second

    return () => clearInterval(interval)
  }, [isLocationLoading])

  // Check location permission and get coordinates if enabled
  const checkLocationAndUpdateCoordinates = async () => {
    setIsLocationLoading(true)
    
    try {
      // Check stored permission states from onboarding
      const storedLocationGranted = await storage.loadString("LOCATION_PERMISSION_GRANTED")
      const useDummyLocation = await storage.loadString("USE_DUMMY_LOCATION")
      
      if (__DEV__) {
        console.log('📍 ProfileScreen location check:', {
          storedLocationGranted,
          useDummyLocation,
        })
      }
      
      // Only show coordinates if permission was granted in onboarding AND not using dummy location
      const shouldShowCoordinates = storedLocationGranted === 'true' && useDummyLocation !== 'true'
      
      if (__DEV__) {
        console.log('📍 ProfileScreen shouldShowCoordinates:', shouldShowCoordinates)
      }
      
      if (shouldShowCoordinates) {
        // Check current system permission status
        const { status } = await Location.getForegroundPermissionsAsync()
        
        if (status === 'granted') {
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            })
            
            const coordinates: [number, number] = [
              location.coords.longitude,
              location.coords.latitude
            ]
            
            setUserCoordinates(coordinates)
            setIsLocationRestricted(false)
            setIsLocationLoading(false)
          } catch (error) {
            console.log('Failed to get current location:', error)
            // Location permission granted but failed to get location - show restriction
            setUserCoordinates([126.952741, 37.481227]) // Seoul National University Station
            setIsLocationRestricted(true)
            setIsLocationLoading(false)
          }
        } else {
          // System permission not granted - show restriction message
          setUserCoordinates([126.952741, 37.481227]) // Seoul National University Station
          setIsLocationRestricted(true)
          setIsLocationLoading(false)
        }
      } else {
        // Location permission not granted in onboarding - show restriction message with default coordinates
        setUserCoordinates([126.952741, 37.481227]) // Seoul National University Station
        setIsLocationRestricted(true)
        setIsLocationLoading(false)
      }
    } catch (error) {
      console.log('Error checking location permission:', error)
      // On error, show restriction message with default coordinates  
      setUserCoordinates([126.952741, 37.481227]) // Seoul National University Station
      setIsLocationRestricted(true)
      setIsLocationLoading(false)
    }
  }

  useEffect(() => {
    checkLocationAndUpdateCoordinates()
    updateGalleryAccessState()
  }, [])

  // Also check location and gallery access when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkLocationAndUpdateCoordinates()
      updateGalleryAccessState()
    })

    return unsubscribe
  }, [navigation])

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

    // Replace the entire list to ensure deleted images are removed
    setUserImages(currentImages)
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
      setIsLoading(true)
      const imageIds = Array.from(selectedImageIds)
      const failedDeletions: number[] = []
      
      // Delete each image
      for (const id of imageIds) {
        try {
          const response = await api.deleteImage(id)
          if (!response.ok) {
            failedDeletions.push(id)
            console.error(`Failed to delete image ${id}:`, response.problem)
          }
        } catch (error) {
          failedDeletions.push(id)
          console.error(`Error deleting image ${id}:`, error)
        }
      }
      
      if (failedDeletions.length > 0) {
        Alert.alert("오류", `${failedDeletions.length}개의 사진 삭제에 실패했습니다.`)
      }
      
      // Remove successfully deleted images from state immediately for better UX
      const successfullyDeletedIds = imageIds.filter(id => !failedDeletions.includes(id))
      if (successfullyDeletedIds.length > 0) {
        setUserImages(prev => prev.filter(img => !successfullyDeletedIds.includes(img.id)))
      }
      
      // Refresh photos list to ensure consistency with server
      await getUserPhotos()
      
      // Clear selection
      setSelectedImageIds(new Set())
      setIsSelectMode(false)
      setDeleteConfirmationVisible(false)
      
      // Note: Recommendations will be refreshed when user visits Foodigram tab
      // Staying on Profile tab as requested
    } catch (e) {
      console.error("Delete error:", e)
      Alert.alert("오류", "사진 삭제 중 오류가 발생했습니다.")
      setDeleteConfirmationVisible(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Mock data for profile
  const user = {
    name: userName,
  }

  // Get scrapped items from store
  const scrappedFoods = foodHistoryStore.scrappedItemsList

  // Convert scrapped foods to consistent format, filtering out empty images
  const scrappedImages = scrappedFoods
    .filter(food => food.image && food.image.trim()) // Only include items with valid images
    .map(food => ({
      id: food.id.toString(),
      type: 'scrapped',
      image: { uri: food.image },
      name: food.name
    }))

  // Combine user images and scrapped images
  const allPhotos = [...userImages, ...scrappedImages]

  const logout = async () => {
    await userAuthFacade.logoutUser()
    // Clear all user-specific data from stores to prevent sharing between users
    await rootStore.clearUserData()
    // Navigate to Welcome screen after logout
    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    })
  }

  const handleDeleteAccount = () => {
    setDeletionWarningVisible(true)
  }

  const handleDeletionWarningConfirm = () => {
    setDeletionWarningVisible(false)
    setPasswordConfirmationVisible(true)
  }

  const handleDeletionWarningCancel = () => {
    setDeletionWarningVisible(false)
  }

  const handlePasswordConfirm = async (password: string) => {
    setPasswordConfirmationVisible(false)
    
    try {
      // Step 1: Validate password with Django backend first
      const response = await api.deleteAccount(password)
      
      if (response.ok) {
        // Password is valid and Django account deleted, now delete from AWS Cognito
        try {
          // Step 2: Delete from AWS Cognito
          const cognitoResult = await userAuthFacade.deleteUserAccount()
          
          if (cognitoResult.success) {
            // Both Django and Cognito deletion successful
            setDeletionSuccessVisible(true)
          } else {
            // Django deleted but Cognito failed
            setDeletionErrorMessage("AWS 계정 삭제에 실패했습니다. 다시 시도해주세요.")
            setDeletionErrorVisible(true)
          }
        } catch (cognitoError) {
          console.error("Cognito deletion error:", cognitoError)
          // Django deleted but Cognito failed
          setDeletionErrorMessage("AWS 계정 삭제에 실패했습니다. 관리자에게 문의하세요.")
          setDeletionErrorVisible(true)
        }
      } else {
        // Password validation failed
        const errorData = response.data as any
        const errorMessage = errorData?.detail || "계정 삭제에 실패했습니다."
        
        if (errorMessage.toLowerCase().includes("invalid password")) {
          setDeletionErrorMessage("비밀번호가 올바르지 않습니다.")
        } else {
          setDeletionErrorMessage("계정 삭제에 실패했습니다.")
        }
        setDeletionErrorVisible(true)
        setPasswordConfirmationVisible(true)
      }
    } catch (error) {
      console.error("Account deletion error:", error)
      setDeletionErrorMessage("계정 삭제 중 오류가 발생했습니다.")
      setDeletionErrorVisible(true)
      setPasswordConfirmationVisible(true)
    }
  }

  const handlePasswordCancel = () => {
    setPasswordConfirmationVisible(false)
  }

  const handleDeletionSuccess = () => {
    setDeletionSuccessVisible(false)
    // Navigate back to initial screen (Welcome)
    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    })
  }

  // Check if gallery access is enabled based on onboarding choices
  const checkGalleryAccess = async () => {
    try {
      const storedGalleryGranted = await storage.loadString("GALLERY_PERMISSION_GRANTED")
      const useDummyStorage = await storage.loadString("USE_DUMMY_STORAGE")
      
      // Gallery is enabled if permission was granted AND not using dummy storage
      return storedGalleryGranted === 'true' && useDummyStorage !== 'true'
    } catch (error) {
      console.log('Error checking gallery access:', error)
      return false
    }
  }

  // Update gallery access state for UI
  const updateGalleryAccessState = async () => {
    const isEnabled = await checkGalleryAccess()
    setIsGalleryAccessEnabled(isEnabled)
    
    if (__DEV__) {
      console.log('Gallery access state updated:', isEnabled)
    }
  }

  const handleAlbumButtonPress = async () => {
    const isGalleryEnabled = await checkGalleryAccess()
    
    if (isGalleryEnabled) {
      // Gallery access enabled - proceed with normal album scanning
      setIsLoading(true)
      
      try {
        await scanAlbums(
          // onFoodFound callback - called for each new food image found
          (asset) => {
            console.log(`Found new food image: ${asset.uri}`)
          },
          // onCompleted callback - called when scanning is complete
          (foundCount) => {
            setIsLoading(false)
            setFoundImageCount(foundCount)
            setAlbumScanCompleteModalVisible(true)
            
            // Refresh photos list to show new images
            getUserPhotos()
            
            // Stay on Profile tab - don't navigate to Foodigram after scan completion
          }
        )
      } catch (error) {
        console.error("Album scanning error:", error)
        setIsLoading(false)
        // Could show an error modal here if needed
      }
    } else {
      // Gallery access disabled - show permission required modal
      setGalleryPermissionModalVisible(true)
    }
  }

  return (
    <View style={$container}>
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
                  const isImageDisabled = !isGalleryAccessEnabled
                  
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[$photoCard, { width: imageSize, height: imageSize }]}
                      onPress={() => {
                        if (!isImageDisabled && isSelectMode) {
                          toggleImageSelection(item.id)
                        }
                      }}
                      activeOpacity={isImageDisabled ? 1 : (isSelectMode ? 0.7 : 1)}
                      disabled={isImageDisabled && !isSelectMode}
                    >
                      {isSelectMode ? (
                        <>
                          {item.image?.uri && item.image.uri.trim() ? (
                            <Image
                              source={item.image}
                              style={{
                                width: "100%",
                                height: "100%",
                                opacity: isImageDisabled ? 0.5 : (isSelected ? 0.5 : 1),
                              }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={{
                              width: "100%",
                              height: "100%",
                              backgroundColor: colors.palette.neutral300,
                              justifyContent: "center",
                              alignItems: "center",
                              opacity: isImageDisabled ? 0.5 : (isSelected ? 0.5 : 1),
                            }}>
                              <Text style={{ color: colors.palette.neutral500, fontSize: 12 }}>이미지 없음</Text>
                            </View>
                          )}
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
                          disabled={isImageDisabled}
                          onLabelChange={async (newLabel: string) => {
                            try {
                              await api.updateImageLabel(item.id, newLabel)
                              // Refresh photos list after updating label
                              await getUserPhotos()
                              // Signal FoodigramScreen to refresh recommendations (user updated image label)
                              navigation.navigate("Foodigram", {
                                refreshRecommendations: true,
                                refreshReason: "food_label_changed"
                              } as any)
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
                      {item.image?.uri && item.image.uri.trim() ? (
                        <Image
                          source={item.image}
                          style={$photoImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[$photoImage, {
                          backgroundColor: colors.palette.neutral300,
                          justifyContent: "center",
                          alignItems: "center",
                        }]}>
                          <Text style={{ color: colors.palette.neutral500, fontSize: 12 }}>이미지 없음</Text>
                        </View>
                      )}
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
        onPress={handleAlbumButtonPress}
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
        onPreferencesSaved={() => {
          // Signal FoodigramScreen to refresh recommendations (user updated preferences)
          navigation.navigate("Foodigram", {
            refreshRecommendations: true,
            refreshReason: "preferences_updated"
          } as any)
        }}
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
      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => {
          setIsSettingsModalVisible(false)
          // Refresh location and gallery access state when settings modal closes
          checkLocationAndUpdateCoordinates()
          updateGalleryAccessState()
        }}
        onLogout={() => {
          setIsSettingsModalVisible(false)
          setLogoutConfirmationVisible(true)
        }}
        onDeleteAccount={() => {
          setIsSettingsModalVisible(false)
          handleDeleteAccount()
        }}
      />

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

      {/* Account Deletion Modals */}
      <AccountDeletionWarningModal
        visible={deletionWarningVisible}
        onCancel={handleDeletionWarningCancel}
        onConfirm={handleDeletionWarningConfirm}
      />

      <PasswordConfirmationModal
        visible={passwordConfirmationVisible}
        onCancel={handlePasswordCancel}
        onConfirm={handlePasswordConfirm}
      />

      <AccountDeletionSuccessModal
        visible={deletionSuccessVisible}
        onConfirm={handleDeletionSuccess}
      />

      <AccountDeletionErrorModal
        visible={deletionErrorVisible}
        onClose={() => setDeletionErrorVisible(false)}
        errorMessage={deletionErrorMessage}
      />

      {/* Gallery Permission Required Modal */}
      <Modal
        visible={galleryPermissionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGalleryPermissionModalVisible(false)}
      >
        <TouchableOpacity
          style={$galleryModalOverlay}
          activeOpacity={1}
          onPress={() => setGalleryPermissionModalVisible(false)}
        >
          <TouchableOpacity
            style={$galleryModalContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={$galleryModalIconContainer}>
              <ImageIcon size={48} color="#f66c51" />
            </View>
            
            <Text style={$galleryModalTitle}>갤러리 접근 권한 필요</Text>
            
            <Text style={$galleryModalMessage}>
              갤러리에서 음식 사진을 가져오려면{'\n'}
              갤러리 접근 권한이 필요합니다.{'\n\n'}
              설정에서 갤러리 접근을 활성화해주세요.
            </Text>
            
            <TouchableOpacity 
              style={$galleryModalButton}
              onPress={() => setGalleryPermissionModalVisible(false)}
            >
              <Text style={$galleryModalButtonText}>확인</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Album Scan Completion Modal */}
      <Modal
        visible={albumScanCompleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlbumScanCompleteModalVisible(false)}
      >
        <TouchableOpacity
          style={$albumCompleteModalOverlay}
          activeOpacity={1}
          onPress={() => setAlbumScanCompleteModalVisible(false)}
        >
          <TouchableOpacity
            style={$albumCompleteModalContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={$albumCompleteModalIconContainer}>
              <ImageIcon size={48} color="#f66c51" />
            </View>
            
            <Text style={$albumCompleteModalTitle}>갤러리 스캔 완료</Text>
            
            <Text style={$albumCompleteModalMessage}>
              {foundImageCount}개의 이미지를 불러왔습니다.
            </Text>
            
            <TouchableOpacity 
              style={$albumCompleteModalButton}
              onPress={() => setAlbumScanCompleteModalVisible(false)}
            >
              <Text style={$albumCompleteModalButtonText}>확인</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        visible={logoutConfirmationVisible}
        onClose={() => setLogoutConfirmationVisible(false)}
        onConfirm={() => {
          setLogoutConfirmationVisible(false)
          logout()
        }}
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

const $coordinatesText: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginTop: 4,
  fontFamily: "monospace", // Use monospace font for better coordinate readability
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

const $galleryModalOverlay: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 20,
}

const $galleryModalContainer: ViewStyle = {
  width: "100%",
  maxWidth: 340,
  backgroundColor: "#f8f6f5",
  borderRadius: 16,
  padding: 24,
  alignItems: "center",
  elevation: 8,
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.25,
  shadowRadius: 8,
}

const $galleryModalIconContainer: ViewStyle = {
  marginBottom: 16,
  marginTop: 8,
}

const $galleryModalTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
  color: "#1c100d",
  marginBottom: 12,
  textAlign: "center",
}

const $galleryModalMessage: TextStyle = {
  fontSize: 16,
  color: "#9c5749",
  textAlign: "center",
  lineHeight: 24,
  marginBottom: 24,
}

const $galleryModalButton: ViewStyle = {
  width: "100%",
  height: 48,
  backgroundColor: "#f66c51",
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
}

const $galleryModalButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: "#FFFFFF",
}

const $albumCompleteModalOverlay: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 20,
}

const $albumCompleteModalContainer: ViewStyle = {
  width: "100%",
  maxWidth: 340,
  backgroundColor: "#f8f6f5",
  borderRadius: 16,
  padding: 24,
  alignItems: "center",
  elevation: 8,
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.25,
  shadowRadius: 8,
}

const $albumCompleteModalIconContainer: ViewStyle = {
  marginBottom: 16,
  marginTop: 8,
}

const $albumCompleteModalTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "700",
  color: "#1c100d",
  marginBottom: 12,
  textAlign: "center",
}

const $albumCompleteModalMessage: TextStyle = {
  fontSize: 16,
  color: "#9c5749",
  textAlign: "center",
  lineHeight: 24,
  marginBottom: 24,
}

const $albumCompleteModalButton: ViewStyle = {
  width: "100%",
  height: 48,
  backgroundColor: "#f66c51",
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
}

const $albumCompleteModalButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "700",
  color: "#FFFFFF",
}

