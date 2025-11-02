// we always make sure 'react-native' gets included first
import * as ReactNative from "react-native"
import mockFile from "./mockFile"

// libraries to mock
jest.doMock("react-native", () => {
  // Extend ReactNative
  return Object.setPrototypeOf(
    {
      Alert: {
        alert: jest.fn(),
      },
      Image: {
        ...ReactNative.Image,
        resolveAssetSource: jest.fn((_source) => mockFile), // eslint-disable-line @typescript-eslint/no-unused-vars
        getSize: jest.fn(
          (
            uri: string, // eslint-disable-line @typescript-eslint/no-unused-vars
            success: (width: number, height: number) => void,
            failure?: (_error: any) => void, // eslint-disable-line @typescript-eslint/no-unused-vars
          ) => success(100, 100),
        ),
      },
    },
    ReactNative,
  )
})

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)

// Mock native cookies module to avoid requiring iOS/Android native files in Jest
jest.mock("@react-native-cookies/cookies", () => ({
  setFromResponse: jest.fn(),
  get: jest.fn().mockResolvedValue({}),
}))

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", textDirection: "ltr" }],
}))

jest.mock("expo-media-library", () => ({
  usePermissions: jest.fn(),
  getAlbumsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
}))

jest.mock("@infinitered/react-native-mlkit-image-labeling", () => ({
  useImageLabeling: jest.fn(),
}))

jest.mock("uuid", () => ({
  v4: () => 'mock-uuid'
}))

jest.mock("aws-amplify/auth", () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock("aws-amplify/storage", () => ({
  uploadData: jest.fn(),
}))

jest.mock("lucide-react-native", () => ({
  X: "X",
  Heart: "Heart",
  Bookmark: "Bookmark",
  Home: "Home",
  User: "User",
  Users: "Users",
  Filter: "Filter",
  RefreshCw: "RefreshCw",
  Settings: "Settings",
  MapPin: "MapPin",
  Star: "Star",
  Clock: "Clock",
  DollarSign: "DollarSign",
  ChevronRight: "ChevronRight",
  ChevronLeft: "ChevronLeft",
  Search: "Search",
  Camera: "Camera",
  Image: "Image",
  LogOut: "LogOut",
  Check: "Check",
  Plus: "Plus",
  Minus: "Minus",
}))

jest.mock("../app/i18n/i18n.ts", () => ({
  i18n: {
    locale: "en",
    t: (key: string, params: Record<string, string>) => {
      return `${key} ${JSON.stringify(params)}`
    },
    numberToCurrency: jest.fn(),
  },
}))

declare const tron // eslint-disable-line @typescript-eslint/no-unused-vars

declare global {
  let __TEST__: boolean
}
