import { LinearGradient } from "expo-linear-gradient"
import { Bookmark, Home, User, Search, X } from "lucide-react-native"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState, useRef, useCallback } from "react"
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  RefreshControl,
  FlatList,
  TextStyle, TouchableOpacity,
  View, ViewStyle,
  ListRenderItem,
  TextInput,
  Modal,
  Pressable
} from "react-native"
import { ScrapToast, Text } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { api } from "../services/api"
import type { MenuRecommendationItem } from "../services/api/api.types"
import { colors, spacing } from "../theme"

interface FoodigramScreenProps extends AppStackScreenProps<"Foodigram"> {}

export const FoodigramScreen: React.FC<FoodigramScreenProps> = observer(function FoodigramScreen({
  navigation,
  route,
}) {
  const { menuScrapStore } = useStores()

  // Recommended menu related states
  const [recommendedMenus, setRecommendedMenus] = useState<MenuRecommendationItem[]>([])
  const [allFetchedMenus, setAllFetchedMenus] = useState<MenuRecommendationItem[]>([]) // All menus fetched from API
  const [displayedMenuCount, setDisplayedMenuCount] = useState(0) // How many menus to display (incremental)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState<{ [key: string]: boolean }>({})
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [currentMaxResults, setCurrentMaxResults] = useState(10)
  const [showScrapToast, setShowScrapToast] = useState(false)
  const flatListRef = useRef<FlatList>(null)
  const incrementalDisplayTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Query context related states
  const [showQueryModal, setShowQueryModal] = useState(false)
  const [queryContext, setQueryContext] = useState("")
  const [isProcessingQuery, setIsProcessingQuery] = useState(false)

  // Request deduplication: track pending requests to prevent duplicate API calls
  const pendingRequestRef = useRef<{
    query: string
    promise: Promise<any>
  } | null>(null)

  // Loading animation for recommendations
  const rotationValue = useRef(new Animated.Value(0)).current

  // Request debouncing: Prevent concurrent requests during app initialization
  // Backend automatically aggregates user's profile image labels, so frontend debounce
  // just batches the requests without needing to pass image labels
  const debouncedFetchRecommendations = useCallback((append = false, queryText?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Access global debounce state (persists across component mounts)
      if (!(window as any).__foodigramDebounceState) {
        (window as any).__foodigramDebounceState = {
          timer: null as NodeJS.Timeout | null,
          append: false,
          pendingPromises: [] as Array<{ resolve: () => void; reject: (error: any) => void }>,
        }
      }

      const state = (window as any).__foodigramDebounceState

      // Store this promise so we can resolve all pending calls with one request
      state.pendingPromises.push({ resolve, reject })

      // Update append flag (later calls override earlier)
      if (append) state.append = append

      // Clear previous timer
      if (state.timer) {
        clearTimeout(state.timer)
        if (__DEV__) {
          console.log(`⏱️ Debounce: Reset timer (500ms) - batching request #${state.pendingPromises.length}`)
        }
      } else if (__DEV__) {
        console.log(`⏱️ Debounce: Started timer (500ms) - will batch concurrent requests`)
      }

      // Set new timer - wait 500ms before fetching to batch multiple calls
      state.timer = setTimeout(async () => {
        try {
          const appendVal = state.append
          const promises = state.pendingPromises

          if (__DEV__) {
            console.log(`🚀 Debounce: Executing single API request after 500ms`)
            console.log(`   Batched ${promises.length} concurrent calls into 1 request`)
            console.log(`   Backend will auto-aggregate user's profile image labels`)
          }

          // Make the actual API request
          // Backend automatically aggregates user's profile image labels
          await fetchRecommendations(appendVal, queryText)

          // Resolve ALL pending promises with the same result
          promises.forEach((p: any) => p.resolve())
        } catch (error) {
          // Reject ALL pending promises with the same error
          state.pendingPromises.forEach((p: any) => p.reject(error))
        } finally {
          // Reset state for next batch
          state.timer = null
          state.append = false
          state.pendingPromises = []
        }
      }, 500)
    })
  }, [])

  // Fetch recommendations function
  const fetchRecommendations = async (append = false, queryText?: string) => {
    // User location info (should be obtained from GPS or user settings)
    const userLocation: [number, number] = [126.9619864, 37.477136] // Seoul Gangnam Station coordinates

    const maxResults = append ? currentMaxResults + 10 : 10
    const options: any = { maxResults }
    if (queryText) {
      options.queryText = queryText
    }

    // Create a unique query key for deduplication
    const queryKey = `${JSON.stringify(userLocation)}_${maxResults}_${queryText || ''}`

    try {
      // If there's already a pending request with the same parameters, wait for it instead
      if (pendingRequestRef.current && pendingRequestRef.current.query === queryKey) {
        if (__DEV__) {
          console.log('🔄 Request Deduplication: Reusing existing pending request for', queryKey.substring(0, 50))
        }
        return pendingRequestRef.current.promise
      }

      // Cancel any previous pending request with different parameters
      if (pendingRequestRef.current) {
        if (__DEV__) {
          console.log('⏸️ Cancelling previous request with different parameters')
        }
        pendingRequestRef.current = null
      }

      // Start the new request and track it
      if (__DEV__) {
        console.log('🚀 Starting streaming recommendation request for', queryKey.substring(0, 50))
      }

      // Create pending request holder BEFORE creating the promise
      // This prevents race condition with concurrent calls
      const pendingRequest: { query: string; promise: Promise<void> } = {
        query: queryKey,
        promise: Promise.resolve() // Placeholder, will be replaced
      }
      pendingRequestRef.current = pendingRequest

      const promise = (async () => {
        try {
          const uniquePlaceMenus: MenuRecommendationItem[] = []
          const seenPlaceIds = new Set<string>()
          let totalResults = 0

          // Stream results one by one
          for await (const chunk of api.streamMenuRecommendations(userLocation, options)) {
            if (chunk.type === 'metadata') {
              totalResults = chunk.total_results
              if (__DEV__) {
                console.log(`📊 Expecting ${totalResults} results...`)
              }
            } else if (chunk.type === 'result' && chunk.item) {
              const menu = chunk.item
              // Filter duplicates by place_name
              if (menu.image_urls && menu.image_urls.length > 0 && !seenPlaceIds.has(menu.place_name)) {
                uniquePlaceMenus.push(menu)
                seenPlaceIds.add(menu.place_name)

                if (!append) {
                  // Incremental: add each menu as it arrives
                  setAllFetchedMenus(prev => [...prev, menu])
                  setDisplayedMenuCount(prev => Math.min(prev + 1, uniquePlaceMenus.length))
                }

                if (__DEV__) {
                  console.log(`🍽️ Received menu ${uniquePlaceMenus.length}: ${menu.menu_name}`)
                }
              }
            }
          }

          if (__DEV__) {
            console.log('✅ Streaming request completed')
          }

          if (append) {
            // For append mode, add all new menus at once
            const existingIds = new Set(recommendedMenus.map(m => m.id))
            const newMenus = uniquePlaceMenus.filter(menu => !existingIds.has(menu.id))

            if (newMenus.length === 0) {
              setHasMoreData(false)
            } else {
              setRecommendedMenus(prev => [...prev, ...newMenus])
              setCurrentMaxResults(maxResults)
            }
          } else {
            // For initial load, we've already been adding incrementally
            setCurrentMaxResults(10)
            setHasMoreData(uniquePlaceMenus.length >= 10)
          }
        } finally {
          // Clear the pending request reference once it's done
          if (pendingRequestRef.current === pendingRequest) {
            pendingRequestRef.current = null
          }
        }
      })()

      // Store the actual promise (now created) into the pending request holder
      pendingRequest.promise = promise
      await promise
    } catch (error) {
      console.error("Failed to fetch recommended menus:", error)
      setHasMoreData(false)
      pendingRequestRef.current = null
    }
  }

  // Load more recommendations
  const loadMoreRecommendations = useCallback(async () => {
    if (isLoadingMore || !hasMoreData) return
    
    setIsLoadingMore(true)
    await fetchRecommendations(true)
    setIsLoadingMore(false)
  }, [isLoadingMore, hasMoreData])

  // Fetch recommendations only once on app initialization
  // Using ref to prevent multiple initializations from component re-mounts
  const hasInitializedRef = useRef(false)
  const lastRefreshTimeRef = useRef(0)

  useEffect(() => {
    if (hasInitializedRef.current) return

    hasInitializedRef.current = true
    setIsLoadingRecommendations(true)
    setAllFetchedMenus([]) // Clear previous results
    setDisplayedMenuCount(0)

    debouncedFetchRecommendations().finally(() => {
      setIsLoadingRecommendations(false)
    })

    // Cleanup: clear pending requests on unmount
    return () => {
      pendingRequestRef.current = null
    }
  }, [debouncedFetchRecommendations]) // Include debouncedFetchRecommendations in deps

  // Refresh recommendations only when user explicitly updates profile images, labels, or preferences
  // Check route params for explicit update signals (not just tab changes)
  useEffect(() => {
    const params = route?.params as any

    // Only refresh if explicitly signaled by ProfileScreen or SettingsScreen
    if (params?.refreshRecommendations) {
      const now = Date.now()
      if (now - lastRefreshTimeRef.current > 500) {
        lastRefreshTimeRef.current = now
        const trigger = params.refreshReason || 'unknown'
        if (__DEV__) {
          console.log(`🔄 Recommendation refresh triggered: ${trigger}`)
        }
        setHasMoreData(true)
        setIsLoadingRecommendations(true)
        setAllFetchedMenus([]) // Clear previous results
        setDisplayedMenuCount(0)
        debouncedFetchRecommendations().finally(() => {
          setIsLoadingRecommendations(false)
        }).catch((error) => {
          console.error("Failed to refresh recommendations:", error)
          setIsLoadingRecommendations(false)
        })
      }
    }
  }, [route?.params, debouncedFetchRecommendations])

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true)
    setHasMoreData(true)
    setIsLoadingRecommendations(true)
    setAllFetchedMenus([]) // Clear previous results
    setDisplayedMenuCount(0)
    // Use debounced version to prevent accidental double-refresh
    debouncedFetchRecommendations(false).finally(() => {
      setRefreshing(false)
      setIsLoadingRecommendations(false)
    })
  }

  // Handle end reached for infinite scroll
  const handleEndReached = useCallback(() => {
    if (hasMoreData && !isLoadingMore && !isLoadingRecommendations && recommendedMenus.length > 0) {
      loadMoreRecommendations()
    }
  }, [hasMoreData, isLoadingMore, isLoadingRecommendations, recommendedMenus.length, loadMoreRecommendations])

  // Preload images
  useEffect(() => {
    if (recommendedMenus.length === 0) return

    const preloadImages = async () => {
      try {
        // Preload current image and next 3 images
        const imagesToPreload = recommendedMenus.slice(0, 4).map((menu) => {
          if (menu.image_urls && menu.image_urls.length > 0) {
            return Image.prefetch(menu.image_urls[0])
          }
          return Promise.resolve()
        })

        await Promise.all(imagesToPreload)
        if (__DEV__) {
          console.log("Image preload completed")
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Image preload failed:", error)
        }
      }
    }

    preloadImages()
  }, [recommendedMenus])

  // Manage loading animation for recommendation processing
  useEffect(() => {
    if (isLoadingRecommendations && recommendedMenus.length === 0) {
      // Start rotation animation when loading with no results yet
      rotationValue.setValue(0)
      Animated.loop(
        Animated.timing(rotationValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start()
    }
  }, [isLoadingRecommendations, recommendedMenus.length, rotationValue])

  // Incremental display: show menus one by one as they are "processed"
  useEffect(() => {
    if (displayedMenuCount > 0 && displayedMenuCount <= allFetchedMenus.length) {
      // Update recommendedMenus with only the first displayedMenuCount items
      setRecommendedMenus(allFetchedMenus.slice(0, displayedMenuCount))

      // Schedule next item to display after 300ms
      if (displayedMenuCount < allFetchedMenus.length) {
        if (incrementalDisplayTimerRef.current) {
          clearTimeout(incrementalDisplayTimerRef.current)
        }
        incrementalDisplayTimerRef.current = setTimeout(() => {
          setDisplayedMenuCount(prev => prev + 1)
        }, 300)
      }
    }

    return () => {
      if (incrementalDisplayTimerRef.current) {
        clearTimeout(incrementalDisplayTimerRef.current)
      }
    }
  }, [displayedMenuCount, allFetchedMenus])

  const toggleBookmark = useCallback((menu: MenuRecommendationItem) => {
    const imageUrl = menu.image_urls && menu.image_urls.length > 0 ? menu.image_urls[0] : undefined
    
    const wasScrapped = menuScrapStore.isScrapped(menu.id)
    const isNowScrapped = menuScrapStore.toggleScrappedMenu({
      id: menu.id,
      menu_name: menu.menu_name,
      place_name: menu.place_name,
      price: menu.price,
      category: menu.category,
      location: menu.location,
      rating: menu.rating,
      review_count: menu.review_count,
      image_url: imageUrl,
      coordinates: menu.coordinates,
    })
    
    // Show toast only when item is newly scrapped (wasn't scrapped before, but is now)
    if (!wasScrapped && isNowScrapped) {
      setShowScrapToast(true)
    }
  }, [menuScrapStore])

  const handleSubmitQuery = useCallback(async () => {
    if (!queryContext.trim()) {
      return
    }

    setIsProcessingQuery(true)
    setShowQueryModal(false)

    try {
      // Fetch recommendations with context query - use debounced version
      await debouncedFetchRecommendations(false, queryContext.trim())
    } catch (error) {
      console.error("Failed to fetch context-aware recommendations:", error)
    } finally {
      setIsProcessingQuery(false)
      setQueryContext("")
    }
  }, [queryContext, debouncedFetchRecommendations])

  const screenHeight = Dimensions.get("window").height

  // Render individual menu item
  const renderMenuItem: ListRenderItem<MenuRecommendationItem> = useCallback(({ item: menu }) => {
    return (
      <ImageBackground
        source={{
          uri:
            menu.image_urls && menu.image_urls.length > 0
              ? menu.image_urls[0]
              : undefined,
        }}
        style={[$backgroundImage, { height: screenHeight }]}
        resizeMode="cover"
        onLoadStart={() => setIsImageLoading((prev) => ({ ...prev, [menu.id]: true }))}
        onLoadEnd={() => setIsImageLoading((prev) => ({ ...prev, [menu.id]: false }))}
        onError={() => setIsImageLoading((prev) => ({ ...prev, [menu.id]: false }))}
      >
        {/* Image Loading Indicator */}
        {isImageLoading[menu.id] && (
          <View style={$imageLoadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Top Gradient Overlay */}
        <LinearGradient
          colors={["rgba(0,0,0,0.6)", "transparent"]}
          style={$gradientOverlayTop}
        />

        {/* Bottom Gradient Overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={$gradientOverlay}
        />

        {/* Top Header */}
        <View style={$topHeader}>
          
        </View>

        {/* Bottom Info */}
        <View style={$bottomInfo}>
          <View style={$restaurantNameContainer}>
          <Text style={$restaurantName} numberOfLines={1} ellipsizeMode="tail">
            {menu.place_name}
          </Text>
          <TouchableOpacity
            style={$headerButton}
            onPress={() => toggleBookmark(menu)}
          >
            <Bookmark
              size={24}
              color="#fff"
              fill={menuScrapStore.isScrapped(menu.id) ? "#fff" : "transparent"}
            />
          </TouchableOpacity>
          </View>

          
          <Text style={$restaurantDetails} numberOfLines={1}>
            {menu.category} • {menu.location}
          </Text>
          <View style={$menuDetails}>
            <Text style={$menuNameLarge} numberOfLines={1}>
              {menu.menu_name}
            </Text>
            <Text style={$menuPriceLarge} numberOfLines={1}>
              {menu.price ? `₩${menu.price.toLocaleString()}` : "가격 정보 없음"}
            </Text>
            <Text style={$menuRatingLarge} numberOfLines={1}>
              ⭐ {menu.rating} (리뷰 {menu.review_count}개)
            </Text>
            {menu.reason && (
              <Text style={$menuReasonLarge} numberOfLines={3}>
                💡 {menu.reason}
              </Text>
            )}
          </View>
        </View>
      </ImageBackground>
    )
  }, [screenHeight, isImageLoading, toggleBookmark, menuScrapStore.scrappedMenus.length])

  // Get item layout for performance optimization
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: screenHeight,
      offset: screenHeight * index,
      index,
    }),
    [screenHeight]
  )

  // Key extractor
  const keyExtractor = useCallback((item: MenuRecommendationItem, index: number) => {
    return item.id?.toString() || `menu-${index}`
  }, [])

  // List footer component (loading spinner)
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null
    
    return (
      <View style={$bottomPaddingContainer}>
        <View style={$loadingMoreContainer}>
          <ActivityIndicator size="large" color="#f66c51" />
          <Text style={$loadingMoreText}>더 많은 맛집을 찾고 있어요...</Text>
        </View>
      </View>
    )
  }, [isLoadingMore])

  // List empty component
  const renderEmpty = useCallback(() => {
    if (isLoadingRecommendations) {
      return (
        <View style={[$loadingContainer, { height: screenHeight }]}>
          <Text style={$loadingText}>근처 맛집을 찾고 있어요...</Text>
        </View>
      )
    }
    
    return (
      <View style={[$emptyState, { height: screenHeight }]}>
        <Text style={$emptyText}>음식점을 불러오지 못했어요</Text>
        <Text style={$emptySubtext}>잠시 후 다시 시도해 주세요</Text>
      </View>
    )
  }, [isLoadingRecommendations, screenHeight])

  return (
    <View style={$container}>
      {/* Search/Query Header */}
      <View style={$queryHeader}>
        <TouchableOpacity
          style={$queryButton}
          onPress={() => setShowQueryModal(true)}
          disabled={isProcessingQuery}
        >
          <Search size={20} color={colors.palette.primary500} strokeWidth={2} />
          <Text style={$queryButtonText}>
            {queryContext ? queryContext.substring(0, 30) + "..." : "음식 취향 검색"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Full Screen Content */}
      <FlatList
        ref={flatListRef}
        data={recommendedMenus}
        renderItem={renderMenuItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        extraData={menuScrapStore.scrappedMenus.length}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f66c51"
            colors={["#f66c51"]}
            progressViewOffset={60}
          />
        }
        style={$fullScreenContainer}
        contentContainerStyle={$scrollContentContainer}
        bounces={true}
        pagingEnabled={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        updateCellsBatchingPeriod={50}
      />

      {/* Scrap Toast */}
      <ScrapToast
        visible={showScrapToast}
        onDismiss={() => setShowScrapToast(false)}
        onNavigate={() => navigation.navigate("Scrap")}
      />

      {/* Loading Overlay - show when recommendations loading with no results yet */}
      {isLoadingRecommendations && recommendedMenus.length === 0 && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <Animated.Image
            source={require("assets/images/logo.png")}
            style={{
              width: 80,
              height: 80,
              marginBottom: 24,
              transform: [
                {
                  rotate: rotationValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            }}
          />
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            추천하는 중...
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.palette.neutral500,
            }}
          >
            당신의 취향을 분석 중입니다
          </Text>
        </View>
      )}

      {/* Bottom Tabs */}
      <View style={$bottomTabs}>
        <TouchableOpacity
          style={$tabButton}
          onPress={() => {
            if (__DEV__) {
              console.log(`Home: tapped home button (already on Foodigram)`)
            }
            navigation.navigate("Foodigram")
          }}
        >
          <Home size={24} color={colors.palette.primary500} strokeWidth={2} />
          <Text style={$tabButtonTextActive}>추천</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={$tabButton}
          onPress={() => {
            if (__DEV__) {
              console.log(`Home: navigated to Scrap`)
            }
            navigation.navigate("Scrap")
          }}
        >
          <Bookmark size={24} color={colors.palette.neutral400} strokeWidth={2} />
          <Text style={$tabButtonText}>스크랩</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={$tabButton}
          onPress={() => {
            if (__DEV__) {
              console.log(`Home: navigated to Profile`)
            }
            navigation.navigate("Profile")
          }}
        >
          <User size={24} color={colors.palette.neutral400} strokeWidth={2} />
          <Text style={$tabButtonText}>마이페이지</Text>
        </TouchableOpacity>
      </View>

      {/* Query Context Modal */}
      <Modal
        visible={showQueryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQueryModal(false)}
      >
        <Pressable
          style={$queryModalBackdrop}
          onPress={() => setShowQueryModal(false)}
        >
          <Pressable
            style={$queryModalContent}
            onPress={() => {}} // Prevent closing when clicking on modal
          >
            <View style={$queryModalHeader}>
              <Text style={$queryModalTitle}>음식 취향 검색</Text>
              <TouchableOpacity onPress={() => setShowQueryModal(false)}>
                <X size={24} color={colors.palette.neutral700} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={$queryModalBody}>
              <Text style={$queryModalDescription}>
                어떤 음식을 찾고 계신가요? 자연스럽게 설명해주세요.
              </Text>

              <TextInput
                style={$queryModalInput}
                placeholder="예: 뜨끈한 국물이 있는 매운 국밥"
                placeholderTextColor={colors.palette.neutral400}
                value={queryContext}
                onChangeText={setQueryContext}
                multiline
                maxLength={200}
                editable={!isProcessingQuery}
              />

              <Text style={$queryModalCounter}>
                {queryContext.length}/200
              </Text>

              <TouchableOpacity
                style={[
                  $queryModalButton,
                  isProcessingQuery && $queryModalButtonDisabled,
                ]}
                onPress={handleSubmitQuery}
                disabled={isProcessingQuery || !queryContext.trim()}
              >
                {isProcessingQuery ? (
                  <ActivityIndicator size="small" color={colors.palette.neutral100} />
                ) : (
                  <Text style={$queryModalButtonText}>검색하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $fullScreenContainer: ViewStyle = {
  flex: 1,
  position: "relative",
}

const $scrollContentContainer: ViewStyle = {
  width: "100%",
}

const $backgroundImage: ViewStyle = {
  width: "100%",
  justifyContent: "space-between",
}

const $gradientOverlayTop: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  height: "25%",
}

const $gradientOverlay: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: "50%",
}

const $topHeader: ViewStyle = {
  position: "absolute",
  top: 24,
  left: 0,
  right: 0,
  paddingTop: spacing.xxl + spacing.md,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
  zIndex: 10,
}

const $headerButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
}

