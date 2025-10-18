import React, { useState, useEffect } from "react"
import {
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native"
import { X, Bookmark } from "lucide-react-native"
import { Text } from "./Text"
import { colors, spacing } from "../theme"
import { api } from "../services/api"
import { useStores } from "../models"

interface Menu {
  name: string
  price?: string
  image_url?: string
}

interface Restaurant {
  id: number
  name: string
  address: string
  phone?: string
  image_url?: string
  menus: Menu[]
}

interface RestaurantDetailModalProps {
  restaurantId: number | null
  visible: boolean
  onClose: () => void
}

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  restaurantId,
  visible,
  onClose,
}) => {
  const { foodHistoryStore } = useStores()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(false)
  const [isScrapped, setIsScrapped] = useState(false)

  useEffect(() => {
    if (visible && restaurantId) {
      loadRestaurantDetail()
      // 스크랩 상태 확인
      setIsScrapped(foodHistoryStore.isScrapped(restaurantId))
    }
  }, [visible, restaurantId])

  const loadRestaurantDetail = async () => {
    if (!restaurantId) return

    setLoading(true)
    try {
      const response = await api.getRestaurantDetail(restaurantId)
      if (response.ok && response.data) {
        setRestaurant(response.data as Restaurant)
      } else {
        console.error("Failed to load restaurant:", response.problem)
      }
    } catch (error) {
      console.error("Error loading restaurant:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleScrapToggle = async () => {
    if (!restaurantId || !restaurant) return

    try {
      const response = await api.toggleScrap(restaurantId)
      
      if (response.ok && response.data) {
        const serverScrapped = (response.data as any).scrapped
        
        // 로컬 상태 업데이트
        setIsScrapped(serverScrapped)
        
        // foodHistoryStore 업데이트
        const foodItem = {
          id: restaurant.id,
          name: restaurant.name,
          distance: restaurant.address || "주소 정보 없음",
          image: restaurant.image_url || "",
          keywords: [],
          category: "restaurant",
          allergens: [],
        }
        
        foodHistoryStore.toggleScrappedItem(foodItem)
        
        if (__DEV__) {
          console.log(`Modal: ${serverScrapped ? 'Scrapped' : 'Unscrapped'} restaurant ID ${restaurantId}`)
        }
      } else {
        console.error('Failed to toggle scrap:', response.problem)
      }
    } catch (error) {
      console.error('Error toggling scrap:', error)
    }
  }

  const formatPrice = (price: string): string => {
    // 숫자만 추출 (15900.00 -> 15900)
    const numericPrice = parseFloat(price)
    
    if (isNaN(numericPrice)) {
      return price // 숫자가 아니면 원본 반환
    }
    
    // 정수로 변환하고 3자리마다 콤마 추가
    const formattedPrice = Math.floor(numericPrice).toLocaleString('ko-KR')
    
    return `${formattedPrice}원`
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={$overlayRoot}>
        <Pressable style={$absoluteBackdrop} onPress={onClose} />
        <View style={$modalContent}>
          {/* Header with close button */}
          <View style={$header}>
            <Text style={$headerTitle}>음식점 정보</Text>
            <TouchableOpacity onPress={onClose} style={$closeButton}>
              <X size={24} color={colors.palette.neutral700} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={$loadingContainer}>
              <ActivityIndicator size="large" color={colors.palette.primary500} />
            </View>
          ) : restaurant ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              bounces={true}
              scrollEventThrottle={16}
              decelerationRate="normal"
            >
              {/* Restaurant Image */}
              {restaurant.image_url && (
                <Image
                  source={{ uri: restaurant.image_url }}
                  style={$restaurantImage}
                  resizeMode="cover"
                />
              )}

              {/* Restaurant Info */}
              <View style={$infoSection}>
                <View style={$nameRow}>
                  <Text style={$restaurantName}>{restaurant.name}</Text>
                  <TouchableOpacity onPress={handleScrapToggle} style={$scrapButton}>
                    <Bookmark
                      size={28}
                      color={isScrapped ? colors.palette.primary500 : colors.palette.neutral800}
                      fill={isScrapped ? colors.palette.primary500 : "none"}
                    />
                  </TouchableOpacity>
                </View>
                {restaurant.address && (
                  <View style={$infoRow}>
                    <Text style={$infoLabel}>주소:</Text>
                    <Text style={$infoText}>{restaurant.address}</Text>
                  </View>
                )}
                {restaurant.phone && (
                  <View style={$infoRow}>
                    <Text style={$infoLabel}>전화:</Text>
                    <Text style={$infoText}>{restaurant.phone}</Text>
                  </View>
                )}
              </View>

              {/* Menus */}
              {restaurant.menus && restaurant.menus.length > 0 && (
                <View style={$menuSection}>
                  <Text style={$sectionTitle}>메뉴</Text>
                  {restaurant.menus.map((menu, index) => (
                    <View key={index} style={$menuItem}>
                      {menu.image_url && (
                        <Image
                          source={{ uri: menu.image_url }}
                          style={$menuImage}
                          resizeMode="cover"
                        />
                      )}
                      <View style={$menuInfo}>
                        <Text style={$menuName}>{menu.name}</Text>
                        {menu.price && (
                          <Text style={$menuPrice}>{formatPrice(menu.price)}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={$loadingContainer}>
              <Text style={$errorText}>음식점 정보를 불러올 수 없습니다</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const $overlayRoot: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $absoluteBackdrop: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
}

const $modalContent: ViewStyle = {
  backgroundColor: colors.background,
  borderRadius: 16,
  width: "100%",
  maxHeight: "85%",
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
  overflow: "hidden",
}

const $header: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $headerTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
}

const $closeButton: ViewStyle = {
  padding: spacing.xs,
}

const $loadingContainer: ViewStyle = {
  padding: spacing.xl,
  alignItems: "center",
  justifyContent: "center",
  minHeight: 200,
}

const $restaurantImage: ImageStyle = {
  width: "100%",
  height: 200,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
}

const $infoSection: ViewStyle = {
  padding: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $nameRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: spacing.sm,
}

const $restaurantName: TextStyle = {
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
  flex: 1,
}

const $scrapButton: ViewStyle = {
  padding: spacing.xs,
  marginLeft: spacing.sm,
}

const $infoRow: ViewStyle = {
  flexDirection: "row",
  marginBottom: spacing.xs,
}

const $infoLabel: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.palette.neutral600,
  marginRight: spacing.xs,
  minWidth: 50,
}

const $infoText: TextStyle = {
  fontSize: 14,
  color: colors.text,
  flex: 1,
}

const $menuSection: ViewStyle = {
  padding: spacing.md,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: spacing.sm,
}

const $menuItem: ViewStyle = {
  flexDirection: "row",
  padding: spacing.sm,
  marginBottom: spacing.sm,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
}

const $menuImage: ImageStyle = {
  width: 60,
  height: 60,
  borderRadius: 8,
  marginRight: spacing.sm,
}

const $menuInfo: ViewStyle = {
  flex: 1,
  justifyContent: "center",
}

const $menuName: TextStyle = {
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.xxs,
}

const $menuPrice: TextStyle = {
  fontSize: 13,
  color: colors.palette.primary500,
  fontWeight: "500",
}

const $errorText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral500,
}

