import React, { useState, useEffect } from "react"
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native"
import { X } from "lucide-react-native"
import { Text } from "./Text"
import { Button } from "./Button"
import { colors, spacing } from "../theme"
import { api } from "../services/api"

interface PreferencesModalProps {
  visible: boolean
  onClose: () => void
  onLogout?: () => void
}

interface UserPreferences {
  spicy_level: number
  sweet_level: number
  salty_level: number
  exploration_preference: number
  allergies: string[]
  disliked_ingredients: string[]
  favorite_cuisines: string[]
}

const ALLERGIES = [
  { id: "eggs", label: "달걀" },
  { id: "soy", label: "대두" },
  { id: "sesame", label: "참깨" },
  { id: "fish", label: "생선" },
  { id: "shellfish", label: "조개류" },
  { id: "wheat", label: "밀" },
  { id: "milk", label: "우유" },
  { id: "peanuts", label: "땅콩" },
  { id: "tree nuts", label: "견과류" },
]

const INGREDIENTS = [
  { id: "onion", label: "양파" },
  { id: "garlic", label: "마늘" },
  { id: "ginger", label: "생강" },
  { id: "cilantro", label: "고수" },
  { id: "mushroom", label: "버섯" },
  { id: "tomato", label: "토마토" },
  { id: "cheese", label: "치즈" },
  { id: "meat", label: "고기" },
  { id: "seafood", label: "해산물" },
]