const $bottomInfo: ViewStyle = {
  position: "absolute",
  bottom: 85, // Above bottom tabs
  left: 0,
  right: 0,
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.sm,
  zIndex: 10,
}

const $restaurantNameContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  gap: spacing.sm,
}

const $restaurantName: TextStyle = {
  fontSize: 28,
  fontWeight: "bold",
  color: "#fff",
  marginBottom: 4,
  lineHeight: 36,
  flex: 1,
  flexShrink: 1,
}

const $restaurantDetails: TextStyle = {
  fontSize: 16,
  color: "#fff",
  marginBottom: spacing.sm,
}

const $menuDetails: ViewStyle = {
  gap: spacing.xs,
}

const $menuNameLarge: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: "#fff",
}

const $menuPriceLarge: TextStyle = {
  fontSize: 15,
  fontWeight: "500",
  color: "#fff",
}

const $menuRatingLarge: TextStyle = {
  fontSize: 13,
  color: "#fff",
}

const $menuReasonLarge: TextStyle = {
  fontSize: 13,
  color: "rgba(255,255,255,0.85)",
  fontStyle: "italic",
  marginTop: 4,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
}

const $loadingText: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral400,
}

const $imageLoadingContainer: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0,0,0,0.3)",
  zIndex: 20,
}


