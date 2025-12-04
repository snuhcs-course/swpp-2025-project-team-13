# Food Image Labeling & User Preference Aggregation - Implementation Guide

## Overview
This guide implements:
1. Smart food image labeling with manual override
2. CLIP-based food category inference
3. Top-5 food name suggestions from foodlist.json
4. Complete user preference aggregation
5. Enhanced recommendation context

---

## Phase 1: Database Schema Updates

### 1.1 Update UserGalleryImage Model

```python
# server/users/models.py

class UserGalleryImage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="gallery_images")
    image_url = models.URLField()

    # Primary label (best match from CLIP + foodlist.json)
    ai_label = models.CharField(max_length=100, blank=True)
    category_tag = models.CharField(max_length=100, blank=True)

    # Alternative labels (top 5 suggestions for user to choose from)
    label_alternatives = models.JSONField(
        default=list,
        blank=True,
        help_text="List of dicts: [{'name': '치킨', 'confidence': 0.95}, ...]"
    )

    # Confidence score of the primary label
    label_confidence = models.FloatField(default=0.0, help_text="0.0-1.0 confidence")

    # Track if label was manually edited by user
    label_manually_edited = models.BooleanField(default=False)
    label_edited_at = models.DateTimeField(null=True, blank=True)

    # Original inferred label (before user edit)
    original_ai_label = models.CharField(max_length=100, blank=True)

    embedding = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    local_uri = models.CharField(max_length=100, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "category_tag"]),  # For aggregation
        ]

    def __str__(self):
        return f"{self.user.username} - {self.ai_label} ({self.created_at.date()})"
```

### 1.2 Create Migration

```bash
cd server/
python manage.py makemigrations users
python manage.py migrate
```

---

## Phase 2: Backend - CLIP Categorization & Matching

### 2.1 Create Food List Loader

```python
# server/users/foodlist_matcher.py

import json
import logging
from typing import List, Dict, Tuple
from difflib import SequenceMatcher
from pathlib import Path

logger = logging.getLogger(__name__)

class FoodListMatcher:
    """Match CLIP predictions to official food list from foodlist.json"""

    def __init__(self):
        self.foodlist_path = Path(__file__).parent.parent / "psql" / "raw" / "foodlist.json"
        self.food_names = self._load_food_names()

    def _load_food_names(self) -> List[str]:
        """Load food names from foodlist.json, sorted by frequency"""
        try:
            with open(self.foodlist_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # word_counts is OrderedDict sorted by frequency
            return list(data.get('word_counts', {}).keys())
        except Exception as e:
            logger.error(f"Failed to load foodlist.json: {e}")
            return []

    def find_best_matches(self, predicted_label: str, top_k: int = 5) -> List[Dict]:
        """
        Find best matches for predicted label from official food list

        Args:
            predicted_label: Food name predicted by CLIP (e.g., "치킨")
            top_k: Number of suggestions to return (default 5)

        Returns:
            List of dicts with 'name' and 'confidence' keys
            Example: [
                {'name': '치킨', 'confidence': 0.95},
                {'name': '닭다리', 'confidence': 0.85},
                {'name': '튀김', 'confidence': 0.75},
                ...
            ]
        """
        if not self.food_names:
            logger.warning("Food list is empty, returning empty matches")
            return [{'name': predicted_label, 'confidence': 1.0}]

        # Calculate similarity scores
        matches = []
        for food_name in self.food_names:
            # String similarity using SequenceMatcher
            similarity = SequenceMatcher(None, predicted_label.lower(), food_name.lower()).ratio()

            # Exact match gets 1.0, substring match gets 0.9, otherwise ratio
            if predicted_label.lower() == food_name.lower():
                similarity = 1.0
            elif predicted_label.lower() in food_name.lower() or food_name.lower() in predicted_label.lower():
                similarity = max(0.9, similarity)

            matches.append({
                'name': food_name,
                'confidence': similarity
            })

        # Sort by confidence (descending) and return top_k
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        return matches[:top_k]
```

### 2.2 Update image_utils.py for Top-5 Suggestions