const CUISINES = [
  { id: "italian", label: "이탈리안" },
  { id: "mexican", label: "멕시칸" },
  { id: "chinese", label: "중식" },
  { id: "japanese", label: "일식" },
  { id: "indian", label: "인도" },
  { id: "american", label: "아메리칸" },
  { id: "thai", label: "태국" },
  { id: "mediterranean", label: "지중해" },
  { id: "french", label: "프렌치" },
  { id: "vietnamese", label: "베트남" },
  { id: "spanish", label: "스페인" },
  { id: "korean", label: "한식" },
]

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  visible,
  onClose,
  onLogout,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    spicy_level: 5,
    sweet_level: 5,
    salty_level: 5,
    exploration_preference: 5,
    allergies: [],
    disliked_ingredients: [],
    favorite_cuisines: []
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      loadPreferences()
    }
  }, [visible])

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const response = await api.getPreferences()
      if (response.ok && response.data) {
        setPreferences(response.data as UserPreferences)
      }
    } catch (error) {
      console.error("Failed to load preferences:", error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const response = await api.updatePreferences(preferences)
      if (response.ok) {
        onClose()
      } else {
        console.error("Failed to save preferences:", response.problem)
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
    } finally {
      setSaving(false)
    }
  }

  const toggleArrayItem = (key: 'allergies' | 'disliked_ingredients' | 'favorite_cuisines', item: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter(i => i !== item)
        : [...prev[key], item]
    }))
  }

  const updatePreference = (key: keyof UserPreferences, value: number) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }


  const renderAllergies = () => (
    <View style={$section}>
      <Text style={$sectionTitle}>알러지</Text>
      <View style={$tagContainer}>
        {ALLERGIES.map((allergy) => (
          <TouchableOpacity
            key={allergy.id}
            style={[
              $tag,
              preferences.allergies.includes(allergy.id) ? $tagSelected : $tagUnselected
            ]}
            onPress={() => toggleArrayItem('allergies', allergy.id)}
          >
            <Text style={[
              $tagText,
              preferences.allergies.includes(allergy.id) ? $tagTextSelected : $tagTextUnselected
            ]}>
              {allergy.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderDislikedIngredients = () => (
    <View style={$section}>
      <Text style={$sectionTitle}>싫어하는 재료</Text>
      <View style={$tagContainer}>
        {INGREDIENTS.map((ingredient) => (
          <TouchableOpacity
            key={ingredient.id}
            style={[
              $tag,
              preferences.disliked_ingredients.includes(ingredient.id) ? $tagSelected : $tagUnselected
            ]}
            onPress={() => toggleArrayItem('disliked_ingredients', ingredient.id)}
          >
            <Text style={[
              $tagText,
              preferences.disliked_ingredients.includes(ingredient.id) ? $tagTextSelected : $tagTextUnselected
            ]}>
              {ingredient.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderFavoriteCuisines = () => (
    <View style={$section}>
      <Text style={$sectionTitle}>좋아하는 요리</Text>
      <View style={$tagContainer}>
        {CUISINES.map((cuisine) => (
          <TouchableOpacity
            key={cuisine.id}
            style={[
              $tag,
              preferences.favorite_cuisines.includes(cuisine.id) ? $tagSelected : $tagUnselected
            ]}
            onPress={() => toggleArrayItem('favorite_cuisines', cuisine.id)}
          >
            <Text style={[
              $tagText,
              preferences.favorite_cuisines.includes(cuisine.id) ? $tagTextSelected : $tagTextUnselected
            ]}>
              {cuisine.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderExplorationPreference = () => {
    // 서버에서 받은 값: 10 = adventurous (좋아해요), 0 = not adventurous (먹던 거만 먹어요)
    // UI 표시용 값: 0 = 좋아해요, 1 = 먹던 거만 먹어요
    const displayValue = preferences.exploration_preference >= 5 ? 0 : 1
    const explorationOptions = [
      { label: "좋아해요", value: 0 },
      { label: "먹던 거만 먹어요", value: 1 },
    ]

    return (
      <View style={$section}>
        <Text style={$sectionTitle}>새로운 음식을 좋아하시나요?</Text>
        <View style={$tagContainer}>
          {explorationOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                $tag,
                displayValue === option.value ? $tagSelected : $tagUnselected
              ]}
              onPress={() => {
                // UI 값(0 또는 1)을 서버 값(10 또는 0)으로 변환
                // 0(좋아해요) -> 10, 1(먹던 거만 먹어요) -> 0
                const serverValue = option.value === 0 ? 10 : 0
                updatePreference('exploration_preference', serverValue)
              }}
            >
              <Text style={[
                $tagText,
                displayValue === option.value ? $tagTextSelected : $tagTextUnselected
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={$backdrop}>
        <View style={$modalContainer}>
          <View style={$modalContent}>
            {/* Header */}
            <View style={$header}>
              <Text style={$headerTitle}>취향 설정</Text>
              <TouchableOpacity onPress={onClose} style={$closeButton}>
                <X size={24} color={colors.palette.neutral700} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={$loadingContainer}>
                <ActivityIndicator size="large" color={colors.palette.primary500} />
                <Text style={$loadingText}>설정 불러오는 중...</Text>
              </View>
            ) : (
              <ScrollView style={$scrollContent} showsVerticalScrollIndicator={false}>
                {renderExplorationPreference()}
                {renderFavoriteCuisines()}
                {renderAllergies()}
                {renderDislikedIngredients()}
                <TouchableOpacity
                  onPress={() => {
                    onClose?.()
                    onLogout?.()
                  }}
                  style={$logoutButton}
                >
                  <Text style={$logoutButtonText}>로그아웃</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* Footer */}
            <View style={$footer}>
              <Button
                text="저장"
                onPress={savePreferences}
                disabled={saving}
                style={$saveButton}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const $backdrop: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.lg,
}

const $modalContainer: ViewStyle = {
  width: "100%",
  maxHeight: "90%",
}

const $modalContent: ViewStyle = {
  backgroundColor: colors.background,
  borderRadius: 12,
  overflow: "hidden",
}

const $header: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $headerTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
}

const $closeButton: ViewStyle = {
}

const $loadingContainer: ViewStyle = {
  padding: spacing.xl,
  alignItems: "center",
}

const $loadingText: TextStyle = {
  marginTop: spacing.md,
  color: colors.palette.neutral600,
}

const $scrollContent: ViewStyle = {
  maxHeight: 400,
}

const $section: ViewStyle = {
  padding: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral100,
}

const $sectionTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.md,
}

const $tagContainer: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
}

const $tag: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 16,
  borderWidth: 1,
}

const $tagSelected: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderColor: colors.palette.primary500,
}

const $tagUnselected: ViewStyle = {
  backgroundColor: colors.background,
  borderColor: colors.palette.neutral300,
}

const $tagText: TextStyle = {
  fontSize: 14,
  fontWeight: "500",
}

const $tagTextSelected: TextStyle = {
  color: colors.background,
}

const $tagTextUnselected: TextStyle = {
  color: colors.palette.neutral700,
}

const $footer: ViewStyle = {
  padding: spacing.lg,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
}

const $saveButton: ViewStyle = {
  // Button styles are handled by the Button component
  marginBottom: spacing.md,
}

const $logoutButton: ViewStyle = {
  paddingVertical: spacing.md,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  backgroundColor: colors.background,
}

const $logoutButtonText: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.error,
}
