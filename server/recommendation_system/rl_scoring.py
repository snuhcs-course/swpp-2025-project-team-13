"""
RL-Enhanced Scoring Pipeline

Implements the new scoring formula with RL-optimized weights:
  Final Score = w1*text_similarity + w2*popularity + w3*distance +
                w4*price + w5*freshness + w6*query_similarity +
                w7*taste_alignment - penalty
"""

import logging
import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ScoringWeights:
    """RL-optimized scoring weights."""
    text_similarity: float = 0.65
    popularity: float = 0.20
    distance: float = 0.10
    price: float = 0.05
    freshness: float = 0.10
    query_similarity: float = 0.0
    taste_alignment: float = 0.0

    def to_list(self) -> List[float]:
        """Convert to list for storage."""
        return [
            self.text_similarity,
            self.popularity,
            self.distance,
            self.price,
            self.freshness,
            self.query_similarity,
            self.taste_alignment,
        ]

    @classmethod
    def from_list(cls, weights: List[float]) -> "ScoringWeights":
        """Create from list."""
        if len(weights) >= 7:
            return cls(
                text_similarity=weights[0],
                popularity=weights[1],
                distance=weights[2],
                price=weights[3],
                freshness=weights[4],
                query_similarity=weights[5],
                taste_alignment=weights[6],
            )
        return cls()


@dataclass
class MenuScoreComponents:
    """Individual scoring components for a menu."""
    text_similarity: float = 0.0
    popularity_score: float = 0.0
    distance_score: float = 0.0
    price_score: float = 0.0
    freshness_score: float = 0.0
    query_similarity: float = 0.0
    taste_alignment: float = 0.0
    allergy_penalty: float = 0.0
    dislike_penalty: float = 0.0

    def get_weighted_score(self, weights: ScoringWeights) -> float:
        """Calculate final score using weights."""
        score = (
            weights.text_similarity * self.text_similarity
            + weights.popularity * self.popularity_score
            + weights.distance * self.distance_score
            + weights.price * self.price_score
            + weights.freshness * self.freshness_score
            + weights.query_similarity * self.query_similarity
            + weights.taste_alignment * self.taste_alignment
        )

        # Apply penalties
        penalty = self.allergy_penalty + self.dislike_penalty
        final_score = max(0.0, score - penalty)

        return final_score