```python
# server/users/image_utils.py

import sqlite3
from urllib.parse import unquote, urlparse
from config.settings import AWS_STORAGE_BUCKET_NAME, S3_CLIENT
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from io import BytesIO
from .foodlist_matcher import FoodListMatcher  # NEW

# =====================
# Setup
# =====================
device = "cuda" if torch.cuda.is_available() else "cpu"
model_name = "openai/clip-vit-base-patch32"
model = CLIPModel.from_pretrained(model_name).to(device)
processor = CLIPProcessor.from_pretrained(model_name)
foodlist_matcher = FoodListMatcher()  # NEW


def _extract_s3_key(url: str) -> str:
    parsed = urlparse(url)
    return parsed.path.lstrip('/')

def _read_image_from_s3(url: str) -> bytes:
    s3_key = unquote(_extract_s3_key(url))
    response = S3_CLIENT.get_object(
        Bucket=AWS_STORAGE_BUCKET_NAME,
        Key=s3_key
    )
    image_bytes = response['Body'].read()
    return image_bytes

def _get_food_categories() -> list[str]:
    with sqlite3.connect("chroma_db/chroma.sqlite3") as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT string_value AS category
        FROM embedding_metadata
        WHERE key = 'category';
        """)
        categories = [category[0].strip() for category in cursor.fetchall()]
        categories = list(dict.fromkeys(categories))
        return categories

def _predict_category_from_bytes(image_bytes: bytes, categories: list[str]) -> tuple[str, float]:
    """Predict food category using CLIP"""
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    texts = [f"a photo of {c}" for c in categories]

    inputs = processor(
        text=texts,
        images=[image],
        return_tensors="pt",
        padding=True
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)

    best_idx = probs[0].argmax().item()
    return categories[best_idx], probs[0][best_idx].item()

def get_food_image_category(url: str) -> tuple[str, float]:
    """Legacy function: returns top 1 category"""
    image_bytes = _read_image_from_s3(url)
    food_categories = _get_food_categories()
    return _predict_category_from_bytes(image_bytes, food_categories)

def get_food_image_with_alternatives(url: str) -> dict:
    """
    NEW: Get food category with top-5 alternatives from foodlist.json

    Returns:
        {
            'primary_label': '치킨',
            'confidence': 0.95,
            'alternatives': [
                {'name': '닭다리', 'confidence': 0.85},
                {'name': '튀김', 'confidence': 0.75},
                ...
            ]
        }
    """
    try:
        image_bytes = _read_image_from_s3(url)
        food_categories = _get_food_categories()

        # Get top category from CLIP
        predicted_label, confidence = _predict_category_from_bytes(image_bytes, food_categories)

        # Find best matches from foodlist.json
        alternatives = foodlist_matcher.find_best_matches(predicted_label, top_k=5)

        return {
            'primary_label': alternatives[0]['name'],  # Best match from official list
            'confidence': alternatives[0]['confidence'],
            'alternatives': alternatives[1:],  # Next 4 alternatives
            'clip_prediction': predicted_label,  # Original CLIP output (for debug)
            'clip_confidence': confidence  # CLIP confidence (for debug)
        }
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_food_image_with_alternatives: {e}")
        return {
            'primary_label': '',
            'confidence': 0.0,
            'alternatives': [],
            'error': str(e)
        }
```

### 2.3 Update users/services.py to Store Labels

```python
# server/users/services.py

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from users.image_utils import get_food_image_with_alternatives  # NEW
from .models import User, Profile, Follow, UserGalleryImage
import logging

logger = logging.getLogger(__name__)

@transaction.atomic
def upload_user_photo(*, user: User, photo_url: str, local_uri: str) -> UserGalleryImage:
    """
    Upload photo and automatically categorize it using CLIP
    """
    photo = UserGalleryImage.objects.create(user=user, image_url=photo_url, local_uri=local_uri)

    try:
        # Get CLIP categorization with top-5 alternatives
        result = get_food_image_with_alternatives(photo_url)

        if result.get('primary_label'):
            photo.ai_label = result['primary_label']
            photo.category_tag = result['primary_label']
            photo.label_confidence = result['confidence']
            photo.original_ai_label = result['clip_prediction']  # Store original CLIP output

            # Store alternatives for user to select from
            photo.label_alternatives = result['alternatives']

            photo.save(update_fields=[
                'ai_label', 'category_tag', 'label_confidence',
                'original_ai_label', 'label_alternatives'
            ])

            logger.info(f"Labeled image {photo.id}: {photo.ai_label} (confidence: {photo.label_confidence:.2f})")
    except Exception as e:
        logger.error(f"Failed to classify image {photo_url}: {e}")
        # Continue without label - don't fail the upload

    return photo

@transaction.atomic
def update_image_label(*, photo: UserGalleryImage, new_label: str) -> UserGalleryImage:
    """
    Update image label manually chosen by user
    """
    photo.ai_label = new_label
    photo.category_tag = new_label
    photo.label_manually_edited = True
    photo.label_edited_at = timezone.now()
    photo.save(update_fields=[
        'ai_label', 'category_tag', 'label_manually_edited', 'label_edited_at'
    ])
    logger.info(f"User manually updated image {photo.id} label to: {new_label}")
    return photo

@transaction.atomic
def delete_image(*, photo: UserGalleryImage) -> None:
    """Delete image from gallery"""
    photo_id = photo.id
    photo.delete()
    logger.info(f"Deleted image {photo_id}")

def list_user_photos(*, user: User):
    """List user's photos with their labels"""
    return UserGalleryImage.objects.filter(user=user).order_by("-created_at")
```

