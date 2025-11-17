"""
Unified Embeddings Pipeline

Creates consistent embedding representations for:
- Menus (text + image + category + ingredients)
- Users (preferences + gallery + interactions)
- Queries (natural language context)
"""

import logging
import os
from typing import Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Global model cache to avoid re-initializing the same model multiple times
_cached_models: Dict[str, any] = {}


def get_cached_sentence_transformer(model_name: str):
    """Get or initialize a cached SentenceTransformer model."""
    global _cached_models

    if model_name not in _cached_models:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading model '{model_name}' into cache...")
            _cached_models[model_name] = SentenceTransformer(model_name)
            logger.info(f"Model '{model_name}' cached successfully")
        except Exception as e:
            logger.error(f"Failed to load model '{model_name}': {e}")
            return None

    return _cached_models[model_name]


class MenuEmbeddingPipeline:
    """
    Creates unified menu embeddings by combining multiple signals:
    - KoSimCSE (text similarity) → 512-d
    - CLIP (visual features) → 512-d
    - Category embeddings → 300-d
    - Ingredient embeddings → 300-d
    - Final: Dense layer → 512-d unified vector
    """

    def __init__(self):
        """Initialize embedding models using cached instances."""
        try:
            # Get model name from environment or use default
            model_name = os.environ.get('EMBEDDING_MODEL_NAME', 'BM-K/KoSimCSE-roberta')
            # Use cached model instead of creating a new instance
            self.text_model = get_cached_sentence_transformer(model_name)

            # CLIP would be initialized here in production
            # from transformers import CLIPProcessor, CLIPModel
            # self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_model = None

        except Exception as e:
            logger.warning(f"Failed to initialize embedding models: {e}")
            logger.warning("Continuing with fallback embeddings (random vectors)")
            self.text_model = None

    def create_menu_embedding(
        self,
        menu_name: str,
        description: str,
        category: str,
        ingredients: Optional[List[str]] = None,
        image_embedding: Optional[List[float]] = None,
    ) -> Optional[List[float]]:
        """
        Create unified menu embedding.

        Args:
            menu_name: Name of the menu
            description: Menu description
            category: Food category
            ingredients: List of ingredients
            image_embedding: Pre-computed CLIP image embedding

        Returns:
            512-d unified embedding vector
        """
        try:
            embeddings = []

            # 1. Text similarity (KoSimCSE)
            if self.text_model:
                try:
                    menu_text = f"{menu_name} {description} {category}"
                    text_emb = self.text_model.encode(menu_text, convert_to_numpy=True, show_progress_bar=False)
                    embeddings.append(text_emb[:512])  # Ensure 512-d
                except Exception as e:
                    logger.debug(f"Failed to encode text: {e}, using fallback")
                    embeddings.append(np.random.randn(512) * 0.1)
            else:
                # Fallback text embedding
                embeddings.append(np.random.randn(512) * 0.1)

            # 2. Category embedding (simple one-hot extended)
            category_emb = self._encode_category(category)
            embeddings.append(category_emb)

            # 3. Ingredient embedding (averaged)
            if ingredients:
                ingredient_emb = self._encode_ingredients(ingredients)
                embeddings.append(ingredient_emb)

            # 4. Image embedding (CLIP if available)
            if image_embedding:
                embeddings.append(np.array(image_embedding[:512]))

            # Combine embeddings
            if embeddings:
                combined = np.concatenate(embeddings, axis=0)

                # Simple normalization and dimensionality reduction to 512
                normalized = combined / (np.linalg.norm(combined) + 1e-10)

                # Use first 512 dims (weighted combination would be better)
                final_embedding = normalized[:512].tolist()

                # Only log at trace/debug level if needed for debugging
                # logger.debug(f"Created menu embedding for: {menu_name}")
                return final_embedding

        except Exception as e:
            logger.error(f"Error creating menu embedding for {menu_name}: {e}")

        # Fallback: return random 512-d vector
        return (np.random.randn(512) * 0.1).tolist()

    def _encode_category(self, category: str, dim: int = 300) -> np.ndarray:
        """Create category embedding."""
        try:
            if self.text_model:
                cat_emb = self.text_model.encode(category, convert_to_numpy=True, show_progress_bar=False)
                return cat_emb[:dim]
        except Exception as e:
            logger.warning(f"Error encoding category '{category}': {e}")

        # Fallback: random vector
        return np.random.randn(dim) * 0.1

    def _encode_ingredients(self, ingredients: List[str], dim: int = 300) -> np.ndarray:
        """Create ingredient embedding by averaging ingredient vectors."""
        try:
            if self.text_model and ingredients:
                ingredient_embs = []
                for ingredient in ingredients:
                    ing_emb = self.text_model.encode(ingredient, convert_to_numpy=True, show_progress_bar=False)
                    ingredient_embs.append(ing_emb[:dim])

                if ingredient_embs:
                    avg_emb = np.mean(ingredient_embs, axis=0)
                    return avg_emb
        except Exception as e:
            logger.warning(f"Error encoding ingredients: {e}")

        # Fallback
        return np.random.randn(dim) * 0.1


