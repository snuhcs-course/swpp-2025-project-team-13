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
}

interface UserPreferences {
  spicy_level: number
  sweet_level: number
  salty_level: number
  allergies: string[]
  disliked_ingredients: string[]
  favorite_cuisines: string[]
}

const ALLERGIES = [
  "eggs", "soy", "sesame", "fish", "shellfish", "wheat", "milk", "peanuts", "tree nuts"
]

const INGREDIENTS = [
  "onion", "garlic", "ginger", "cilantro", "mushroom", "tomato", "cheese", "meat", "seafood"
]

const CUISINES = [
  "korean", "japanese", "chinese", "western", "thai", "italian", "mexican", "indian"
]

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  visible,
  onClose,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    spicy_level: 5,
    sweet_level: 5,
    salty_level: 5,
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

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const toggleArrayItem = (key: 'allergies' | 'disliked_ingredients' | 'favorite_cuisines', item: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter(i => i !== item)
        : [...prev[key], item]
    }))
  }

  const renderTastePreferences = () => (
    <View style={$section}>
      <Text style={$sectionTitle}>Taste Preferences</Text>
      
      <View style={$sliderContainer}>
        <Text style={$sliderLabel}>Spicy Level: {preferences.spicy_level}</Text>
        <View style={$sliderTrack}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                $sliderDot,
                value <= preferences.spicy_level ? $sliderDotActive : $sliderDotInactive
              ]}
              onPress={() => updatePreference('spicy_level', value)}
            />
          ))}
        </View>
      </View>

      <View style={$sliderContainer}>
        <Text style={$sliderLabel}>Sweet Level: {preferences.sweet_level}</Text>
        <View style={$sliderTrack}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                $sliderDot,
                value <= preferences.sweet_level ? $sliderDotActive : $sliderDotInactive
              ]}
              onPress={() => updatePreference('sweet_level', value)}
            />
          ))}
        </View>
      </View>

      <View style={$sliderContainer}>
        <Text style={$sliderLabel}>Salty Level: {preferences.salty_level}</Text>
        <View style={$sliderTrack}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                $sliderDot,
                value <= preferences.salty_level ? $sliderDotActive : $sliderDotInactive
              ]}
              onPress={() => updatePreference('salty_level', value)}
            />
          ))}
        </View>
      </View>
    </View>
  )

  const renderAllergies = () => (
    <View style={$section}>
      <Text style={$sectionTitle}>Allergies</Text>
      <View style={$tagContainer}>
        {ALLERGIES.map((allergy) => (
          <TouchableOpacity
            key={allergy}
            style={[
              $tag,
              preferences.allergies.includes(allergy) ? $tagSelected : $tagUnselected
            ]}
            onPress={() => toggleArrayItem('allergies', allergy)}
          >
            <Text style={[
              $tagText,
              preferences.allergies.includes(allergy) ? $tagTextSelected : $tagTextUnselected
            ]}>
              {allergy}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderDislikedIngredients = () => (
    <View style={$section}>
      <Text style={$sectionTitle}>Disliked Ingredients</Text>
      <View style={$tagContainer}>
        {INGREDIENTS.map((ingredient) => (
          <TouchableOpacity
            key={ingredient}
            style={[
              $tag,
              preferences.disliked_ingredients.includes(ingredient) ? $tagSelected : $tagUnselected
            ]}
            onPress={() => toggleArrayItem('disliked_ingredients', ingredient)}
          >
            <Text style={[
              $tagText,
              preferences.disliked_ingredients.includes(ingredient) ? $tagTextSelected : $tagTextUnselected
            ]}>
              {ingredient}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderFavoriteCuisines = () => (
    <View style={$section}>
      <Text style={$sectionTitle}>Favorite Cuisines</Text>
      <View style={$tagContainer}>
        {CUISINES.map((cuisine) => (
          <TouchableOpacity
            key={cuisine}
            style={[
              $tag,
              preferences.favorite_cuisines.includes(cuisine) ? $tagSelected : $tagUnselected
            ]}
            onPress={() => toggleArrayItem('favorite_cuisines', cuisine)}
          >
            <Text style={[
              $tagText,
              preferences.favorite_cuisines.includes(cuisine) ? $tagTextSelected : $tagTextUnselected
            ]}>
              {cuisine}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

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
              <Text style={$headerTitle}>Preferences</Text>
              <TouchableOpacity onPress={onClose} style={$closeButton}>
                <X size={24} color={colors.palette.neutral700} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={$loadingContainer}>
                <ActivityIndicator size="large" color={colors.palette.primary500} />
                <Text style={$loadingText}>Loading preferences...</Text>
              </View>
            ) : (
              <ScrollView style={$scrollContent} showsVerticalScrollIndicator={false}>
                {renderTastePreferences()}
                {renderAllergies()}
                {renderDislikedIngredients()}
                {renderFavoriteCuisines()}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={$footer}>
              <Button
                text="Save"
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
  padding: spacing.xs,
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

const $sliderContainer: ViewStyle = {
  marginBottom: spacing.lg,
}

const $sliderLabel: TextStyle = {
  fontSize: 16,
  fontWeight: "500",
  color: colors.text,
  marginBottom: spacing.sm,
}

const $sliderTrack: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $sliderDot: ViewStyle = {
  width: 16,
  height: 16,
  borderRadius: 8,
  borderWidth: 2,
}

const $sliderDotActive: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderColor: colors.palette.primary500,
}

const $sliderDotInactive: ViewStyle = {
  backgroundColor: colors.background,
  borderColor: colors.palette.neutral300,
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
}
