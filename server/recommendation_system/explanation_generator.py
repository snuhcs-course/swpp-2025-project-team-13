"""
Recommendation Explanation Generator

Generates friendly Korean explanations for why a menu is recommended
based on reason features and user context.
"""

import json
import logging
from typing import Dict, List, Optional, Tuple
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

logger = logging.getLogger(__name__)


class ExplanationGenerator:
    """
    Generates natural language explanations for food recommendations.

    Uses GPT-4o-mini to create friendly Korean explanations based on
    reason features and user context.
    """

    def __init__(self, model_name: str = "gpt-4o-mini"):
        """Initialize the explanation generator."""
        try:
            self.llm = ChatOpenAI(
                model=model_name,
                temperature=0.7,  # Slightly higher for more natural language
                max_tokens=150,
            )
            logger.info(f"Initialized ExplanationGenerator with model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize ChatOpenAI: {e}")
            raise

    def generate_explanation(
        self,
        menu_name: str,
        restaurant_name: str,
        reason_features: Dict[str, float],
        user_query: Optional[str] = None,
        taste_info: Optional[Dict] = None,
    ) -> Tuple[str, List[str]]:
        """
        Generate explanation and identify top reason keys.

        Args:
            menu_name: Name of the menu item
            restaurant_name: Name of the restaurant
            reason_features: Dict of reason feature scores
            user_query: Optional user's natural language query
            taste_info: Optional user taste preferences

        Returns:
            Tuple of (explanation, top_reason_keys)
        """
        try:
            # Identify top 3 contributing reasons
            top_reasons = self._get_top_reasons(reason_features)
            reason_text = self._format_reason_features(reason_features)
            taste_text = self._format_taste_info(taste_info)

            # Create prompt
            prompt_template = self._get_prompt_template()
            prompt = PromptTemplate(
                template=prompt_template,
                input_variables=["menu_name", "restaurant_name", "reason_text", "query", "taste_info"],
            )

            # Format and execute
            formatted_prompt = prompt.format(
                menu_name=menu_name,
                restaurant_name=restaurant_name,
                reason_text=reason_text,
                query=user_query or "No specific query",
                taste_info=taste_text,
            )

            response = self.llm.invoke(formatted_prompt)
            explanation = response.content if hasattr(response, 'content') else str(response)

            # Clean up explanation
            explanation = explanation.strip().strip('"').strip("'")

            logger.info(f"Generated explanation for {menu_name} @ {restaurant_name}")
            logger.debug(f"Explanation: {explanation}")

            return explanation, top_reasons

        except Exception as e:
            logger.error(f"Error generating explanation: {e}")
            # Return fallback explanation
            fallback = f"{menu_name}은/는 추천할 만한 좋은 음식입니다."
            return fallback, self._get_top_reasons(reason_features)

    def _get_top_reasons(self, reason_features: Dict[str, float]) -> List[str]:
        """Get top 3 reason keys sorted by score."""
        sorted_reasons = sorted(
            reason_features.items(),
            key=lambda x: x[1],
            reverse=True
        )
        return [reason[0] for reason in sorted_reasons[:3]]

    def _format_reason_features(self, reason_features: Dict[str, float]) -> str:
        """Format reason features for prompt."""
        feature_names = {
            'semantic_similarity': '의미론적 유사도',
            'image_similarity': '이미지 유사도',
            'category_match_score': '카테고리 일치도',
            'taste_alignment': '맛 선호도 일치',
            'query_alignment': '질문과의 일치도',
            'temporal_fit_score': '시간대 적합성',
            'distance_score': '거리 적합성',
            'popularity_score': '인기도/평점',
        }

        formatted = []
        for key, score in reason_features.items():
            label = feature_names.get(key, key)
            percentage = int(score * 100)
            if percentage > 10:  # Only include meaningful scores
                formatted.append(f"- {label}: {percentage}%")

        return "\n".join(formatted) if formatted else "- 종합적으로 추천됨"

    def _format_taste_info(self, taste_info: Optional[Dict]) -> str:
        """Format taste profile for prompt."""
        if not taste_info:
            return "기본 취향"

        formatted = []
        if 'spicy_level' in taste_info:
            formatted.append(f"매운맛 수준: {taste_info['spicy_level']}/10")
        if 'sweet_level' in taste_info:
            formatted.append(f"단맛 수준: {taste_info['sweet_level']}/10")
        if 'salty_level' in taste_info:
            formatted.append(f"짠맛 수준: {taste_info['salty_level']}/10")
        if 'favorite_cuisines' in taste_info and taste_info['favorite_cuisines']:
            formatted.append(f"선호 요리: {', '.join(taste_info['favorite_cuisines'])}")

        return " | ".join(formatted) if formatted else "기본 취향"

    def _get_prompt_template(self) -> str:
        """Get the prompt template for explanation generation."""
        return """당신은 음식 추천 설명을 생성하는 친절한 AI 어시스턴트입니다.

메뉴: {menu_name}
음식점: {restaurant_name}

추천 이유 분석:
{reason_text}

사용자 요청: {query}
사용자 취향: {taste_info}

위 정보를 바탕으로 사용자가 이 메뉴를 왜 좋아할 만한지를 설명하는 짧고 친절한 한국어 문장 하나를 작성해주세요.

예시:
- "뜨끈한 국물과 감칠맛이 좋아 추천해요."
- "당신의 취향에 딱 맞는 매운 음식입니다."
- "최근 인기 있는 음식점에서 제공하는 건강한 식사예요."

설명:"""


