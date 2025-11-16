import React, { useState, useCallback, useRef } from "react"
import {
  Image,
  Pressable,
  Text,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { spacing, colors } from "app/theme"
import { X, Search } from "lucide-react-native"
import { api } from "app/services/api"

interface ImageLabelOption {
  name: string
  confidence: number
}

interface GalleryImageCardProps {
  imageUri: string
  label: string
  alternatives: ImageLabelOption[]
  labelManuallyEdited?: boolean
  onLabelChange: (newLabel: string) => Promise<void>
  onImageDelete: () => Promise<void>
}

export const GalleryImageCard: React.FC<GalleryImageCardProps> = ({
  imageUri,
  label,
  alternatives,
  labelManuallyEdited = false,
  onLabelChange,
  onImageDelete,
}) => {
  // States: 'none' | 'overlay' | 'modal'
  const [displayState, setDisplayState] = useState<'none' | 'overlay' | 'modal'>('none')
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    primary: ImageLabelOption[]
    secondary: ImageLabelOption[]
  }>({ primary: [], secondary: [] })
  const [confirmationDialogVisible, setConfirmationDialogVisible] = useState(false)
  const [confirmationLabel, setConfirmationLabel] = useState("")

  // Animated value for overlay fade effect
  const overlayOpacity = useRef(new Animated.Value(0)).current

  // Refs for press timing
  const longPressTimeoutRef = useRef<NodeJS.Timeout>()
  const pressStartTimeRef = useRef<number>(0)

  // Handle search text changes - just update the text, no API call yet
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text)
  }, [])

  // Perform search when user presses Enter or clicks search button
  const performSearch = useCallback(async () => {
    if (!searchText.trim()) {
      setSearchResults({ primary: [], secondary: [] })
      return
    }

    setIsSearching(true)

    try {
      const response = await api.searchFoods(searchText)
      const data = response.data as any
      // Convert string results to objects with confidence 1.0
      const primaryResults = (data.primary_results || []).map((name: string) => ({
        name,
        confidence: 1.0,
      }))
      const secondaryResults = (data.secondary_results || []).map((name: string) => ({
        name,
        confidence: 0.8,
      }))
      setSearchResults({
        primary: primaryResults,
        secondary: secondaryResults,
      })
    } catch (error) {
      console.error("Error searching foods:", error)
      setSearchResults({ primary: [], secondary: [] })
    } finally {
      setIsSearching(false)
    }
  }, [searchText])

  // Initialize results when modal opens
  const handleDisplayStateChange = useCallback(
    (state: 'none' | 'overlay' | 'modal') => {
      setDisplayState(state)
      if (state === 'none') {
        setSearchText('')
        setSearchResults({ primary: [], secondary: [] })
      } else if (state === 'modal' && !searchText.trim()) {
        // Show default alternatives when modal opens
        setSearchResults({
          primary: alternatives.slice(0, 4),
          secondary: [],
        })
      }
    },
    [searchText, alternatives]
  )

  // Fade in overlay
  const animateOverlayIn = useCallback(() => {
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start()
  }, [overlayOpacity])

  // Fade out overlay
  const animateOverlayOut = useCallback(() => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setDisplayState('none')
    })
  }, [overlayOpacity])

  const handlePressIn = useCallback(() => {
    pressStartTimeRef.current = Date.now()

    // Start timer for long press (800ms to show modal)
    longPressTimeoutRef.current = setTimeout(() => {
      // Long press complete - show modal (always, regardless of current state)
      handleDisplayStateChange('modal')
    }, 800)
  }, [handleDisplayStateChange])

  const handlePressOut = useCallback(() => {
    const pressDuration = Date.now() - pressStartTimeRef.current

    // If released before 800ms, show overlay (if not already showing modal) and stop the long press timer
    if (pressDuration < 800) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
      // Only show overlay if modal is not already open
      if (displayState !== 'modal') {
        handleDisplayStateChange('overlay')
        animateOverlayIn()
      }
    }
  }, [animateOverlayIn, displayState, handleDisplayStateChange])

  const handleImagePress = useCallback(() => {
    // Only dismiss overlay on image click, not modal
    if (displayState === 'overlay') {
      animateOverlayOut()
    }
    // If modal is showing, image click does nothing - only backdrop click dismisses
  }, [displayState, animateOverlayOut])

  const handleBackdropPress = useCallback(() => {
    // Backdrop click dismisses modal (and overlay if it was showing)
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }
    animateOverlayOut()
  }, [animateOverlayOut])

  const handleLabelChange = (newLabel: string) => {
    setConfirmationLabel(newLabel)
    setConfirmationDialogVisible(true)
  }

  const handleConfirmLabelChange = async () => {
    try {
      setIsLoading(true)
      await onLabelChange(confirmationLabel)
      setConfirmationDialogVisible(false)
    } catch (error) {
      Alert.alert("오류", "라벨 수정 실패")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseModal = () => {
    handleDisplayStateChange('none')
  }

  // Helper function to determine the correct Korean particle (로/으로)
  const getKoreanParticle = (name: string): string => {
    if (!name || name.length === 0) return "로"
    const lastChar = name.charCodeAt(name.length - 1)
    // Korean character range: 0xAC00 ~ 0xD7A3
    // If (charCode - 0xAC00) % 28 !== 0, it has a final consonant (받침)
    if (lastChar >= 0xAC00 && lastChar <= 0xD7A3) {
      return ((lastChar - 0xAC00) % 28) !== 0 ? "으로" : "로"
    }
    return "로"
  }

  return (
    <>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleImagePress}
        testID="gallery-image-card"
      >
        <Image
          source={{ uri: imageUri }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 8,
          }}
          testID="gallery-image"
        />

        {/* Overlay with semi-transparent black layer - shows on short press or while modal is open */}
        {(displayState === 'overlay' || displayState === 'modal') && (
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              borderRadius: 8,
              justifyContent: "center",
              alignItems: "center",
              opacity: overlayOpacity,
            }}
            testID="label-overlay"
          >
            {/* Label text */}
            <Text
              style={{
                color: colors.palette.neutral100,
                fontSize: 18,
                fontWeight: "600",
                textAlign: "center",
                paddingHorizontal: spacing.md,
              }}
              testID="label-text"
            >
              {label}
            </Text>

            {/* Confidence indicator */}
            <Text
              style={{
                color: colors.palette.neutral300,
                fontSize: 12,
                marginTop: spacing.xs,
              }}
            >
              {labelManuallyEdited ? "(직접 입력)" : "(자동 추천)"}
            </Text>
          </Animated.View>
        )}
      </Pressable>

      {/* Label Selection Modal */}
      <Modal visible={displayState === 'modal'} transparent animationType="fade">
        <Pressable
          onPress={handleBackdropPress}
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
          testID="modal-backdrop"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.palette.neutral100,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xl,
              maxHeight: "70%",
            }}
            testID="modal-content"
          >
            {isLoading ? (
              <ActivityIndicator size="large" testID="loading-indicator" />
            ) : (
              <>
                {/* Modal Header with Title and Close Button */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: spacing.md,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                    }}
                    testID="modal-title"
                  >
                    카테고리 수정
                  </Text>
                  <Pressable onPress={handleCloseModal}>
                    <X size={24} color="#999" strokeWidth={2} />
                  </Pressable>
                </View>

                {/* Current label */}
                <Pressable
                  onPress={() => handleLabelChange(label)}
                  style={{
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.palette.neutral200,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  testID={`label-option-${label}`}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                    }}
                  >
                    {label} ✓
                  </Text>
                </Pressable>

                {/* Search Bar with Search Button */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginVertical: spacing.md,
                  }}
                >
                  <TextInput
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: colors.palette.neutral300,
                      borderRadius: 8,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      fontSize: 14,
                    }}
                    placeholder="직접 찾아볼까요?"
                    placeholderTextColor={colors.palette.neutral400}
                    value={searchText}
                    onChangeText={handleSearchTextChange}
                    onSubmitEditing={performSearch}
                    testID="search-input"
                    editable={!isSearching}
                  />
                  <Pressable
                    onPress={performSearch}
                    disabled={isSearching}
                    style={{
                      marginLeft: spacing.sm,
                      padding: spacing.sm,
                    }}
                    testID="search-button"
                  >
                    <Search
                      size={24}
                      color={isSearching ? colors.palette.neutral400 : colors.palette.neutral700}
                    />
                  </Pressable>
                </View>

                {/* Search Results or Default Options */}
                <ScrollView style={{ marginBottom: spacing.lg }}>
                  {isSearching && (
                    <View style={{ paddingVertical: spacing.lg, alignItems: "center" }}>
                      <ActivityIndicator size="small" />
                    </View>
                  )}

                  {!isSearching && (
                    <>
                      {/* Primary Results - items that start with search text */}
                      {searchResults.primary.map((item, idx) => (
                        <Pressable
                          key={`primary-${idx}`}
                          onPress={() => handleLabelChange(item.name)}
                          style={{
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.sm,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.palette.neutral200,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                          testID={`label-option-${item.name}`}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                            }}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: colors.palette.neutral500,
                            }}
                          >
                            {(item.confidence * 100).toFixed(0)}%
                          </Text>
                        </Pressable>
                      ))}

                      {/* Secondary Results - items that contain search text */}
                      {searchResults.secondary.map((item, idx) => (
                        <Pressable
                          key={`secondary-${idx}`}
                          onPress={() => handleLabelChange(item.name)}
                          style={{
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.sm,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.palette.neutral200,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                          testID={`label-option-${item.name}`}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                            }}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: colors.palette.neutral500,
                            }}
                          >
                            {(item.confidence * 100).toFixed(0)}%
                          </Text>
                        </Pressable>
                      ))}

                      {/* No Results Message */}
                      {searchText.trim() &&
                        searchResults.primary.length === 0 &&
                        searchResults.secondary.length === 0 && (
                          <View
                            style={{
                              paddingVertical: spacing.lg,
                              paddingHorizontal: spacing.md,
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                color: colors.palette.neutral500,
                              }}
                            >
                              검색 결과가 없습니다
                            </Text>
                          </View>
                        )}
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmation Dialog */}
      <Modal visible={confirmationDialogVisible} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.lg,
          }}
          onPress={() => setConfirmationDialogVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              padding: spacing.lg,
              minWidth: 280,
            }}
            onPress={() => {}}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.text,
                marginBottom: spacing.md,
              }}
            >
              카테고리 수정
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.palette.neutral700,
                marginBottom: spacing.lg,
                lineHeight: 24,
              }}
            >
              {confirmationLabel}{getKoreanParticle(confirmationLabel)} 수정할까요?
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                justifyContent: "flex-end",
              }}
            >
              <TouchableOpacity
                onPress={() => setConfirmationDialogVisible(false)}
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
                  아니오
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmLabelChange}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: 8,
                  backgroundColor: colors.palette.primary500,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.palette.neutral100,
                  }}
                >
                  예
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
