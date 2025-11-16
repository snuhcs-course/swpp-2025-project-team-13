import json
import logging
from typing import List, Dict
from difflib import SequenceMatcher
from pathlib import Path

logger = logging.getLogger(__name__)


class FoodListMatcher:
    """Match CLIP predictions to official food list from foodlist.json"""

    def __init__(self):
        self.foodlist_path = Path(__file__).parent.parent / "psql" / "raw" / "foodlist.json"
        self.food_names = self._load_food_names()
        logger.info(f"Loaded {len(self.food_names)} food names from foodlist.json")

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


# Initialize global instance
try:
    foodlist_matcher = FoodListMatcher()
except Exception as e:
    logger.error(f"Failed to initialize FoodListMatcher: {e}")
    foodlist_matcher = None
