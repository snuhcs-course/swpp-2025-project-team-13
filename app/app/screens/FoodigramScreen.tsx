import { LinearGradient } from "expo-linear-gradient"
import { Bookmark, Home, User, Search, X } from "lucide-react-native"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState, useRef, useCallback } from "react"
import * as Location from "expo-location"
import * as storage from "app/utils/storage"
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
  Pressable,
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
  // Removed: allFetchedMenus, displayedMenuCount - now using simple phase-based approach
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState<{ [key: string]: boolean }>({})
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [currentMaxResults, setCurrentMaxResults] = useState(10)
  const [showScrapToast, setShowScrapToast] = useState(false)
  const flatListRef = useRef<FlatList>(null)
  // Removed: incrementalDisplayTimerRef - using simple phase-based approach

  // Query context related states
  const [showQueryModal, setShowQueryModal] = useState(false)

  // Location states
  const [userLocation, setUserLocation] = useState<[number, number]>([126.952741, 37.481227]) // Default Seoul National University Station
  const [queryContext, setQueryContext] = useState("")
  const [isProcessingQuery, setIsProcessingQuery] = useState(false)

  // Recommendation reason states
  const [menuReasons, setMenuReasons] = useState<{ [menuId: string]: string }>({})
  const [reasonLoadingDots, setReasonLoadingDots] = useState<{ [menuId: string]: string }>({})

  // Progress message state
  const [progressMessage, setProgressMessage] = useState<string>("당신의 취향을 분석 중입니다")

  // Request deduplication: track pending requests to prevent duplicate API calls
  const pendingRequestRef = useRef<{
    query: string
    promise: Promise<any>
  } | null>(null)

  // Track current query text for Phase 2
  const currentQueryTextRef = useRef<string | undefined>(undefined)
  
  // Flag to prevent multiple Phase 2 triggers
  const phase2TriggeredRef = useRef(false)

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
          await fetchRecommendationsPhase1(appendVal, queryText)

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

  // Check location permission when component mounts and when navigation focuses
  useEffect(() => {
    checkAndGetUserLocation()
  }, [])

  // Also check location when returning from other screens (like settings)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkAndGetUserLocation()
    })

    return unsubscribe
  }, [navigation])

  // Check location permission and get user location
  const checkAndGetUserLocation = async () => {
    try {
      // Check stored permission states from onboarding
      const storedLocationGranted = await storage.loadString("LOCATION_PERMISSION_GRANTED")
      const useDummyLocation = await storage.loadString("USE_DUMMY_LOCATION")
      
      // Only use actual location if permission was granted in onboarding AND not using dummy location
      const shouldUseActualLocation = storedLocationGranted === 'true' && useDummyLocation !== 'true'
      
      if (shouldUseActualLocation) {
        // Check current system permission status
        const { status } = await Location.getForegroundPermissionsAsync()
        
        if (status === 'granted') {
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            })
            
            const newLocation: [number, number] = [
              location.coords.longitude,
              location.coords.latitude
            ]
            
            setUserLocation(newLocation)
            
            if (__DEV__) {
              console.log('📍 Using actual user location:', newLocation)
            }
          } catch (error) {
            if (__DEV__) {
              console.log('⚠️ Failed to get current location, using default:', error)
            }
          }
        }
      } else {
        if (__DEV__) {
          console.log('📍 Using default location (permission not granted or dummy location chosen)')
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.log('⚠️ Error checking location permission:', error)
      }
    }
  }

  // Phase 1: Fetch menu recommendations without reasons
  const fetchRecommendationsPhase1 = useCallback(async (append = false, queryText?: string) => {
    const maxResults = append ? currentMaxResults + 10 : 10
    const options: any = { maxResults }
    if (queryText) {
      options.queryText = queryText
    }

    // Store query text for Phase 2
    currentQueryTextRef.current = queryText
    
    // Reset Phase 2 trigger flag for new recommendations
    if (!append) {
      phase2TriggeredRef.current = false
    }

    try {
      if (__DEV__) {
        console.log('🚀 Starting Phase 1: Fetching menu recommendations without reasons')
      }

      // Show progress message
      setProgressMessage("당신의 취향을 분석하고 메뉴를 찾는 중입니다")
      
      const response = await api.getMenuRecommendationsPhase1(userLocation, options)
      
      if (!response.ok) {
        console.error("Failed to fetch phase 1 recommendations:", response.problem)
        setHasMoreData(false)
        return
      }

      const data: any = response.data
      const newMenus = data.results || []

      if (__DEV__) {
        console.log(`✅ Phase 1 완료: ${newMenus.length}개 메뉴 받음`)
      }

      // Hide loading screen and show food images immediately
      setIsLoadingRecommendations(false)

      if (append) {
        // For append mode, add new menus to existing list
        const existingIds = new Set(recommendedMenus.map(m => m.id))
        const uniqueNewMenus = newMenus.filter(menu => !existingIds.has(menu.id))
        
        if (uniqueNewMenus.length === 0) {
          setHasMoreData(false)
        } else {
          setRecommendedMenus(prev => [...prev, ...uniqueNewMenus])
          setCurrentMaxResults(maxResults)
        }
      } else {
        // For initial load, set new menus and clear loading state
        setRecommendedMenus(newMenus)
        setMenuReasons({}) // Clear previous reasons
        setCurrentMaxResults(10)
        setHasMoreData(newMenus.length >= 10)

        // Clear loading dots initially - will use static text until Phase 2 completes
        setReasonLoadingDots({})
        
        // Reset Phase 2 trigger flag and image loaded state for new menus
        phase2TriggeredRef.current = false
        setFirstImageLoaded(false)
      }

    } catch (error) {
      console.error("Failed to fetch Phase 1 recommendations:", error)
      setHasMoreData(false)
      setIsLoadingRecommendations(false)
    }
  }, [userLocation, currentMaxResults, recommendedMenus])

  // Phase 2: Generate single reason for one menu
  const generateSingleReason = useCallback(async (menuId: string, queryText?: string) => {
    try {
      if (__DEV__) {
        console.log('🔄 Generating reason for menu:', menuId)
      }

      const options: any = {}
      if (queryText) {
        options.queryText = queryText
      }

      const response = await api.getMenuRecommendationsPhase2(userLocation, [menuId], options)
      
      if (__DEV__) {
        console.log('📡 Single reason response:', response.status, response.ok ? 'OK' : 'ERROR')
      }
      
      if (!response.ok) {
        console.error("Failed to fetch single reason:", response.problem)
        // Clear loading dots for this menu on error
        setReasonLoadingDots(prev => {
          const newDots = { ...prev }
          delete newDots[menuId]
          return newDots
        })
        return
      }

      const data: any = response.data
      const reasonUpdates = data.reason_updates || []

      if (reasonUpdates.length > 0) {
        const update = reasonUpdates[0]
        const { menu_id, reason } = update
        
        // Update reason for this menu
        setMenuReasons(prev => ({
          ...prev,
          [menu_id]: reason
        }))

        // Clear loading dots for this menu
        setReasonLoadingDots(prev => {
          const newDots = { ...prev }
          delete newDots[menu_id]
          return newDots
        })

        if (__DEV__) {
          console.log('✅ Generated reason for menu', menu_id)
        }
      }

    } catch (error) {
      console.error("Failed to generate single reason:", error)
      // Clear loading dots on error
      setReasonLoadingDots(prev => {
        const newDots = { ...prev }
        delete newDots[menuId]
        return newDots
      })
    }
  }, [userLocation])

  // Phase 2: Generate reasons sequentially for all menus
  const fetchRecommendationsPhase2 = useCallback(async (menuIds: string[], queryText?: string) => {
    try {
      if (__DEV__) {
        console.log('🚀 Starting sequential Phase 2 for', menuIds.length, 'menus')
      }

      // Set loading dots for all menus first
      const initialLoadingDots: { [key: string]: string } = {}
      menuIds.forEach(menuId => {
        initialLoadingDots[menuId] = "."
      })
      setReasonLoadingDots(initialLoadingDots)

      // Generate reasons sequentially (one by one)
      for (let i = 0; i < menuIds.length; i++) {
        const menuId = menuIds[i]
        
        if (__DEV__) {
          console.log(`🔄 Sequential Phase 2: ${i + 1}/${menuIds.length} - ${menuId}`)
        }

        // Generate reason for this menu
        await generateSingleReason(menuId, queryText)
        
        // Small delay between requests to avoid overwhelming the server
        if (i < menuIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      if (__DEV__) {
        console.log('✅ Sequential Phase 2 completed for all menus')
      }

    } catch (error) {
      console.error("Failed to fetch Phase 2 reasons:", error)
      // Clear loading dots on error
      setReasonLoadingDots({})
    }
  }, [userLocation, generateSingleReason])

  // Track which images have loaded to trigger Phase 2 only once
  const [firstImageLoaded, setFirstImageLoaded] = useState(false)
  
  // Track currently visible menu index for dot animation
  const [currentVisibleMenuIndex, setCurrentVisibleMenuIndex] = useState(0)
  
  // Handle viewport changes to track visible menu
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      // Get the index of the first (most visible) item
      const newVisibleIndex = viewableItems[0].index || 0
      setCurrentVisibleMenuIndex(newVisibleIndex)
    }
  }, [])
  
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50, // Menu is considered visible if 50% is showing
  }
  
  // Trigger Phase 2 when first food image loads (only once)
  const triggerPhase2OnImageLoad = useCallback(() => {
    if (!phase2TriggeredRef.current && !firstImageLoaded && recommendedMenus.length > 0) {
      phase2TriggeredRef.current = true
      setFirstImageLoaded(true)
      
      if (__DEV__) {
        console.log('🖼️ First food image loaded - triggering Phase 2 for', recommendedMenus.length, 'menus')
      }
      
      const menuIds = recommendedMenus.map(menu => String(menu.id))
      fetchRecommendationsPhase2(menuIds, currentQueryTextRef.current)
    }
  }, [recommendedMenus, fetchRecommendationsPhase2, firstImageLoaded])

  // Load more recommendations
  const loadMoreRecommendations = useCallback(async () => {
    if (isLoadingMore || !hasMoreData) return
    
    setIsLoadingMore(true)
    await fetchRecommendationsPhase1(true)
    setIsLoadingMore(false)
  }, [isLoadingMore, hasMoreData, fetchRecommendationsPhase1])

  // Fetch recommendations only once on app initialization
  // Using ref to prevent multiple initializations from component re-mounts
  const hasInitializedRef = useRef(false)
  const lastRefreshTimeRef = useRef(0)

  useEffect(() => {
    if (hasInitializedRef.current) return

    hasInitializedRef.current = true
    setIsLoadingRecommendations(true)
    setMenuReasons({}) // Clear previous reasons
    setReasonLoadingDots({}) // Clear previous loading dots
    setProgressMessage("당신의 취향을 분석 중입니다") // Reset progress message

    debouncedFetchRecommendations()
    // Note: isLoadingRecommendations is now controlled by phase1 completion

    // Cleanup: clear pending requests on unmount
    return () => {
      pendingRequestRef.current = null
    }
  }, [debouncedFetchRecommendations]) // Include debouncedFetchRecommendations in deps

  // Location tracking (but don't auto-refresh on location change)
  const previousLocationRef = useRef<string>("")
  useEffect(() => {
    const currentLocationStr = JSON.stringify(userLocation)
    previousLocationRef.current = currentLocationStr
  }, [userLocation])

  // Refresh recommendations only for specific triggers
  useEffect(() => {
    const params = route?.params as any

    // Only refresh for allowed triggers
    if (params?.refreshRecommendations) {
      const now = Date.now()
      if (now - lastRefreshTimeRef.current > 500) {
        const trigger = params.refreshReason || 'unknown'
        
        // Allowed triggers: menu images updated, food appetite onboarding updated
        const allowedTriggers = [
          'menu_images_updated',
          'food_appetite_updated', 
          'profile_images_updated',
          'user_preferences_updated',
          'food_label_changed',     // When user updates image labels
          'preferences_updated',    // When user updates food preferences
          'album_scan_completed'    // When new images are scanned from gallery
        ]
        
        if (allowedTriggers.includes(trigger)) {
          lastRefreshTimeRef.current = now
          if (__DEV__) {
            console.log(`🔄 Recommendation refresh triggered: ${trigger}`)
          }
          setHasMoreData(true)
          setIsLoadingRecommendations(true)
          // Don't clear existing menus/reasons immediately - keep them visible during update
          setProgressMessage("당신의 취향을 분석 중입니다") // Reset progress message
          debouncedFetchRecommendations().catch((error) => {
            console.error("Failed to refresh recommendations:", error)
            setIsLoadingRecommendations(false)  // Only set false on error
          })
          // Note: isLoadingRecommendations is now controlled by phase1 completion
        } else if (__DEV__) {
          console.log(`❌ Recommendation refresh blocked for trigger: ${trigger}`)
        }
      }
    }
  }, [route?.params, debouncedFetchRecommendations])

  // Handle pull-to-refresh (user-initiated bouncing - allowed)
  const onRefresh = () => {
    if (__DEV__) {
      console.log('🔄 Pull-to-refresh triggered (user bounce)')
    }
    setRefreshing(true)
    setHasMoreData(true)
    setIsLoadingRecommendations(true)
    // Don't clear existing menus/reasons immediately - keep them visible during refresh
    setProgressMessage("당신의 취향을 분석 중입니다") // Reset progress message
    // Use debounced version to prevent accidental double-refresh
    debouncedFetchRecommendations(false).finally(() => {
      setRefreshing(false)
      // Note: isLoadingRecommendations is now controlled by phase1 completion
    }).catch(() => {
      setIsLoadingRecommendations(false)  // Only set false on error
    })
  }

  // Handle bottom bounce detection for more recommendations
  const scrollY = useRef(new Animated.Value(0)).current
  const [isAtBottom, setIsAtBottom] = useState(false)
  
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
    const currentScrollY = contentOffset.y
    const maxScrollY = contentSize.height - layoutMeasurement.height
    
    // Check if user is at or very close to bottom
    const atBottom = currentScrollY >= maxScrollY - 50
    
    if (atBottom !== isAtBottom) {
      setIsAtBottom(atBottom)
    }
    
    // Animate scroll value for potential other uses
    scrollY.setValue(currentScrollY)
  }, [scrollY, isAtBottom])
  
  // Detect bottom bounce: when user is at bottom and scroll velocity goes negative (bounce up)
  const handleScrollEndDrag = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement, velocity } = event.nativeEvent
    const currentScrollY = contentOffset.y
    const maxScrollY = contentSize.height - layoutMeasurement.height
    
    // Check if user bounced at the bottom (at bottom + upward velocity)
    const atBottom = currentScrollY >= maxScrollY - 50
    const bounceDetected = atBottom && velocity && velocity.y < -0.5 // Negative velocity = upward bounce
    
    if (__DEV__) {
      console.log('Scroll end drag:', { atBottom, velocityY: velocity?.y, bounceDetected })
    }
    
    if (bounceDetected && hasMoreData && !isLoadingMore && !isLoadingRecommendations && recommendedMenus.length > 0) {
      if (__DEV__) {
        console.log('🔄 Bottom bounce detected - loading more recommendations')
      }
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
    if (isLoadingRecommendations) {
      // Start rotation animation when loading
      rotationValue.setValue(0)
      Animated.loop(
        Animated.timing(rotationValue, {
          toValue: 1,
          duration: 2000, // Match ProfileScreen duration
          useNativeDriver: true,
        })
      ).start()
    } else {
      // Stop animation when not loading
      rotationValue.stopAnimation()
    }
  }, [isLoadingRecommendations, rotationValue])

  // Animate loading dots for recommendation reasons (only for currently visible menu)
  useEffect(() => {
    if (isLoadingRecommendations || recommendedMenus.length === 0) {
      return // Don't start intervals if still loading or no menus
    }

    // Get the currently visible menu
    const visibleMenu = recommendedMenus[currentVisibleMenuIndex]
    if (!visibleMenu) {
      return
    }

    // Clear dots for all non-visible menus and reset to empty string
    setReasonLoadingDots(prev => {
      const newDots: { [key: string]: string } = {}
      
      recommendedMenus.forEach((menu, index) => {
        if (!menuReasons[menu.id] && !menu.reason) {
          // Only animate the currently visible menu, others get empty string
          if (index === currentVisibleMenuIndex) {
            newDots[menu.id] = prev[menu.id] || "" // Keep current animation state
          } else {
            newDots[menu.id] = "" // Reset to empty for non-visible menus
          }
        }
      })
      
      return newDots
    })

    // Only create animation interval for the currently visible menu if it needs a reason
    if (!menuReasons[visibleMenu.id] && !visibleMenu.reason) {
      const interval = setInterval(() => {
        setReasonLoadingDots(prev => {
          const currentDots = prev[visibleMenu.id] || ""
          let nextDots = ""
          
          // Cycle through: '' -> '.' -> '..' -> '...' -> '' -> ...
          if (currentDots === "") nextDots = "."
          else if (currentDots === ".") nextDots = ".."
          else if (currentDots === "..") nextDots = "..."
          else nextDots = ""
          
          return { ...prev, [visibleMenu.id]: nextDots }
        })
      }, 500)

      return () => {
        clearInterval(interval)
      }
    }

  }, [recommendedMenus.length, isLoadingRecommendations, currentVisibleMenuIndex, menuReasons]) // Add currentVisibleMenuIndex to deps

  // Removed old incremental display logic - now using simple phase-based approach

  const toggleBookmark = useCallback(async (menu: MenuRecommendationItem) => {
    const imageUrl = menu.image_urls && menu.image_urls.length > 0 ? menu.image_urls[0] : undefined
    
    // Check if we have a restaurant_id to call the backend API
    if (menu.restaurant_id || menu.place_name) {
      try {
        let restaurantId: string | null = null
        if (menu.restaurant_id) {
          restaurantId = menu.restaurant_id.toString()
        }
        
        // Call the API with both ID and name as fallback
        const response = await api.toggleScrapWithName(restaurantId, menu.place_name)
        
        if (response.ok) {
          // Update local store based on backend response
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
          
          console.log('✅ SCRAP DEBUG: Local store updated - was scrapped:', wasScrapped, 'now scrapped:', isNowScrapped)
          
          // Show toast only when item is newly scrapped (wasn't scrapped before, but is now)
          if (!wasScrapped && isNowScrapped) {
            setShowScrapToast(true)
          }
        } else {
          console.error('Failed to toggle scrap on backend:', response.problem)
        }
      } catch (error) {
        console.error('Error toggling scrap:', error)
      }
    } else {
      console.warn('No restaurant_id available for menu:', menu.place_name)
      // Fallback to local-only toggle if no restaurant_id
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
      
      if (!wasScrapped && isNowScrapped) {
        setShowScrapToast(true)
      }
    }
  }, [menuScrapStore])

  const handleSubmitQuery = useCallback(async () => {
    if (!queryContext.trim()) {
      return
    }

    setIsProcessingQuery(true)
    setShowQueryModal(false)

    // Don't clear previous results immediately - keep them visible during query search
    setIsLoadingRecommendations(true)
    setProgressMessage("당신의 취향을 분석 중입니다") // Reset progress message

    try {
      // Fetch recommendations with context query - use debounced version
      await debouncedFetchRecommendations(false, queryContext.trim())
    } catch (error) {
      console.error("Failed to fetch context-aware recommendations:", error)
    } finally {
      setIsProcessingQuery(false)
      // Note: isLoadingRecommendations is now controlled by phase1 completion
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
        onLoadEnd={() => {
          setIsImageLoading((prev) => ({ ...prev, [menu.id]: false }))
          // Trigger Phase 2 when first food image loads
          triggerPhase2OnImageLoad()
        }}
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
            {/* Show loading reason or actual reason */}
            {(menuReasons[menu.id] && menuReasons[menu.id].trim()) || (menu.reason && menu.reason.trim()) ? (
              <Text style={$menuReasonLarge} numberOfLines={3}>
                💡 {menuReasons[menu.id] || menu.reason}
              </Text>
            ) : (
              <Text style={$menuReasonLarge} numberOfLines={3}>
                💡 이유를 생성하는 중{reasonLoadingDots[menu.id] || ""}
              </Text>
            )}
          </View>
        </View>
      </ImageBackground>
    )
  }, [screenHeight, isImageLoading, toggleBookmark, menuScrapStore.scrappedMenus.length, menuReasons, reasonLoadingDots, triggerPhase2OnImageLoad])

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
          <Text style={$loadingSubtext}>{progressMessage}</Text>
        </View>
      )
    }
    
    return (
      <View style={[$emptyState, { height: screenHeight }]}>
        <Text style={$emptyText}>음식점을 불러오지 못했어요</Text>
        <Text style={$emptySubtext}>잠시 후 다시 시도해 주세요</Text>
      </View>
    )
  }, [isLoadingRecommendations, progressMessage, screenHeight])

  return (
    <View style={$container}>
      {/* Main Full Screen Content */}
      <FlatList
        ref={flatListRef}
        data={recommendedMenus}
        renderItem={renderMenuItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
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
        pagingEnabled={true}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        updateCellsBatchingPeriod={50}
        disableIntervalMomentum={true}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Scrap Toast */}
      <ScrapToast
        visible={showScrapToast}
        onDismiss={() => setShowScrapToast(false)}
        onNavigate={() => navigation.navigate("Scrap")}
      />

      {/* Removed blocking overlay - users can now interact during loading */}

      {/* Floating Search Button */}
      <TouchableOpacity
        style={$floatingSearchButton}
        onPress={() => setShowQueryModal(true)}
        disabled={isProcessingQuery}
      >
        <Search size={28} color="#FFFFFF" strokeWidth={2} />
      </TouchableOpacity>

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

const $loadingSubtext: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral500,
  marginTop: 8,
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

// Floating search button style
const $floatingSearchButton: ViewStyle = {
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
  shadowRadius: 5,
  elevation: 8,
  zIndex: 99,
}

// Query context styles

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