---

## Phase 3: Frontend - Image Selection Overlay UI

### 3.1 Create Image Label Selection Component

```tsx
// app/app/components/GalleryImageCard.tsx

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Image,
  Pressable,
  Text,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { spacing, colors, typography } from "app/theme";

interface ImageLabelOption {
  name: string;
  confidence: number;
}

interface GalleryImageCardProps {
  imageUri: string;
  label: string;
  alternatives: ImageLabelOption[];
  onLabelChange: (newLabel: string) => Promise<void>;
  onImageDelete: () => Promise<void>;
}

export const GalleryImageCard: React.FC<GalleryImageCardProps> = ({
  imageUri,
  label,
  alternatives,
  onLabelChange,
  onImageDelete,
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toggleTimeoutRef = useRef<NodeJS.Timeout>();

  const handleImagePress = useCallback(() => {
    // Clear any pending timeout
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
    }

    // Toggle selection
    const newSelected = !isSelected;
    setIsSelected(newSelected);

    if (newSelected) {
      // Set timeout to show options after 2 seconds
      toggleTimeoutRef.current = setTimeout(() => {
        setShowOptions(true);
      }, 2000);
    }
  }, [isSelected]);

  const handleLabelChange = async (newLabel: string) => {
    try {
      setIsLoading(true);
      await onLabelChange(newLabel);
      setShowOptions(false);
      setIsSelected(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update label");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    Alert.alert("Delete Image", "Are you sure you want to delete this image?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            setIsLoading(true);
            await onImageDelete();
          } catch (error) {
            Alert.alert("Error", "Failed to delete image");
          } finally {
            setIsLoading(false);
          }
        },
        style: "destructive",
      },
    ]);
  };

  return (
    <>
      <Pressable onPress={handleImagePress}>
        <Image
          source={{ uri: imageUri }}
          style={{
            width: "100%",
            height: 200,
            borderRadius: 8,
          }}
        />

        {/* Overlay with semi-transparent black layer */}
        {isSelected && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              borderRadius: 8,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Label text */}
            <Text
              style={{
                color: colors.palette.neutral0,
                fontSize: typography.fontSize.lg,
                fontWeight: "600",
                textAlign: "center",
                paddingHorizontal: spacing.md,
              }}
            >
              {label}
            </Text>

            {/* Confidence indicator */}
            <Text
              style={{
                color: colors.palette.neutral300,
                fontSize: typography.fontSize.sm,
                marginTop: spacing.xs,
              }}
            >
              (AI detected)
            </Text>
          </View>
        )}
      </Pressable>

      {/* Label/Delete Options Modal */}
      <Modal visible={showOptions} transparent animationType="fade">
        <Pressable
          onPress={() => {
            setShowOptions(false);
            setIsSelected(false);
          }}
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.palette.neutral0,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xl,
              maxHeight: "70%",
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="large" />
            ) : (
              <>
                <Text
                  style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: "600",
                    marginBottom: spacing.md,
                  }}
                >
                  Change Label or Delete
                </Text>

                <ScrollView style={{ marginBottom: spacing.lg }}>
                  {/* Current label (with checkmark) */}
                  <Pressable
                    onPress={() => handleLabelChange(label)}
                    style={{
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.sm,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.palette.neutral200,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: typography.fontSize.md, fontWeight: "500" }}>
                      {label} ✓
                    </Text>
                  </Pressable>

                  {/* Alternative labels */}
                  {alternatives.map((alt, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => handleLabelChange(alt.name)}
                      style={{
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.sm,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.palette.neutral200,
                      }}
                    >
                      <Text style={{ fontSize: typography.fontSize.md }}>
                        {alt.name}
                      </Text>
                      <Text style={{ fontSize: typography.fontSize.sm, color: colors.palette.neutral500 }}>
                        Confidence: {(alt.confidence * 100).toFixed(0)}%
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Delete button */}
                <Pressable
                  onPress={handleDeleteImage}
                  style={{
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.sm,
                    backgroundColor: colors.palette.angry500,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.palette.neutral0, fontWeight: "600" }}>
                    Delete Image
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
```