const $emptyState: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  backgroundColor: colors.background,
}

const $emptyText: TextStyle = {
  fontSize: 18,
  color: colors.palette.neutral400,
  marginBottom: spacing.xs,
}

const $emptySubtext: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral400,
  textAlign: "center",
}

const $bottomPaddingContainer: ViewStyle = {
  height: 100,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.lg,
  marginBottom: 80
}

const $loadingMoreContainer: ViewStyle = {
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.sm,
}

const $loadingMoreText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral400,
  marginTop: spacing.xs,
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

// Query context styles
const $queryHeader: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $queryButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.sm,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 8,
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
}

const $queryButtonText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
  flex: 1,
}

const $queryModalBackdrop: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.lg,
}

const $queryModalContent: ViewStyle = {
  width: "100%",
  backgroundColor: colors.background,
  borderRadius: 12,
  overflow: "hidden",
  maxHeight: "80%",
}

const $queryModalHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $queryModalTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
}

const $queryModalBody: ViewStyle = {
  padding: spacing.lg,
  gap: spacing.md,
}

const $queryModalDescription: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
  lineHeight: 20,
}

const $queryModalInput: TextStyle = {
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  fontSize: 14,
  color: colors.text,
  backgroundColor: colors.palette.neutral100,
}

const $queryModalCounter: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral400,
  textAlign: "right",
}

const $queryModalButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  paddingVertical: spacing.md,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  marginTop: spacing.md,
}

const $queryModalButtonDisabled: ViewStyle = {
  backgroundColor: colors.palette.neutral400,
  opacity: 0.6,
}

const $queryModalButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.palette.neutral100,
}
