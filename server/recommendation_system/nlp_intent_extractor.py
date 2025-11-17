"""
NLP Intent Extraction Service for Natural Language Query Processing

This service uses GPT-4o-mini to extract structured intents from user queries.
It parses natural language requests and converts them into actionable recommendation filters.
"""

import json
import logging
import os
from typing import Dict, List, Optional, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class FoodIntentConstraints(BaseModel):
    """Structured constraints extracted from user query"""
    distance: Optional[str] = Field(None, description="Distance preference: 'very_near', 'near', 'moderate', 'far'")
    price: Optional[str] = Field(None, description="Price preference: 'very_cheap', 'cheap', 'moderate', 'expensive', 'very_expensive'")
    time_to_eat: Optional[str] = Field(None, description="Time context: 'breakfast', 'lunch', 'dinner', 'late_night'")


class FoodIntentQuery(BaseModel):
    """Structured intent extracted from natural language query"""
    preferred_tastes: List[str] = Field(default_factory=list, description="Tastes user wants: spicy, sweet, salty, sour, bitter, umami, savory, etc.")
    avoid_tastes: List[str] = Field(default_factory=list, description="Tastes to avoid")
    categories: List[str] = Field(default_factory=list, description="Food categories or cuisines: soup, stew, noodle, rice, grilled, fried, etc.")
    texture: List[str] = Field(default_factory=list, description="Desired textures: light, heavy, crispy, soft, smooth, chewy, etc.")
    ingredients: List[str] = Field(default_factory=list, description="Preferred ingredients or dishes")
    mood: Optional[str] = Field(None, description="User mood/context: 'comforting', 'light', 'adventurous', 'quick', 'healthy', etc.")
    constraints: FoodIntentConstraints = Field(default_factory=FoodIntentConstraints)


class NLPIntentExtractor:
    """
    Extracts structured food intents from natural language queries using GPT-4o-mini.

    Example:
        extractor = NLPIntentExtractor()
        query = "뜨끈한 국물과 매운맛이 있는 국밥"
        intent = extractor.extract_intent(query)
        # Returns structured intent with preferred_tastes, categories, etc.
    """

    def __init__(self, model_name: str = "gpt-4o-mini"):
        """Initialize the intent extractor with GPT model."""
        try:
            self.llm = ChatOpenAI(
                model=model_name,
                temperature=0.1,  # Low temperature for consistent output
                max_tokens=1024,
            )
            logger.info(f"Initialized NLPIntentExtractor with model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize ChatOpenAI: {e}")
            raise

    def extract_intent(self, query: str) -> Optional[FoodIntentQuery]:
        """
        Extract structured intent from natural language food query.

        Args:
            query: Natural language query in Korean or English

        Returns:
            FoodIntentQuery with extracted intents, or None if extraction fails
        """
        if not query or not query.strip():
            logger.warning("Empty query provided to extract_intent")
            return FoodIntentQuery()

        try:
            # Create prompt
            prompt_template = self._get_prompt_template()
            prompt = PromptTemplate(
                template=prompt_template,
                input_variables=["query"],
            )

            # Execute LLM call
            formatted_prompt = prompt.format(query=query)
            response = self.llm.invoke(formatted_prompt)

            # Extract content from response
            result_text = response.content if hasattr(response, 'content') else str(response)

            # Parse JSON from response
            import re
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result_dict = json.loads(json_match.group())
            else:
                logger.warning(f"No JSON found in LLM response: {result_text}")
                return FoodIntentQuery()

            # Validate and create FoodIntentQuery
            intent = FoodIntentQuery(**result_dict)
            logger.info(f"Successfully extracted intent from query: {query}")
            logger.debug(f"Extracted intent: {intent}")
            return intent

        except Exception as e:
            logger.error(f"Error extracting intent from query '{query}': {e}")
            # Return empty intent on error instead of failing
            return FoodIntentQuery()

    def _get_prompt_template(self) -> str:
        """Get the prompt template for intent extraction."""
        return """You are a Korean food recommendation assistant.
Extract structured food preferences and constraints from the user's natural language query.

Query: {query}

Parse the query and extract:
1. preferred_tastes: List of taste preferences (e.g., "spicy", "sweet", "umami")
2. avoid_tastes: Tastes to avoid
3. categories: Food categories or cuisine types
4. texture: Desired food textures
5. ingredients: Specific ingredients or dishes mentioned
6. mood: User's mood or context (comforting, light, quick, etc.)
7. constraints: Distance, price, time preferences

Return ONLY valid JSON matching this structure:
{{
    "preferred_tastes": ["taste1", "taste2"],
    "avoid_tastes": ["taste3"],
    "categories": ["category1"],
    "texture": ["texture1"],
    "ingredients": ["ingredient1"],
    "mood": "mood_type",
    "constraints": {{
        "distance": "near",
        "price": "moderate",
        "time_to_eat": "lunch"
    }}
}}

If a field is not mentioned in the query, use empty list [] or null.
Focus on extracting Korean food-specific terms accurately."""