### 3.2 Update Gallery Screen to Use New Component

```tsx
// app/app/screens/GalleryScreen.tsx

import React, { useState, useEffect } from "react";
import { View, ScrollView, Text } from "react-native";
import { GalleryImageCard } from "app/components/GalleryImageCard";
import { api } from "app/services/api";
import { spacing } from "app/theme";

export const GalleryScreen: React.FC = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGalleryImages();
  }, []);

  const loadGalleryImages = async () => {
    try {
      setLoading(true);
      const response = await api.getGalleryImages();
      setImages(response);
    } catch (error) {
      console.error("Failed to load gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLabelChange = async (imageId: string, newLabel: string) => {
    try {
      await api.updateImageLabel(imageId, newLabel);
      // Update local state
      setImages(images.map(img =>
        img.id === imageId ? { ...img, ai_label: newLabel } : img
      ));
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await api.deleteImage(imageId);
      setImages(images.filter(img => img.id !== imageId));
    } catch (error) {
      throw error;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600" }}>
          Your Food Gallery
        </Text>

        {images.map((image) => (
          <GalleryImageCard
            key={image.id}
            imageUri={image.image_url}
            label={image.ai_label || "Unknown"}
            alternatives={image.label_alternatives || []}
            onLabelChange={(newLabel) => handleLabelChange(image.id, newLabel)}
            onImageDelete={() => handleDeleteImage(image.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
};
```

---

## Phase 4: Backend API Endpoints

### 4.1 Add API Views for Image Management

```python
# server/users/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import UserGalleryImage
from .serializers import UserGalleryImageSerializer
from . import services
import logging

logger = logging.getLogger(__name__)

class UserGalleryImageViewSet(viewsets.ModelViewSet):
    """API for managing user gallery images with AI-inferred labels"""

    serializer_class = UserGalleryImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserGalleryImage.objects.filter(user=self.request.user).order_by("-created_at")

    @action(detail=True, methods=['patch'])
    def update_label(self, request, pk=None):
        """Update image label manually"""
        image = self.get_object()
        new_label = request.data.get('label')

        if not new_label:
            return Response(
                {'error': 'Label is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        services.update_image_label(photo=image, new_label=new_label)
        serializer = self.get_serializer(image)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'])
    def delete_image(self, request, pk=None):
        """Delete image"""
        image = self.get_object()
        services.delete_image(photo=image)
        return Response(status=status.HTTP_204_NO_CONTENT)
```

### 4.2 Create Serializer

```python
# server/users/serializers.py

from rest_framework import serializers
from .models import UserGalleryImage

class UserGalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGalleryImage
        fields = [
            'id', 'image_url', 'ai_label', 'category_tag',
            'label_alternatives', 'label_confidence',
            'label_manually_edited', 'created_at'
        ]
        read_only_fields = [
            'label_alternatives', 'label_confidence', 'created_at'
        ]
```

---

## Phase 5: User Preference Aggregation

### 5.1 Create Preference Aggregation Service

