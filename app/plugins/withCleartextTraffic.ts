import {
  ConfigPlugin,
  withAndroidManifest,
} from "expo/config-plugins"

/**
 * Expo Config Plugin to enable cleartext (HTTP) traffic for Android
 * This is needed for production builds to allow HTTP requests to the API server
 */
export const withCleartextTraffic: ConfigPlugin = (config) => {
  config = withAndroidCleartextTraffic(config)
  return config
}

/**
 * Android implementation: modifies AndroidManifest.xml to add usesCleartextTraffic="true"
 * to the <application> tag
 */
const withAndroidCleartextTraffic: ConfigPlugin = (config) =>
  withAndroidManifest(config, (modConfig) => {
    const androidManifest = modConfig.modResults
    const { manifest } = androidManifest

    if (!manifest.application) {
      return modConfig
    }

    const application = manifest.application[0]
    
    // Ensure the $ object exists and preserve existing attributes
    if (!application.$) {
      // If $ doesn't exist, we need to copy existing attributes first
      // But since we're just adding one attribute, we can safely create it
      application.$ = {} as any
    }

    // Set usesCleartextTraffic to true to allow HTTP requests
    // This will be added to the existing attributes without overwriting them
    application.$["android:usesCleartextTraffic"] = "true"

    return modConfig
  })