class UserEmbeddingAggregator:
    """
    Creates unified user embeddings by aggregating:
    - Taste preferences (spicy, sweet, salty vectors)
    - Gallery image embeddings
    - Interaction history
    - Favorite cuisine embeddings
    """

    def __init__(self):
        """Initialize aggregator using cached model instance."""
        try:
            # Get model name from environment or use default
            model_name = os.environ.get('EMBEDDING_MODEL_NAME', 'BM-K/KoSimCSE-roberta')
            # Use cached model instead of creating a new instance
            self.embedding_model = get_cached_sentence_transformer(model_name)
        except Exception as e:
            logger.warning(f"Failed to initialize user embedding aggregator: {e}")
            logger.warning("Continuing with fallback embeddings (random vectors)")
            self.embedding_model = None

    def create_user_embedding(
        self,
        user_preferences: Dict,
        gallery_image_embeddings: Optional[List[List[float]]] = None,
        favorite_cuisines: Optional[List[str]] = None,
    ) -> Optional[List[float]]:
        """
        Create unified user embedding.

        Args:
            user_preferences: Dict with taste preferences
            gallery_image_embeddings: List of gallery image embeddings
            favorite_cuisines: List of favorite cuisine names

        Returns:
            512-d user embedding
        """
        try:
            components = []

            # 1. Taste preference vector (normalized)
            taste_vector = self._encode_taste_preferences(user_preferences)
            if taste_vector is not None:
                components.append(taste_vector)

            # 2. Gallery images aggregation
            if gallery_image_embeddings:
                gallery_agg = self._aggregate_gallery_embeddings(gallery_image_embeddings)
                components.append(gallery_agg)

            # 3. Favorite cuisines
            if favorite_cuisines:
                cuisines_emb = self._encode_favorite_cuisines(favorite_cuisines)
                components.append(cuisines_emb)

            # Combine components
            if components:
                combined = np.concatenate(components, axis=0)
                normalized = combined / (np.linalg.norm(combined) + 1e-10)

                # Reduce to 512-d
                final_embedding = normalized[:512].tolist()

                logger.debug("Created user embedding")
                return final_embedding

        except Exception as e:
            logger.error(f"Error creating user embedding: {e}")

        return None

    def _encode_taste_preferences(self, user_prefs: Dict) -> Optional[np.ndarray]:
        """Encode taste preferences as vector."""
        try:
            spicy = user_prefs.get('taste_preferences', {}).get('spicy', 3.0) / 10.0
            sweet = user_prefs.get('taste_preferences', {}).get('sweet', 3.0) / 10.0
            salty = user_prefs.get('taste_preferences', {}).get('salty', 3.0) / 10.0
            exploration = user_prefs.get('exploration_preference', 2.5) / 5.0

            taste_vector = np.array([spicy, sweet, salty, exploration])
            taste_vector = np.tile(taste_vector, int(512 / 4))  # Extend to 512-d

            return taste_vector[:512]
        except Exception as e:
            logger.warning(f"Error encoding taste preferences: {e}")
            return None

    def _aggregate_gallery_embeddings(self, embeddings: List[List[float]]) -> np.ndarray:
        """Aggregate multiple gallery image embeddings."""
        try:
            if embeddings:
                embs_array = np.array(embeddings)
                # Weighted average (recent images weighted higher)
                weights = np.linspace(0.5, 1.0, len(embeddings))
                weighted_avg = np.average(embs_array, axis=0, weights=weights)
                return weighted_avg[:512]
        except Exception as e:
            logger.warning(f"Error aggregating gallery embeddings: {e}")

        return np.zeros(512)

    def _encode_favorite_cuisines(self, cuisines: List[str]) -> np.ndarray:
        """Encode favorite cuisines."""
        try:
            if self.embedding_model and cuisines:
                cuisine_embs = []
                for cuisine in cuisines:
                    cuisine_emb = self.embedding_model.encode(cuisine, convert_to_numpy=True, show_progress_bar=False)
                    cuisine_embs.append(cuisine_emb[:512])

                if cuisine_embs:
                    avg = np.mean(cuisine_embs, axis=0)
                    return avg
        except Exception as e:
            logger.warning(f"Error encoding cuisines: {e}")

        return np.zeros(512)


class EmbeddingSimilarity:
    """Calculate similarity between embeddings."""

    @staticmethod
    def cosine_similarity(embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings."""
        try:
            arr1 = np.array(embedding1)
            arr2 = np.array(embedding2)

            # Normalize
            arr1 = arr1 / (np.linalg.norm(arr1) + 1e-10)
            arr2 = arr2 / (np.linalg.norm(arr2) + 1e-10)

            # Cosine similarity
            similarity = np.dot(arr1, arr2)
            return float(np.clip(similarity, -1.0, 1.0))
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {e}")
            return 0.0

    @staticmethod
    def euclidean_distance(embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate Euclidean distance between two embeddings."""
        try:
            arr1 = np.array(embedding1)
            arr2 = np.array(embedding2)
            distance = np.linalg.norm(arr1 - arr2)
            return float(distance)
        except Exception as e:
            logger.error(f"Error calculating Euclidean distance: {e}")
            return 0.0


# Singleton instances
_menu_pipeline = None
_user_aggregator = None
_similarity = EmbeddingSimilarity()


def get_menu_embedding_pipeline() -> Optional[MenuEmbeddingPipeline]:
    """Get or initialize menu embedding pipeline."""
    global _menu_pipeline
    if _menu_pipeline is None:
        try:
            _menu_pipeline = MenuEmbeddingPipeline()
        except Exception as e:
            logger.error(f"Failed to initialize menu embedding pipeline: {e}")
    return _menu_pipeline


def get_user_embedding_aggregator() -> Optional[UserEmbeddingAggregator]:
    """Get or initialize user embedding aggregator."""
    global _user_aggregator
    if _user_aggregator is None:
        try:
            _user_aggregator = UserEmbeddingAggregator()
        except Exception as e:
            logger.error(f"Failed to initialize user embedding aggregator: {e}")
    return _user_aggregator


def calculate_embedding_similarity(emb1: List[float], emb2: List[float]) -> float:
    """Calculate cosine similarity between embeddings."""
    return _similarity.cosine_similarity(emb1, emb2)