```python
# server/recommendation_system/preference_aggregator.py

from typing import Dict, List, Any
from users.models import User, UserPreference, UserGalleryImage
from collections import Counter
import logging

logger = logging.getLogger(__name__)

class UserPreferenceAggregator:
    """
    Aggregate user preferences from multiple sources:
    - Taste preferences (spicy, sweet, salty, etc.)
    - Allergies and disliked ingredients
    - Favorite cuisines
    - Recent food images (inferred food types)
    """

    def __init__(self, user: User):
        self.user = user
        self.preference = UserPreference.objects.filter(user=user).first()

    def get_aggregated_profile(self) -> Dict[str, Any]:
        """
        Get comprehensive user preference profile

        Returns:
            {
                'taste_preferences': {'spicy': 3.5, 'sweet': 2.0, ...},
                'allergies': ['우유', '계란'],
                'disliked_ingredients': ['고수'],
                'favorite_cuisines': ['한식', '일식'],
                'inferred_food_interests': {
                    '치킨': {'count': 5, 'recency': 2},
                    '피자': {'count': 3, 'recency': 5},
                    ...
                },
                'exploration_preference': 3.5,
                'confidence': {
                    'taste': 0.8,  # Based on completeness of taste preferences
                    'food_interests': 0.6,  # Based on number of images
                    'overall': 0.7
                }
            }
        """
        if not self.preference:
            logger.warning(f"No preferences found for user {self.user.id}")
            return self._get_default_profile()

        # 1. Taste preferences
        taste_prefs = {
            'spicy': self.preference.spicy_level,
            'sweet': self.preference.sweet_level,
            'salty': self.preference.salty_level,
            'oily': getattr(self.preference, 'oily_level', 2.5),
            'chewy': getattr(self.preference, 'chewy_texture', 2.5),
        }

        # 2. Allergies and dislikes
        allergies = self.preference.allergies or []
        dislikes = self.preference.disliked_ingredients or []

        # 3. Favorite cuisines
        cuisines = self.preference.favorite_cuisines or []

        # 4. Inferred food interests from gallery images
        food_interests = self._get_food_interests()

        # 5. Calculate confidence scores
        confidence = self._calculate_confidence(taste_prefs, allergies, dislikes, food_interests)

        return {
            'user_id': self.user.id,
            'username': self.user.username,
            'taste_preferences': taste_prefs,
            'allergies': allergies,
            'disliked_ingredients': dislikes,
            'favorite_cuisines': cuisines,
            'inferred_food_interests': food_interests,
            'exploration_preference': self.preference.exploration_preference,
            'confidence': confidence,
            'total_gallery_images': self._get_total_gallery_images(),
        }

    def _get_food_interests(self) -> Dict[str, Dict]:
        """
        Extract food interests from user's gallery images

        Returns:
            {
                '치킨': {
                    'count': 5,           # How many times this food appears
                    'recency_score': 0.8, # Recent images weighted higher
                    'frequency_rank': 1   # Rank among all foods
                },
                ...
            }
        """
        from django.utils import timezone
        from datetime import timedelta

        images = UserGalleryImage.objects.filter(
            user=self.user,
            ai_label__isnull=False
        ).exclude(ai_label='')

        if not images.exists():
            return {}

        # Count food labels
        food_counts = Counter()
        food_recency = {}

        now = timezone.now()
        for image in images:
            food = image.ai_label
            food_counts[food] += 1

            # Calculate recency score (exponential decay)
            days_old = (now - image.created_at).days
            recency_score = max(0, 1.0 - (days_old / 90))  # Decay over 90 days

            if food not in food_recency:
                food_recency[food] = []
            food_recency[food].append(recency_score)

        # Build result with frequency and recency
        result = {}
        sorted_foods = sorted(food_counts.items(), key=lambda x: x[1], reverse=True)

        for rank, (food, count) in enumerate(sorted_foods, 1):
            avg_recency = sum(food_recency[food]) / len(food_recency[food])
            result[food] = {
                'count': count,
                'recency_score': round(avg_recency, 2),
                'frequency_rank': rank,
            }

        return result

    def _calculate_confidence(self, taste_prefs: Dict, allergies: List,
                              dislikes: List, food_interests: Dict) -> Dict[str, float]:
        """Calculate confidence scores for each preference category"""

        # Taste confidence: 0.0-1.0 based on how many taste preferences are set
        taste_score = sum([1 for v in taste_prefs.values() if 0 < v < 5]) / len(taste_prefs)

        # Allergies confidence: Higher if user set allergies
        allergen_score = 1.0 if allergies else 0.3

        # Food interest confidence: Based on number of labeled gallery images
        num_images = len(food_interests)
        food_interest_score = min(1.0, num_images / 10)  # Max confidence at 10 images

        # Overall confidence
        overall = (taste_score * 0.3 + allergen_score * 0.2 + food_interest_score * 0.5)

        return {
            'taste': round(taste_score, 2),
            'allergies': round(allergen_score, 2),
            'food_interests': round(food_interest_score, 2),
            'overall': round(overall, 2),
        }

    def _get_total_gallery_images(self) -> int:
        return UserGalleryImage.objects.filter(user=self.user).count()

    def _get_default_profile(self) -> Dict[str, Any]:
        """Return default profile when no preferences found"""
        return {
            'user_id': self.user.id,
            'username': self.user.username,
            'taste_preferences': {
                'spicy': 2.5,
                'sweet': 2.5,
                'salty': 2.5,
                'oily': 2.5,
                'chewy': 2.5,
            },
            'allergies': [],
            'disliked_ingredients': [],
            'favorite_cuisines': [],
            'inferred_food_interests': {},
            'exploration_preference': 2.5,
            'confidence': {
                'taste': 0.0,
                'allergies': 0.0,
                'food_interests': 0.0,
                'overall': 0.0,
            },
            'total_gallery_images': self._get_total_gallery_images(),
        }
```

