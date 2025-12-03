import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { FoodHistoryStoreModel } from "./FoodHistoryStore"
import { MenuScrapStoreModel } from "./MenuScrapStore"

/**
 * A RootStore model.
 */
export const RootStoreModel = types.model("RootStore").props({
  foodHistoryStore: types.optional(FoodHistoryStoreModel, {}),
  menuScrapStore: types.optional(MenuScrapStoreModel, {}),
  _isLoading: types.optional(types.boolean, false),
}).actions((self) => ({
  async clearUserData() {
    // NEW FLOW: Upload user scraps to AWS storage, then clear all local data
    console.log("🧹 clearUserData() called - uploading scraps to AWS then clearing all local data")
    console.trace("🧹 STACK TRACE: Where clearUserData was called from:")
    
    try {
      const { api } = require("../services/api")
      const storage = require("../utils/storage")
      
      // Step 1: Upload current user's scraps to AWS storage before logout
      const currentScraps = self.menuScrapStore.scrappedMenus.slice() // Create copy
      if (currentScraps.length > 0) {
        console.log(`☁️ Uploading ${currentScraps.length} scrapped menus to AWS storage before logout`)
        
        // Convert scraps to format expected by backend
        const scrapsToUpload = currentScraps.map(scrap => ({
          id: scrap.id,
          menu_name: scrap.menu_name,
          place_name: scrap.place_name,
          price: scrap.price,
          category: scrap.category,
          location: scrap.location,
          rating: scrap.rating,
          review_count: scrap.review_count,
          image_url: scrap.image_url,
          coordinates: scrap.coordinates,
          scrapped_at: scrap.scrapped_at.toISOString(),
        }))
        
        try {
          const uploadResponse = await api.uploadUserScrapsToAWS(scrapsToUpload)
          if (uploadResponse.ok) {
            console.log(`✅ Successfully uploaded ${currentScraps.length} scraps to AWS storage`)
          } else {
            console.error("❌ Failed to upload scraps to AWS:", uploadResponse.problem)
          }
        } catch (uploadError) {
          console.error("❌ Error uploading scraps to AWS:", uploadError)
        }
      } else {
        console.log("ℹ️ No scraps to upload to AWS storage")
      }
      
      // Step 2: Clear all local user data (including scraps)
      console.log("🧹 Clearing all local user data including scraped menus")
      self.foodHistoryStore.clearAllScraps()
      self.menuScrapStore.clearAllScraps() // Clear scraped menus to prevent cross-user contamination
      
      // Step 3: Clear persisted state from AsyncStorage
      await storage.remove("root-v1") // This key must match ROOT_STATE_STORAGE_KEY in setupRootStore.ts
      await storage.save("user-logged-out", "true") // Flag to prevent restoring stale data
      
      console.log("✅ User data cleared successfully - scraps uploaded to AWS and local data wiped")
    } catch (error) {
      console.error("❌ Error in clearUserData:", error)
      // Still try to clear local data even if AWS upload fails
      self.foodHistoryStore.clearAllScraps()
      self.menuScrapStore.clearAllScraps()
    }
  },
  
  async loadUserDataFromBackend() {
    // NEW FLOW: Load user-specific scraps from AWS storage when user logs in
    console.log("🔄 loadUserDataFromBackend() called - downloading user scraps from AWS storage")
    
    // Prevent multiple concurrent calls
    if (self._isLoading) {
      console.log("⏸️ Already loading user data, skipping duplicate call")
      return
    }
    self._isLoading = true
    
    try {
      const { api } = require("../services/api")
      const storage = require("../utils/storage")
      
      // Step 1: Clear any existing local scraps (from previous user or stale data)
      console.log("🧹 Clearing any existing local scraps before loading user-specific data")
      self.foodHistoryStore.clearAllScraps()
      self.menuScrapStore.clearAllScraps()
      
      // Step 2: Download user-specific scraps from AWS storage
      console.log("☁️ Downloading user scraps from AWS storage")
      try {
        const scrapsResponse = await api.downloadUserScrapsFromAWS()
        console.log("🔍 DEBUG: downloadUserScrapsFromAWS API response:", scrapsResponse)
        
        if (scrapsResponse.ok && scrapsResponse.data) {
          const scraps = scrapsResponse.data
          console.log("🔍 DEBUG: User scraps data from AWS:", scraps)
          console.log(`📊 Processing ${scraps.length} user-specific scraps from AWS`)
          
          let addedCount = 0
          for (const scrap of scraps) {
            console.log("🔍 DEBUG: Adding scrap to stores:", scrap.menu_name, "ID:", scrap.id)
            
            // Add to FoodHistoryStore format (for legacy compatibility) 
            self.foodHistoryStore.addScrappedItem({
              id: scrap.id,
              name: scrap.menu_name,
              distance: "0km", // Default distance
              image: scrap.image_url && scrap.image_url.trim() ? scrap.image_url : "",
              keywords: [], // Default keywords
              category: scrap.category || "restaurant",
              allergens: [], // Default allergens
            })
            
            // Add to MenuScrapStore format (primary store for scraps)
            self.menuScrapStore.addScrappedMenu({
              id: scrap.id,
              menu_name: scrap.menu_name,
              place_name: scrap.place_name,
              price: scrap.price,
              category: scrap.category || "restaurant",
              location: scrap.location || "위치 정보 없음",
              rating: scrap.rating || 0,
              review_count: scrap.review_count || 0,
              image_url: scrap.image_url,
              coordinates: scrap.coordinates || [0, 0],
            })
            addedCount++
          }
          console.log(`✅ Successfully loaded ${addedCount} user-specific scraps from AWS`)
        } else {
          console.log("ℹ️ No user scraps found in AWS storage (first time login or no scraps)")
        }
      } catch (awsError) {
        console.error("❌ Error downloading scraps from AWS:", awsError)
        // Continue without scraps if AWS download fails
      }
      
      // Step 3: Clear the logout flag since user has successfully logged in
      try {
        await storage.remove("user-logged-out")
        console.log("✅ User data loaded successfully - cleared logout flag")
      } catch (error) {
        console.warn("Failed to clear logout flag:", error)
      }
    } catch (error) {
      console.error("❌ Failed to load user data from AWS:", error)
    } finally {
      self._isLoading = false
      console.log("🏁 loadUserDataFromBackend() completed")
    }
  },
}))

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {}
/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
