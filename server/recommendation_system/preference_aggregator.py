"""
User Preference Aggregation System

Aggregates user preferences from multiple sources:
- Taste preferences (spicy, sweet, salty, oily, chewy)
- Allergies and disliked ingredients
- Favorite cuisines
- Recent food images (inferred food types)
"""

from typing import Dict, List, Any
from users.models import User, UserPreference, UserGalleryImage
from collections import Counter
import logging

logger = logging.getLogger(__name__)


class UserPreferenceAggregator:
    """
    Aggregate user preferences from multiple sources to create a comprehensive profile
    """

    def __init__(self, user: User):
        self.user = user
        self.preference = UserPreference.objects.filter(user=user).first()

    def get_aggregated_profile(self) -> Dict[str, Any]:
        """
        Get comprehensive user preference profile

        Returns:
            {
                'user_id': 1,
                'username': 'john_doe',
                'taste_preferences': {
                    'spicy': 3.5,
                    'sweet': 2.0,
                    'salty': 3.0,
                    'oily': 2.5,
                    'chewy': 3.0
                },
                'allergies': ['우유', '계란'],
                'disliked_ingredients': ['고수'],
                'favorite_cuisines': ['한식', '일식'],
                'inferred_food_interests': {
                    '치킨': {'count': 5, 'recency': 2, 'recency_score': 0.95},
                    '피자': {'count': 3, 'recency': 5, 'recency_score': 0.85},
                },
                'exploration_preference': 3.5,
                'confidence': {
                    'taste': 0.8,
                    'food_interests': 0.6,
                    'overall': 0.7
                },
                'total_gallery_images': 8
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
                    'recency_score': 0.8, # Recent images weighted higher (0-1)
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
        """
        Calculate confidence scores for each preference category

        Confidence ranges from 0.0 (no data) to 1.0 (complete data)
        """

        # Taste confidence: 0.0-1.0 based on how many taste preferences are set
        # A "set" taste preference is anything between 0 and 5 (exclusive of defaults)
        num_set_tastes = sum([1 for v in taste_prefs.values() if v is not None])
        taste_score = num_set_tastes / len(taste_prefs) if taste_prefs else 0.0

        # Allergies confidence: Higher if user set allergies
        allergen_score = 1.0 if allergies else 0.3

        # Food interest confidence: Based on number of labeled gallery images
        num_images = len(food_interests)
        # Max confidence at 10 images
        food_interest_score = min(1.0, num_images / 10)

        # Overall confidence: weighted average
        overall = (
            taste_score * 0.3 +
            allergen_score * 0.2 +
            food_interest_score * 0.5
        )

        return {
            'taste': round(taste_score, 2),
            'allergies': round(allergen_score, 2),
            'food_interests': round(food_interest_score, 2),
            'overall': round(overall, 2),
        }

    def _get_total_gallery_images(self) -> int:
        """Get count of all user's gallery images"""
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