### 5.2 Create API Endpoint for Aggregated Profile

```python
# server/users/views.py (added method)

from recommendation_system.preference_aggregator import UserPreferenceAggregator

class UserViewSet(viewsets.ModelViewSet):
    """User management API"""

    @action(detail=False, methods=['get'])
    def aggregated_preferences(self, request):
        """Get comprehensive user preference profile from all sources"""
        aggregator = UserPreferenceAggregator(request.user)
        profile = aggregator.get_aggregated_profile()
        return Response(profile)
```

---

## Phase 6: Update Recommendation System to Use Aggregated Profile

### 6.1 Update Recommendation API

```python
# server/recommendation_system/api.py (in POST /recommendations/ handler)

from recommendation_system.preference_aggregator import UserPreferenceAggregator

# In the recommendations endpoint:
aggregator = UserPreferenceAggregator(request.user)
user_profile_data = aggregator.get_aggregated_profile()

# Use aggregated data for context
search_context = SearchContext(
    user_location=tuple(data['user_location']),
    user_taste_preferences=user_profile_data['taste_preferences'],
    allergies=user_profile_data['allergies'],
    dislikes=user_profile_data['disliked_ingredients'],
    preferred_categories=user_profile_data['favorite_cuisines'],
    food_interests=user_profile_data['inferred_food_interests'],  # NEW
    exploration_preference=user_profile_data['exploration_preference'],
    confidence=user_profile_data['confidence'],  # NEW
    max_distance=data.get('distance_preference', 2.0),
    time_of_day=data.get('time_of_day', '점심'),
    day_of_week=data.get('day_of_week', '평일')
)
```

---

## Implementation Checklist

### Phase 1: Database
- [ ] Update UserGalleryImage model with new fields
- [ ] Create and run migrations
- [ ] Create FoodListMatcher class

### Phase 2: Backend CLIP
- [ ] Implement foodlist_matcher.py
- [ ] Update image_utils.py with get_food_image_with_alternatives()
- [ ] Update services.py to call CLIP categorization
- [ ] Create migration if needed

### Phase 3: Frontend UI
- [ ] Create GalleryImageCard component with overlay
- [ ] Update GalleryScreen to use new component
- [ ] Test image selection and label display

### Phase 4: API Endpoints
- [ ] Add UserGalleryImageViewSet endpoints
- [ ] Create serializers
- [ ] Update API routes

### Phase 5: Preference Aggregation
- [ ] Create UserPreferenceAggregator class
- [ ] Add aggregated_preferences endpoint
- [ ] Test profile generation

### Phase 6: Recommendation Integration
- [ ] Update recommendation API to use aggregated profile
- [ ] Test end-to-end flow
- [ ] Validate scoring with new context

---

## Testing Guide

### Backend Testing
```bash
# Test CLIP categorization
python manage.py shell
>>> from users.image_utils import get_food_image_with_alternatives
>>> result = get_food_image_with_alternatives("s3://bucket/path/to/image.jpg")
>>> print(result)

# Test preference aggregation
>>> from recommendation_system.preference_aggregator import UserPreferenceAggregator
>>> user = User.objects.first()
>>> agg = UserPreferenceAggregator(user)
>>> profile = agg.get_aggregated_profile()
>>> print(profile)
```

### Frontend Testing
- Upload image → verify overlay appears on click
- Wait 2 seconds → verify modal appears with options
- Select alternative label → verify API call and state update
- Delete image → verify removal from gallery

---

## Performance Considerations

1. **CLIP Model Loading**: Model is loaded once at startup (takes ~2-3 seconds)
2. **Image Classification**: ~500ms-1s per image (GPU accelerated)
3. **Foodlist Matching**: O(n) where n=4000+ food items, optimizable with caching
4. **Preference Aggregation**: O(m) where m=gallery images, cached for 5 minutes

### Optimization Options
- Cache foodlist in memory with Redis
- Batch image classification (queue processing)
- Cache user profiles (invalidate on gallery update)