class QueryEmbeddingFuser:
    """Fuses context query embeddings with user embeddings for enhanced recommendations."""

    def __init__(self, embedding_model_name: Optional[str] = None):
        """Initialize embedding model for Korean text using cached instance."""
        try:
            # Get model name from parameter, environment, or use default
            if embedding_model_name is None:
                embedding_model_name = os.environ.get('EMBEDDING_MODEL_NAME', 'BM-K/KoSimCSE-roberta')

            # Import and use cached model from unified_embeddings
            from .unified_embeddings import get_cached_sentence_transformer
            self.embedding_model = get_cached_sentence_transformer(embedding_model_name)
            logger.info(f"Initialized QueryEmbeddingFuser with model: {embedding_model_name}")
        except Exception as e:
            logger.warning(f"Failed to initialize embedding model: {e}")
            logger.warning("Continuing with fallback embeddings (random vectors)")
            self.embedding_model = None

    def create_context_embedding(self, query: str) -> Optional[List[float]]:
        """
        Create embedding for query context.

        Args:
            query: Natural language query

        Returns:
            Embedding vector as list of floats
        """
        if not query or not self.embedding_model:
            return None

        try:
            embedding = self.embedding_model.encode(query, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error creating context embedding: {e}")
            return None

    @staticmethod
    def fuse_embeddings(
        user_embedding: List[float],
        context_embedding: List[float],
        user_weight: float = 0.7,
        context_weight: float = 0.3,
    ) -> List[float]:
        """
        Fuse user embedding with context embedding.

        Args:
            user_embedding: User preference embedding
            context_embedding: Query context embedding
            user_weight: Weight for user embedding (default 0.7)
            context_weight: Weight for context embedding (default 0.3)

        Returns:
            Fused embedding vector
        """
        if not user_embedding or not context_embedding:
            return user_embedding or context_embedding

        try:
            import numpy as np
            user_vec = np.array(user_embedding)
            context_vec = np.array(context_embedding)

            # Normalize both vectors
            user_vec = user_vec / (np.linalg.norm(user_vec) + 1e-10)
            context_vec = context_vec / (np.linalg.norm(context_vec) + 1e-10)

            # Fuse vectors
            fused = user_weight * user_vec + context_weight * context_vec

            # Normalize result
            fused = fused / (np.linalg.norm(fused) + 1e-10)

            return fused.tolist()
        except Exception as e:
            logger.error(f"Error fusing embeddings: {e}")
            return user_embedding


# Singleton instances
_intent_extractor = None
_embedding_fuser = None


def get_intent_extractor() -> Optional[NLPIntentExtractor]:
    """Get or initialize the intent extractor."""
    global _intent_extractor
    if _intent_extractor is None:
        try:
            _intent_extractor = NLPIntentExtractor()
        except Exception as e:
            logger.warning(f"NLPIntentExtractor unavailable (expected if OPENAI_API_KEY not set): {e}")
    return _intent_extractor


def get_embedding_fuser() -> Optional[QueryEmbeddingFuser]:
    """Get or initialize the embedding fuser."""
    global _embedding_fuser
    if _embedding_fuser is None:
        try:
            _embedding_fuser = QueryEmbeddingFuser()
        except Exception as e:
            logger.warning(f"QueryEmbeddingFuser unavailable (expected if OPENAI_API_KEY not set): {e}")
    return _embedding_fuser