class ReasonFeatureCalculator:
    """Calculate reason features for recommendations."""

    @staticmethod
    def calculate_features(
        menu: Dict,
        user_preferences: Dict,
        user_query_intent: Optional[Dict] = None,
        similarity_scores: Optional[Dict] = None,
    ) -> Dict[str, float]:
        """
        Calculate reason features for a menu recommendation.

        Args:
            menu: Menu data
            user_preferences: User preference data
            user_query_intent: Extracted intent from user query
            similarity_scores: Pre-calculated similarity scores

        Returns:
            Dict of reason feature scores (0.0-1.0)
        """
        features = {
            'semantic_similarity': 0.0,
            'image_similarity': 0.0,
            'category_match_score': 0.0,
            'taste_alignment': 0.0,
            'query_alignment': 0.0,
            'temporal_fit_score': 0.0,
            'distance_score': 0.0,
            'popularity_score': 0.0,
        }

        # Semantic similarity (from similarity_scores if provided)
        if similarity_scores and 'text_similarity' in similarity_scores:
            features['semantic_similarity'] = min(1.0, similarity_scores['text_similarity'])

        # Image similarity (from similarity_scores if provided)
        if similarity_scores and 'image_similarity' in similarity_scores:
            features['image_similarity'] = min(1.0, similarity_scores['image_similarity'])

        # Category match score
        menu_category = (menu.get('category') or '').lower()
        user_categories = user_preferences.get('favorite_cuisines', []) or []
        if user_categories and any((cat or '').lower() in menu_category for cat in user_categories if cat):
            features['category_match_score'] = 0.9
        elif user_categories:
            features['category_match_score'] = 0.3

        # Taste alignment (simplified)
        features['taste_alignment'] = 0.6  # Neutral default

        # Query alignment (if intent is provided)
        if user_query_intent:
            intent_categories = user_query_intent.get('categories', []) or []
            if intent_categories and any((cat or '').lower() in menu_category for cat in intent_categories if cat):
                features['query_alignment'] = 0.95

        # Temporal fit score (simplified - would need actual time context)
        features['temporal_fit_score'] = 0.5

        # Distance score (simplified - would need actual distance data)
        features['distance_score'] = 0.7

        # Popularity score (simplified - would need actual rating/review data)
        try:
            rating_raw = menu.get('rating')
            rating = float(rating_raw) if rating_raw is not None else 3.5

            review_count_raw = menu.get('review_count')
            review_count = int(review_count_raw) if review_count_raw is not None else 0

            # Ensure numeric types for division
            rating = float(rating)
            review_count = int(review_count)

            if review_count > 50:
                features['popularity_score'] = min(1.0, (float(rating) / 5.0) * 0.9)
            else:
                features['popularity_score'] = 0.3
        except (ValueError, TypeError):
            # If conversion fails, use default
            features['popularity_score'] = 0.3

        return features


# Singleton instance
_explanation_generator = None
_reason_calculator = None


def get_explanation_generator() -> Optional[ExplanationGenerator]:
    """Get or initialize the explanation generator."""
    global _explanation_generator
    if _explanation_generator is None:
        try:
            _explanation_generator = ExplanationGenerator()
        except Exception as e:
            logger.warning(f"ExplanationGenerator unavailable (expected if OPENAI_API_KEY not set): {e}")
    return _explanation_generator


def get_reason_calculator() -> ReasonFeatureCalculator:
    """Get the reason feature calculator."""
    global _reason_calculator
    if _reason_calculator is None:
        _reason_calculator = ReasonFeatureCalculator()
    return _reason_calculator
