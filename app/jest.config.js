/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/setup.ts"],
  moduleNameMapper: {
    "^app/(.*)$": "<rootDir>/app/$1"
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@aws-amplify/.*|aws-amplify|@infinitered/.*|lucide-react-native)"
  ],
  collectCoverageFrom: [
    // Components (33개 - 테스트 파일이 있는 것만)
    "app/components/AccountDeletionErrorModal.tsx",
    "app/components/AccountDeletionSuccessModal.tsx",
    "app/components/AccountDeletionWarningModal.tsx",
    "app/components/AutoImage.tsx",
    "app/components/Button.tsx",
    "app/components/Card.tsx",
    "app/components/EmptyState.tsx",
    "app/components/ExitConfirmationModal.tsx",
    "app/components/FoodCard.tsx",
    "app/components/GalleryImageCard.tsx",
    "app/components/Header.tsx",
    "app/components/Icon.tsx",
    "app/components/ListItem.tsx",
    "app/components/ListView.tsx",
    "app/components/LocationWarningModal.tsx",
    "app/components/LoginErrorModal.tsx",
    "app/components/LogoutConfirmationModal.tsx",
    "app/components/PasswordConfirmationModal.tsx",
    "app/components/PasswordDisplayModal.tsx",
    "app/components/PasswordRetrievalModal.tsx",
    "app/components/PreferencesCompleteModal.tsx",
    "app/components/PreferencesModal.tsx",
    "app/components/RestaurantDetailModal.tsx",
    "app/components/ScrapToast.tsx",
    "app/components/Screen.tsx",
    "app/components/SettingsModal.tsx",
    "app/components/SignUpErrorModal.tsx",
    "app/components/SignUpSuccessModal.tsx",
    "app/components/StorageWarningModal.tsx",
    "app/components/Text.tsx",
    "app/components/TextField.tsx",
    "app/components/Toggle.tsx",
    "app/components/VerificationCodeModal.tsx",
    // Screens (9개)
    "app/screens/FoodigramScreen.tsx",
    "app/screens/LoginScreen.tsx",
    "app/screens/OnboardingScreen.tsx",
    "app/screens/ProfileScreen.tsx",
    "app/screens/ScrapScreen.tsx",
    "app/screens/SignUpScreen.tsx",
    "app/screens/WelcomeScreen.tsx",
    "app/screens/ErrorScreen/ErrorBoundary.tsx",
    "app/screens/ErrorScreen/ErrorDetails.tsx",
    // Models (4개)
    "app/models/FoodHistoryStore.ts",
    "app/models/MenuScrapStore.ts",
    "app/models/RootStore.ts",
    "app/models/index.ts",
    // Models helpers (4개)
    "app/models/helpers/getRootStore.ts",
    "app/models/helpers/setupRootStore.ts",
    "app/models/helpers/useStores.ts",
    "app/models/helpers/withSetPropAction.ts",
    // Navigators (1개)
    "app/navigators/AppNavigator.tsx",
    // Services (5개)
    "app/services/albums/useAlbumScanner.tsx",
    "app/services/albums/useImageClassifier.tsx",
    "app/services/api/api.ts",
    "app/services/api/apiProblem.ts",
    "app/services/registration/UserAuthFacade.ts",
    // Utils (1개)
    "app/utils/storage/storage.ts",
  ],
}