class RLScorer:
    """
    Scores menus using RL-optimized weights.

    Supports:
    - User-specific weight vectors
    - Query-aware scoring
    - Taste-based alignment
    - Embedding similarity
    """

    def __init__(self):
        """Initialize scorer."""
        self.default_weights = ScoringWeights()
        logger.info("Initialized RL Scorer with default weights")

    def calculate_menu_score(
        self,
        menu: Dict,
        user_prefs: Dict,
        weights: Optional[ScoringWeights] = None,
        user_embedding: Optional[List[float]] = None,
        menu_embedding: Optional[List[float]] = None,
        query_context: Optional[Dict] = None,
        user_location: Optional[Tuple[float, float]] = None,
    ) -> Tuple[float, MenuScoreComponents]:
        """
        Calculate final score for a menu using RL weights.

        Args:
            menu: Menu data
            user_prefs: User preferences
            weights: RL weight vector (uses defaults if None)
            user_embedding: User's unified embedding
            menu_embedding: Menu's unified embedding
            query_context: Context from natural language query
            user_location: User's current location

        Returns:
            Tuple of (final_score, components)
        """
        if weights is None:
            weights = self.default_weights

        components = MenuScoreComponents()

        try:
            # 1. Text Similarity
            if menu_embedding and user_embedding:
                from .unified_embeddings import calculate_embedding_similarity

                components.text_similarity = max(
                    0.0,
                    calculate_embedding_similarity(menu_embedding, user_embedding),
                )
            else:
                # Fallback to keyword matching
                components.text_similarity = self._calculate_keyword_similarity(
                    menu, user_prefs
                )

            # 2. Popularity Score
            components.popularity_score = self._calculate_popularity(menu)

            # 3. Distance Score
            if user_location:
                components.distance_score = self._calculate_distance_score(
                    menu, user_location
                )

            # 4. Price Score
            components.price_score = self._calculate_price_score(
                menu, user_prefs
            )

            # 5. Freshness Score
            components.freshness_score = self._calculate_freshness(menu)

            # 6. Query Similarity
            if query_context and menu_embedding:
                components.query_similarity = self._calculate_query_alignment(
                    menu, query_context, menu_embedding
                )

            # 7. Taste Alignment
            components.taste_alignment = self._calculate_taste_alignment(
                menu, user_prefs, query_context
            )

            # Penalties
            components.allergy_penalty = self._calculate_allergy_penalty(
                menu, user_prefs
            )
            components.dislike_penalty = self._calculate_dislike_penalty(
                menu, user_prefs
            )

            # Calculate final score
            final_score = components.get_weighted_score(weights)

            return final_score, components

        except Exception as e:
            logger.error(f"Error calculating menu score: {e}")
            return 0.0, components

    def _calculate_keyword_similarity(self, menu: Dict, user_prefs: Dict) -> float:
        """Simple keyword-based similarity."""
        try:
            menu_text = (
                f"{menu.get('name') or ''} {menu.get('category') or ''} "
                f"{menu.get('description') or ''}"
            ).lower()

            # Check for preferred cuisines
            preferred = user_prefs.get("preferred_categories", []) or []
            score = 0.3  # Base score

            for cuisine in preferred:
                if cuisine and (cuisine.lower() in menu_text):
                    score = 0.8
                    break

            return score
        except Exception as e:
            logger.warning(f"Error in keyword similarity: {e}")
            return 0.3

    def _calculate_popularity(self, menu: Dict) -> float:
        """Calculate popularity score from rating and review count."""
        try:
            rating_raw = menu.get("rating")
            try:
                rating = float(rating_raw) if rating_raw is not None else 3.0
            except (ValueError, TypeError):
                rating = 3.0

            review_count_raw = menu.get("review_count")
            try:
                review_count = int(review_count_raw) if review_count_raw is not None else 0
            except (ValueError, TypeError):
                review_count = 0

            # Ensure valid numeric values
            rating = float(rating) if rating else 3.0
            review_count = int(review_count) if review_count else 0

            # Normalize rating (0-1)
            rating_score = float(rating) / 5.0

            # Review count boost (logarithmic)
            review_boost = min(1.0, math.log1p(float(review_count)) / 5.0)

            # Combine: 70% rating, 30% review boost
            popularity = 0.7 * rating_score + 0.3 * review_boost

            return min(1.0, popularity)
        except Exception as e:
            logger.warning(f"Error calculating popularity: {e}")
            return 0.5

    def _calculate_distance_score(
        self, menu: Dict, user_location: Tuple[float, float]
    ) -> float:
        """Calculate distance score (farther = lower score)."""
        try:
            distance_m_raw = menu.get("distance_meters")
            distance_m = float(distance_m_raw) if distance_m_raw is not None else 5000.0

            # Haversine-like scoring: max at 0m, decays with distance
            # At 5km, score is 0.3; at 10km, score is 0.1
            distance_m = float(distance_m)  # Ensure float type

            if distance_m <= 500:
                return 1.0
            elif distance_m <= 2000:
                return 0.8 - (distance_m - 500.0) / 3000.0
            elif distance_m <= 5000:
                return 0.5 - (distance_m - 2000.0) / 6000.0
            else:
                return max(0.0, 0.1 - (distance_m - 5000.0) / 10000.0)

        except Exception as e:
            logger.warning(f"Error calculating distance score: {e}")
            return 0.5

    def _calculate_price_score(self, menu: Dict, user_prefs: Dict) -> float:
        """Calculate price appropriateness score."""
        try:
            menu_price_raw = menu.get("price")
            menu_price = float(menu_price_raw) if menu_price_raw is not None else 0.0

            budget_range = user_prefs.get("budget_range", [0, 0])
            if not budget_range or budget_range == [0, 0]:
                budget_range = [0, 0]

            if budget_range[0] == 0 and budget_range[1] == 0:
                return 0.5  # Neutral if no budget specified

            min_budget = float(budget_range[0]) if budget_range[0] is not None else 0.0
            max_budget = float(budget_range[1]) if budget_range[1] is not None else 0.0

            # Perfect match if within budget
            if min_budget <= menu_price <= max_budget:
                return 1.0

            # Penalty if outside budget
            if menu_price < min_budget:
                return 0.6
            else:  # menu_price > max_budget
                return max(0.1, 0.8 - (menu_price - max_budget) / 1000.0)

        except Exception as e:
            logger.warning(f"Error calculating price score: {e}")
            return 0.5

    def _calculate_freshness(self, menu: Dict) -> float:
        """Calculate freshness score based on image availability and reviews."""
        try:
            has_image = bool(menu.get("images"))
            review_count_raw = menu.get("review_count")
            review_count = int(review_count_raw) if review_count_raw is not None else 0

            score = 0.4  # Base

            if has_image:
                score += 0.3

            # More reviews = fresher/more active
            if review_count > 50:
                score += 0.3
            elif review_count > 10:
                score += 0.15

            return min(1.0, score)
        except Exception as e:
            logger.warning(f"Error calculating freshness: {e}")
            return 0.5

    def _calculate_query_alignment(
        self, menu: Dict, query_context: Dict, menu_embedding: List[float]
    ) -> float:
        """Calculate alignment with user's natural language query."""
        try:
            # Check if menu categories match query intent
            intent_categories = query_context.get("intent", {}).get("categories", []) if query_context else []
            menu_category = (menu.get("category") or "").lower()

            for cat in intent_categories:
                if cat and (cat.lower() in menu_category):
                    return 0.95

            # Check ingredient matches
            intent_ingredients = query_context.get("intent", {}).get(
                "ingredients", []
            ) if query_context else []
            menu_description = (menu.get("description") or "").lower()

            matches = sum(
                1 for ing in intent_ingredients if ing and (ing.lower() in menu_description)
            )
            if matches > 0:
                return 0.7

            return 0.3
        except Exception as e:
            logger.warning(f"Error calculating query alignment: {e}")
            return 0.5

    def _calculate_taste_alignment(
        self, menu: Dict, user_prefs: Dict, query_context: Optional[Dict] = None
    ) -> float:
        """Calculate alignment with user taste preferences."""
        try:
            score = 0.5  # Neutral base

            # Check against preferred cuisines
            preferred = user_prefs.get("preferred_categories", []) or []
            menu_category = (menu.get("category") or "").lower()

            if preferred and any(
                (p or "").lower() in menu_category for p in preferred if p
            ):
                score = 0.8

            # Check against disliked ingredients
            dislikes = user_prefs.get("disliked_ingredients", []) or []
            menu_desc = (menu.get("description") or "").lower()

            if dislikes and any((d or "").lower() in menu_desc for d in dislikes if d):
                score = max(0.0, score - 0.3)

            # Query intent taste preferences
            if query_context:
                intent = query_context.get("intent", {})
                preferred_tastes = intent.get("preferred_tastes", [])

                # Approximate taste from category
                if preferred_tastes:
                    score = min(1.0, score + 0.2)

            return score
        except Exception as e:
            logger.warning(f"Error calculating taste alignment: {e}")
            return 0.5

    def _calculate_allergy_penalty(self, menu: Dict, user_prefs: Dict) -> float:
        """Calculate penalty for allergen conflicts."""
        try:
            allergies = user_prefs.get("allergies", [])
            if not allergies:
                return 0.0

            menu_text = (
                f"{menu.get('description') or ''} "
                f"{menu.get('ingredients') or ''}"
            ).lower()

            for allergen in allergies:
                if allergen and (allergen.lower() in menu_text):
                    return 1.0  # Severe penalty

            return 0.0
        except Exception as e:
            logger.warning(f"Error calculating allergy penalty: {e}")
            return 0.0

    def _calculate_dislike_penalty(self, menu: Dict, user_prefs: Dict) -> float:
        """Calculate penalty for disliked ingredients."""
        try:
            dislikes = user_prefs.get("disliked_ingredients", [])
            if not dislikes:
                return 0.0

            menu_text = (
                f"{menu.get('description') or ''} "
                f"{menu.get('ingredients') or ''}"
            ).lower()

            penalty = 0.0
            for dislike in dislikes:
                if dislike and (dislike.lower() in menu_text):
                    penalty += 0.15  # Cumulative penalty

            return min(0.5, penalty)
        except Exception as e:
            logger.warning(f"Error calculating dislike penalty: {e}")
            return 0.0


# Singleton instance
_rl_scorer = None


def get_rl_scorer() -> RLScorer:
    """Get or initialize RL scorer."""
    global _rl_scorer
    if _rl_scorer is None:
        _rl_scorer = RLScorer()
    return _rl_scorer
