"""
Strategy Pattern Implementation for Scoring Systems

This module provides a unified interface for different scoring strategies,
allowing runtime selection and easy extensibility.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple, Any
import logging

from .scoring import SearchContext, HybridScorer
from .rl_scoring import RLScorer, ScoringWeights as RLScoringWeights, get_rl_scorer

logger = logging.getLogger(__name__)


class ScoringStrategy(ABC):
    """
    Abstract base class for scoring strategies.
    Provides a unified interface for different scoring implementations.
    """

    @abstractmethod
    def calculate_score(
        self,
        menu: Dict,
        user_prefs: Dict,
        search_context: Optional[SearchContext] = None,
        text_similarity: Optional[float] = None,
        user_embedding: Optional[List[float]] = None,
        menu_embedding: Optional[List[float]] = None,
        query_context: Optional[Dict] = None,
        user_location: Optional[Tuple[float, float]] = None,
        weights: Optional[Any] = None,
    ) -> Tuple[float, Optional[Any]]:
        """
        Calculate score for a menu item.

        Args:
            menu: Menu data dictionary
            user_prefs: User preferences dictionary
            search_context: Search context with location, budget, etc.
            text_similarity: Pre-calculated text similarity score
            user_embedding: User's embedding vector
            menu_embedding: Menu's embedding vector
            query_context: Query context from NLP intent extraction
            user_location: User's current location as (x, y) tuple
            weights: Scoring weights (strategy-specific)

        Returns:
            Tuple of (final_score, components_dict)
            components_dict may be None if strategy doesn't provide detailed components
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if this strategy is available/ready to use.

        Returns:
            True if strategy can be used, False otherwise
        """
        pass


class RLScoringStrategy(ScoringStrategy):
    """
    Strategy implementation using RLScorer for RL-optimized scoring.
    """

    def __init__(self):
        """Initialize RL scoring strategy."""
        self._rl_scorer: Optional[RLScorer] = None
        self._initialize_scorer()

    def _initialize_scorer(self):
        """Initialize the RL scorer instance."""
        try:
            self._rl_scorer = get_rl_scorer()
        except Exception as e:
            logger.warning(f"Failed to initialize RLScorer: {e}")
            self._rl_scorer = None

    def is_available(self) -> bool:
        """Check if RL scorer is available."""
        return self._rl_scorer is not None

    def calculate_score(
        self,
        menu: Dict,
        user_prefs: Dict,
        search_context: Optional[SearchContext] = None,
        text_similarity: Optional[float] = None,
        user_embedding: Optional[List[float]] = None,
        menu_embedding: Optional[List[float]] = None,
        query_context: Optional[Dict] = None,
        user_location: Optional[Tuple[float, float]] = None,
        weights: Optional[RLScoringWeights] = None,
    ) -> Tuple[float, Optional[Any]]:
        """
        Calculate score using RL-optimized scoring.

        If RL scorer is not available, returns (0.0, None).
        """
        if not self.is_available():
            logger.warning("RLScorer not available, cannot calculate score")
            return 0.0, None

        # Extract user_location from search_context if not provided
        if user_location is None and search_context:
            user_location = search_context.user_location

        try:
            final_score, components = self._rl_scorer.calculate_menu_score(
                menu=menu,
                user_prefs=user_prefs,
                weights=weights,
                user_embedding=user_embedding,
                menu_embedding=menu_embedding,
                query_context=query_context,
                user_location=user_location,
            )
            return final_score, components
        except Exception as e:
            logger.error(f"Error in RLScoringStrategy.calculate_score: {e}")
            return 0.0, None


class HybridScoringStrategy(ScoringStrategy):
    """
    Strategy implementation using HybridScorer for traditional hybrid scoring.
    """

    def __init__(self, weights=None):
        """
        Initialize hybrid scoring strategy.

        Args:
            weights: Optional ScoringWeights instance for custom weights
        """
        from .scoring import ScoringWeights
        self._scorer = HybridScorer(weights or ScoringWeights())

    def is_available(self) -> bool:
        """Hybrid scorer is always available."""
        return True

    def calculate_score(
        self,
        menu: Dict,
        user_prefs: Dict,
        search_context: Optional[SearchContext] = None,
        text_similarity: Optional[float] = None,
        user_embedding: Optional[List[float]] = None,
        menu_embedding: Optional[List[float]] = None,
        query_context: Optional[Dict] = None,
        user_location: Optional[Tuple[float, float]] = None,
        weights: Optional[Any] = None,
    ) -> Tuple[float, Optional[Any]]:
        """
        Calculate score using hybrid scoring.

        Requires search_context and either text_similarity or ability to calculate it.
        """
        if search_context is None:
            logger.error("HybridScoringStrategy requires search_context")
            return 0.0, None

        try:
            # Build item_data from menu dict
            rating_raw = menu.get('rating') or menu.get('avg_rating')
            rating = float(rating_raw) if rating_raw is not None else 0.0

            review_count_raw = menu.get('review_count')
            review_count = int(review_count_raw) if review_count_raw is not None else 0

            x_raw = menu.get('x')
            y_raw = menu.get('y')
            x = float(x_raw) if x_raw is not None else 0.0
            y = float(y_raw) if y_raw is not None else 0.0

            item_data = {
                'rating': rating,
                'review_count': review_count,
                'price': menu.get('price', 0) or menu.get('avg_price', 0),
                'coordinates': (x, y),
                'keywords': menu.get('keywords', []) if menu.get('keywords') else [],
                'has_image': bool(menu.get('images') or menu.get('has_image', False))
            }

            # Calculate text similarity if not provided
            if text_similarity is None:
                # Fallback: calculate simple similarity
                text_similarity = 0.5  # Default value
                logger.debug("text_similarity not provided, using default 0.5")

            # Calculate hybrid score
            final_score = self._scorer.calculate_hybrid_score(
                text_similarity, item_data, search_context
            )

            return final_score, None  # HybridScorer doesn't return components
        except Exception as e:
            logger.error(f"Error in HybridScoringStrategy.calculate_score: {e}")
            return 0.0, None


class ScoringContext:
    """
    Context class that manages scoring strategy selection and execution.
    Uses the Strategy Pattern to allow runtime strategy switching.
    """

    def __init__(self, strategy: Optional[ScoringStrategy] = None):
        """
        Initialize scoring context with optional strategy.

        Args:
            strategy: Initial scoring strategy. If None, uses default strategy selection.
        """
        if strategy is None:
            self._strategy = self._create_default_strategy()
        else:
            self._strategy = strategy

    def set_strategy(self, strategy: ScoringStrategy):
        """
        Change the scoring strategy at runtime.

        Args:
            strategy: New scoring strategy to use
        """
        self._strategy = strategy

    def get_strategy(self) -> ScoringStrategy:
        """Get the current scoring strategy."""
        return self._strategy

    def calculate_score(
        self,
        menu: Dict,
        user_prefs: Dict,
        search_context: Optional[SearchContext] = None,
        text_similarity: Optional[float] = None,
        user_embedding: Optional[List[float]] = None,
        menu_embedding: Optional[List[float]] = None,
        query_context: Optional[Dict] = None,
        user_location: Optional[Tuple[float, float]] = None,
        weights: Optional[Any] = None,
    ) -> Tuple[float, Optional[Any]]:
        """
        Calculate score using the current strategy.

        Delegates to the current strategy's calculate_score method.
        """
        if self._strategy is None:
            logger.error("No scoring strategy set")
            return 0.0, None

        if not self._strategy.is_available():
            logger.warning(f"Current strategy {type(self._strategy).__name__} is not available")
            return 0.0, None

        return self._strategy.calculate_score(
            menu=menu,
            user_prefs=user_prefs,
            search_context=search_context,
            text_similarity=text_similarity,
            user_embedding=user_embedding,
            menu_embedding=menu_embedding,
            query_context=query_context,
            user_location=user_location,
            weights=weights,
        )

    @staticmethod
    def _create_default_strategy() -> ScoringStrategy:
        """
        Factory method to create default scoring strategy.

        Prefers RLScoringStrategy if available, falls back to HybridScoringStrategy.

        Returns:
            ScoringStrategy instance
        """
        # Try RL scoring strategy first
        rl_strategy = RLScoringStrategy()
        if rl_strategy.is_available():
            logger.info("Using RLScoringStrategy as default")
            return rl_strategy

        # Fallback to hybrid scoring
        logger.info("RLScoringStrategy not available, using HybridScoringStrategy")
        return HybridScoringStrategy()


