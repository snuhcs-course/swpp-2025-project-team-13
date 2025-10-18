import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, TouchableOpacity, ScrollView, Alert } from "react-native"
import { Text } from "app/components"
import { Button } from "app/components/Button"
import { AppStackScreenProps } from "app/navigators"
import { colors, spacing } from "app/theme"
import { api } from "app/services/api"

interface OnboardingScreenProps extends AppStackScreenProps<"Onboarding"> {}

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

export const OnboardingScreen = observer(function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [preferences, setPreferences] = useState<UserPreferences>({
    spicy_level: 5,
    sweet_level: 5,
    salty_level: 5,
    allergies: [],
    disliked_ingredients: [],
    favorite_cuisines: []
  })
  const [isLoading, setIsLoading] = useState(false)

  const totalSteps = 4

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    navigation.replace("Foodigram")
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      const response = await api.savePreferences(preferences)
      if (response.ok) {
        Alert.alert("Success", "Your preferences have been saved!", [
          { text: "OK", onPress: () => navigation.replace("Foodigram") }
        ])
      } else {
        Alert.alert("Error", "Failed to save preferences. Please try again.")
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while saving preferences.")
      console.error("Onboarding error:", error)
    } finally {
      setIsLoading(false)
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

  const renderProgressBar = () => (
    <View style={$progressContainer}>
      <View style={$progressBar}>
        <View style={[$progressFill, { width: `${((currentStep + 1) / totalSteps) * 100}%` }]} />
      </View>
      <Text style={$progressText}>{currentStep + 1} of {totalSteps}</Text>
    </View>
  )

  const renderTastePreferences = () => (
    <View style={$stepContainer}>
      <Text style={$stepTitle}>What are your taste preferences?</Text>
      <Text style={$stepSubtitle}>Help us recommend food you'll love</Text>
      
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
    <View style={$stepContainer}>
      <Text style={$stepTitle}>Any allergies?</Text>
      <Text style={$stepSubtitle}>Select all that apply</Text>
      
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
    <View style={$stepContainer}>
      <Text style={$stepTitle}>Ingredients you dislike?</Text>
      <Text style={$stepSubtitle}>We'll avoid recommending these</Text>
      
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
    <View style={$stepContainer}>
      <Text style={$stepTitle}>Favorite cuisines?</Text>
      <Text style={$stepSubtitle}>What types of food do you enjoy?</Text>
      
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

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderTastePreferences()
      case 1: return renderAllergies()
      case 2: return renderDislikedIngredients()
      case 3: return renderFavoriteCuisines()
      default: return renderTastePreferences()
    }
  }

  return (
    <View style={$container}>
      {renderProgressBar()}
      
      <ScrollView style={$content} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>

      <View style={$buttonContainer}>
        <TouchableOpacity onPress={handleSkip} style={$skipButton}>
          <Text style={$skipText}>Skip</Text>
        </TouchableOpacity>
        
        <View style={$navButtons}>
          {currentStep > 0 && (
            <Button
              text="Back"
              style={$backButton}
              onPress={handleBack}
            />
          )}
          
          <Button
            text={currentStep === totalSteps - 1 ? "Complete" : "Next"}
            style={$nextButton}
            onPress={handleNext}
            disabled={isLoading}
          />
        </View>
      </View>
    </View>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $progressContainer: ViewStyle = {
  padding: spacing.lg,
  paddingTop: spacing.xl,
}

const $progressBar: ViewStyle = {
  height: 4,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 2,
  marginBottom: spacing.sm,
}

const $progressFill: ViewStyle = {
  height: "100%",
  backgroundColor: colors.palette.primary500,
  borderRadius: 2,
}

const $progressText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
  textAlign: "center",
}

const $content: ViewStyle = {
  flex: 1,
  padding: spacing.lg,
}

const $stepContainer: ViewStyle = {
  flex: 1,
}

const $stepTitle: TextStyle = {
  fontSize: 24,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: spacing.sm,
  textAlign: "center",
}

const $stepSubtitle: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral600,
  marginBottom: spacing.xl,
  textAlign: "center",
}

const $sliderContainer: ViewStyle = {
  marginBottom: spacing.xl,
}

const $sliderLabel: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
}

const $sliderTrack: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}

const $sliderDot: ViewStyle = {
  width: 20,
  height: 20,
  borderRadius: 10,
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
  borderRadius: 20,
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

const $buttonContainer: ViewStyle = {
  padding: spacing.lg,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
}

const $skipButton: ViewStyle = {
  alignSelf: "center",
  marginBottom: spacing.md,
}

const $skipText: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral600,
}

const $navButtons: ViewStyle = {
  flexDirection: "row",
  gap: spacing.md,
}

const $backButton: ViewStyle = {
  flex: 1,
}

const $nextButton: ViewStyle = {
  flex: 2,
}
