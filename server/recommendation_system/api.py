"""
추천 API 엔드포인트

이 모듈은 Django REST Framework를 이용한 추천 API를 구현합니다.
"""

import json
import logging
import random
from collections import defaultdict
from typing import Dict, List, Optional, Tuple, Any, Generator
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from django.db import IntegrityError, DataError, DatabaseError
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .user_profile import UserProfileService, create_sample_user_profile
from .scoring import SearchContext, HybridScorer, MMRReranker, RecommendationReranker
from .nlp_intent_extractor import get_intent_extractor, get_embedding_fuser
from .explanation_generator import get_explanation_generator, get_reason_calculator
from .unified_embeddings import (
    get_menu_embedding_pipeline,
    get_user_embedding_aggregator,
    calculate_embedding_similarity
)
from .rl_scoring import get_rl_scorer, ScoringWeights
from .scoring_strategy import ScoringContext, HybridScoringStrategy
# ChromaDB 관련 import (더 이상 사용 안함 - client.py로 대체)
# from . import EmbeddingService, VectorIndexBuilder, RecommendationEngine
from users.models import UserPreference
from recommendation.models import MenuReasonFeatures, MenuExternalMapping, RestaurantExternalMapping
from menu.models import Menu
from restaurant.models import Restaurant

logger = logging.getLogger(__name__)


def _generate_menu_specific_reason(menu_data: Dict, user_prefs: Dict) -> str:
    """Generate a personalized reason based on specific menu characteristics"""
    menu_name = menu_data.get('name', '메뉴')
    menu_category = menu_data.get('category', '')
    restaurant_name = menu_data.get('restaurant_name', '식당')
    keywords = menu_data.get('keywords', [])
    price = menu_data.get('price', 0)
    
    reason_parts = []
    
    # 1. Menu name and restaurant-specific reason
    reason_parts.append(f"'{menu_name}'은(는) {restaurant_name}의 대표 메뉴로")
    
    # 2. Category matching
    preferred_categories = user_prefs.get('preferred_categories', [])
    if menu_category and any(cat.lower() in menu_category.lower() for cat in preferred_categories):
        reason_parts.append(f"좋아하시는 {menu_category} 카테고리에 속하며")
    
    # 3. Menu name-based taste analysis (since keywords aren't available)
    menu_name_lower = menu_name.lower()
    taste_prefs = user_prefs.get('taste_preferences', {})
    taste_matches = []
    
    # Analyze menu name for taste indicators
    if taste_prefs.get('spicy', 3) > 3 and any(spicy_word in menu_name for spicy_word in ['김치', '불', '매운', '고추', '칠리']):
        taste_matches.append("매운맛 선호도")
    if taste_prefs.get('sweet', 3) > 3 and any(sweet_word in menu_name for sweet_word in ['달콤', '단맛', '꿀', '당근', '고구마']):
        taste_matches.append("단맛 선호도")
    if taste_prefs.get('salty', 3) > 3 and any(salty_word in menu_name for salty_word in ['짠', '염장', '젓갈', '간장']):
        taste_matches.append("짠맛 선호도")
        
    if taste_matches:
        reason_parts.append(f"당신의 {', '.join(taste_matches)}와 잘 맞습니다")
    else:
        reason_parts.append("균형잡힌 맛으로 당신의 취향에 적합합니다")
    
    # 5. Price consideration
    budget_range = user_prefs.get('budget_range', [0, 0])
    if budget_range[0] > 0 and budget_range[1] > 0:
        if budget_range[0] <= price <= budget_range[1]:
            reason_parts.append(f"예산 범위({budget_range[0]:,}원~{budget_range[1]:,}원)에도 맞아")
    
    # Combine all reasons
    final_reason = " ".join(reason_parts) + " 추천드립니다."
    return final_reason


def _generate_openai_reason(menu_data: Dict, user_prefs: Dict) -> str:
    """Generate a personalized reason using OpenAI"""
    try:
        # Get the explanation generator
        explanation_generator = get_explanation_generator()
        if not explanation_generator:
            # Fallback to manual reason if OpenAI is not available
            return _generate_menu_specific_reason(menu_data, user_prefs)
            
        # Get reason calculator for features
        reason_calculator = get_reason_calculator()
        
        # Calculate reason features based on menu and user data
        reason_features = reason_calculator.calculate_features(
            menu_data, 
            user_prefs,
            user_query_intent=None,  # Could be passed from Phase 1 if available
            similarity_scores=None   # Could include similarity scores if available
        )
        
        # Extract taste info from user preferences
        taste_info = {
            'spicy_level': user_prefs.get('taste_preferences', {}).get('spicy', 5),
            'sweet_level': user_prefs.get('taste_preferences', {}).get('sweet', 5), 
            'salty_level': user_prefs.get('taste_preferences', {}).get('salty', 5),
            'favorite_cuisines': user_prefs.get('preferred_categories', [])
        }
        
        # Generate explanation using OpenAI
        explanation, top_reasons = explanation_generator.generate_explanation(
            menu_name=menu_data.get('name', '메뉴'),
            restaurant_name=menu_data.get('restaurant_name', '음식점'),
            reason_features=reason_features,
            user_query=None,  # Could be passed from Phase 1 if available
            taste_info=taste_info
        )
        
        logger.info(f"Generated OpenAI reason for {menu_data.get('name')}: {explanation}")
        return explanation
        
    except Exception as e:
        logger.warning(f"OpenAI reason generation failed for menu {menu_data.get('id')}: {e}")
        # Fallback to template-based reason
        return _generate_menu_specific_reason(menu_data, user_prefs)


def _generate_generic_reason(user_prefs: Dict) -> str:
    """Generate a generic reason based only on user preferences"""
    preferred_categories = user_prefs.get('preferred_categories', [])
    taste_prefs = user_prefs.get('taste_preferences', {})
    
    if preferred_categories:
        base_reason = f"당신이 선호하는 {', '.join(preferred_categories[:2])} 종류의 음식과 잘 맞는 메뉴입니다."
    else:
        base_reason = "당신의 취향을 분석한 결과 추천된 메뉴입니다."
    
    # Add taste preferences
    taste_reasons = []
    if taste_prefs.get('spicy', 3) > 3:
        taste_reasons.append("매운맛을 좋아하시는 취향")
    if taste_prefs.get('sweet', 3) > 3:
        taste_reasons.append("단맛을 좋아하시는 취향")
    if taste_prefs.get('salty', 3) > 3:
        taste_reasons.append("짠맛을 좋아하시는 취향")
        
    if taste_reasons:
        base_reason += f" {', '.join(taste_reasons)}에 맞춰 선정되었습니다."
    else:
        base_reason += " 균형 잡힌 맛을 선호하시는 취향에 맞춰 선정되었습니다."
        
    return base_reason


class RecommendationStreamResponse(StreamingHttpResponse):
    """
    Custom streaming response that yields complete NDJSON lines with explicit
    separators to help WSGI servers recognize chunk boundaries and stream properly.
    """
    def __iter__(self):
        import sys
        for chunk in self.streaming_content:
            if isinstance(chunk, str):
                chunk = chunk.encode(self.charset or 'utf-8')
            # Yield the chunk as-is; WSGI will handle transmission
            yield chunk
            # Force immediate flushing to ensure real-time streaming
            sys.stdout.flush()
            sys.stderr.flush()


# Request deduplication cache: tracks recent recommendation requests
# Format: {user_id: {location_hash: timestamp}}
# Prevents duplicate processing if same user makes identical request within 5 seconds
_recent_requests: Dict[int, Dict[str, float]] = defaultdict(dict)
_REQUEST_DEDUP_WINDOW = 5.0  # seconds - increased to allow for debouncing on frontend


def _get_request_key(location: List[float], max_results: int) -> str:
    """Generate a unique key for a request."""
    return f"{location[0]:.4f}_{location[1]:.4f}_{max_results}"


def _is_duplicate_request(user_id: int, location: List[float], max_results: int) -> bool:
    """Check if this is a duplicate request within the deduplication window."""
    import time

    request_key = _get_request_key(location, max_results)
    current_time = time.time()

    # Get user's recent requests
    user_requests = _recent_requests[user_id]

    # Check if we've seen this request recently
    if request_key in user_requests:
        last_request_time = user_requests[request_key]
        if (current_time - last_request_time) < _REQUEST_DEDUP_WINDOW:
            logger.warning(f"Duplicate request detected for user {user_id} - request key: {request_key}")
            return True

    # Record this request
    user_requests[request_key] = current_time

    # Cleanup old entries (keep only last 10 requests per user)
    if len(user_requests) > 10:
        oldest_key = min(user_requests.keys(), key=lambda k: user_requests[k])
        del user_requests[oldest_key]

    return False


# ===== UUID Mapping Helper Functions =====
def get_or_create_menu_with_mapping(external_uuid: str, menu_data: Dict) -> Tuple[Optional[Menu], bool]:
    """
    Get or create a Menu record and link it to external UUID.

    Args:
        external_uuid: UUID from external database
        menu_data: Menu data dict with name, category, etc.

    Returns:
        (Menu object, created_bool) or (None, False) if fails
    """
    try:
        # First try to find by mapping
        mapping = MenuExternalMapping.objects.select_related('menu').filter(
            external_uuid=external_uuid
        ).first()

        if mapping:
            return mapping.menu, False

        # If not found, create new Menu and mapping
        menu, created = Menu.objects.get_or_create(
            name=menu_data.get('name', ''),
            defaults={
                'category': menu_data.get('category', ''),
                'description': menu_data.get('description', ''),
                'image_url': menu_data.get('image_url', ''),
            }
        )

        # Create mapping
        MenuExternalMapping.objects.get_or_create(
            menu=menu,
            defaults={'external_uuid': external_uuid}
        )

        return menu, created
    except Exception as e:
        logger.warning(f"Failed to get/create menu mapping for {external_uuid}: {e}")
        return None, False


def get_or_create_restaurant_with_mapping(external_uuid: str, restaurant_data: Dict) -> Tuple[Optional[Restaurant], bool]:
    """
    Get or create a Restaurant record and link it to external UUID.

    Args:
        external_uuid: UUID from external database
        restaurant_data: Restaurant data dict with name, address, etc.

    Returns:
        (Restaurant object, created_bool) or (None, False) if fails
    """
    try:
        # First try to find by mapping
        mapping = RestaurantExternalMapping.objects.select_related('restaurant').filter(
            external_uuid=external_uuid
        ).first()

        if mapping:
            return mapping.restaurant, False

        # If not found, create new Restaurant and mapping
        # Use external_uuid as source to make it unique
        restaurant, created = Restaurant.objects.get_or_create(
            source=f"external_{external_uuid}",
            defaults={
                'name': restaurant_data.get('name', ''),
                'address': restaurant_data.get('address', ''),
                'phone': restaurant_data.get('phone', ''),
                'image_url': restaurant_data.get('image_url', ''),
            }
        )

        # Create mapping
        RestaurantExternalMapping.objects.get_or_create(
            restaurant=restaurant,
            defaults={'external_uuid': external_uuid}
        )

        return restaurant, created
    except Exception as e:
        logger.warning(f"Failed to get/create restaurant mapping for {external_uuid}: {e}")
        return None, False


# client.py 통합 (PostgreSQL + PostGIS 기반 추천)
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'psql', 'recommend'))
try:
    from psql.recommend.client import RestaurantRecommender, UserProfile as ClientUserProfile
except ImportError:
    logger.warning("client.py import 실패. 상대 경로로 재시도")
    try:
        import importlib.util
        client_path = os.path.join(os.path.dirname(__file__), '..', 'psql', 'recommend', 'client.py')
        spec = importlib.util.spec_from_file_location("client", client_path)
        client_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(client_module)
        RestaurantRecommender = client_module.RestaurantRecommender
        ClientUserProfile = client_module.UserProfile
    except Exception as e:
        logger.error(f"client.py import 실패: {e}")
        RestaurantRecommender = None
        ClientUserProfile = None

def format_menu_item(
    menu: Dict,
    score: float,
    components: Any,
    explanation: str,
    enhanced_onboarding_data: Dict
) -> Dict:
    """Format a single menu item for response."""
    rating_raw = menu.get('rating')
    rating = float(rating_raw) if rating_raw is not None else 0.0

    review_count_raw = menu.get('review_count')
    review_count = int(review_count_raw) if review_count_raw is not None else 0

    category = menu.get('category', '')

    x_raw = menu.get('x')
    y_raw = menu.get('y')
    x = float(x_raw) if x_raw is not None else 0.0
    y = float(y_raw) if y_raw is not None else 0.0

    # Convert UUID objects to strings for JSON serialization
    menu_id = menu.get('id')
    restaurant_id = menu.get('restaurant_id')
    
    # Restaurant ID is now properly handled as UUID string

    return {
        'id': str(menu_id) if menu_id else None,
        'restaurant_id': str(restaurant_id) if restaurant_id else None,
        'menu_name': menu.get('name', ''),
        'place_name': menu.get('restaurant_name', ''),
        'price': menu.get('price', 0),
        'category': category,
        'location': menu.get('location', ''),
        'rating': rating,
        'review_count': review_count,
        'keywords': menu.get('keywords', []) if menu.get('keywords') else [],
        'voted_keywords': menu.get('voted_keywords', []) if menu.get('voted_keywords') else [],
        'has_image': bool(menu.get('images')),
        'image_urls': menu.get('images', []) if menu.get('images') else [],
        'coordinates': [x, y],
        'distance_meters': menu.get('distance_meters', 0),
        'score': score,
        'reason': explanation
    }


def process_query_context(query_text: str, onboarding_data: Dict, user) -> Dict[str, Any]:
    """
    Process natural language query to extract structured intents and enhance recommendations.

    Args:
        query_text: Natural language query from user
        onboarding_data: User's preference data
        user: Django user object for logging

    Returns:
        Dictionary with extracted intents and context info
    """
    context_info = {
        'original_query': query_text,
        'intent': None,
        'context_embedding': None,
        'enhanced_preferences': onboarding_data.copy()
    }

    if not query_text or not query_text.strip():
        return context_info

    try:
        # Extract intent from query
        intent_extractor = get_intent_extractor()
        if intent_extractor:
            intent = intent_extractor.extract_intent(query_text)
            context_info['intent'] = intent

            # Log the query interaction
            from users.models import UserInteraction
            UserInteraction.objects.create(
                user=user,
                interaction_type='view',  # View type for query
                reward_value=0.0,  # Neutral reward for query view
                context_query=query_text
            )
            logger.info(f"User {user.id} queried: {query_text}")

            # Enhance preferences based on extracted intent
            if intent:
                enhanced_prefs = context_info['enhanced_preferences'].copy()

                # Merge intent categories with user preferences
                if intent.categories:
                    existing_cats = set(enhanced_prefs.get('preferred_categories', []))
                    existing_cats.update(intent.categories)
                    enhanced_prefs['preferred_categories'] = list(existing_cats)

                # Add intent taste preferences
                if intent.preferred_tastes:
                    enhanced_prefs['intent_tastes'] = intent.preferred_tastes

                # Add avoid tastes
                if intent.avoid_tastes:
                    enhanced_prefs['avoid_tastes'] = intent.avoid_tastes

                # Store texture preferences
                if intent.texture:
                    enhanced_prefs['texture_preferences'] = intent.texture

                context_info['enhanced_preferences'] = enhanced_prefs
                logger.debug(f"Enhanced preferences based on intent: {enhanced_prefs}")

        # Create context embedding
        embedding_fuser = get_embedding_fuser()
        if embedding_fuser:
            context_emb = embedding_fuser.create_context_embedding(query_text)
            context_info['context_embedding'] = context_emb

    except Exception as e:
        logger.error(f"Error processing query context: {e}")
        # Continue with original preferences if processing fails

    return context_info


def calculate_menu_similarity(menu: Dict, onboarding_data: Dict, embedding_service = None) -> float:
    """
    메뉴와 사용자 선호도 간의 유사도 계산
    
    Args:
        menu: 메뉴 데이터
        onboarding_data: 사용자 온보딩 데이터
        embedding_service: 임베딩 서비스 (옵션, 없으면 키워드 매칭 사용)
    
    Returns:
        유사도 점수 (0.0 ~ 1.0)
    """
    try:
        score = 0.0
        weight_sum = 0.0
        
        # 1. 카테고리 매칭 (가중치: 0.4)
        preferred_categories = onboarding_data.get('preferred_categories', [])
        if preferred_categories:
            menu_category = menu.get('category', '')
            # category_normalized 사용
            menu_category_normalized = menu.get('category_normalized', menu_category)
            if menu_category_normalized in preferred_categories:
                score += 0.4
            weight_sum += 0.4
        
        # 2. 키워드 매칭 (가중치: 0.3)
        menu_keywords = menu.get('keywords', [])
        if menu_keywords and isinstance(menu_keywords, list):
            # 사용자 선호 키워드와 비교
            liked_keywords = set()
            if 'liked_menus' in onboarding_data:
                liked_keywords.update(onboarding_data['liked_menus'])
            if 'clicked_keywords' in onboarding_data:
                liked_keywords.update(onboarding_data['clicked_keywords'])
            
            if liked_keywords:
                menu_keywords_set = set(menu_keywords)
                overlap = len(menu_keywords_set.intersection(liked_keywords))
                if len(menu_keywords_set) > 0:
                    keyword_score = overlap / len(menu_keywords_set)
                    score += 0.3 * keyword_score
            weight_sum += 0.3
        
        # 3. 가격 적합도 (가중치: 0.2)
        budget_range = onboarding_data.get('budget_range', [0, 0])
        menu_price = menu.get('price', 0)
        if budget_range[0] > 0 or budget_range[1] > 0:
            if budget_range[0] <= menu_price <= budget_range[1]:
                score += 0.2
            elif menu_price < budget_range[0]:
                # 예산보다 저렴하면 부분 점수
                score += 0.1
            weight_sum += 0.2
        
        # 4. 임베딩 유사도 (옵션, 가중치: 0.1)
        if embedding_service and menu.get('embedding_vector'):
            # 사용자 프로필 텍스트와 메뉴 임베딩 비교
            # 향후 구현 가능
            weight_sum += 0.1
        
        # 정규화
        if weight_sum > 0:
            return score / weight_sum
        else:
            return 0.5  # 기본값
    
    except Exception as e:
        logger.error(f"유사도 계산 오류: {e}")
        return 0.5  # 기본값

# ===== 구버전 ChromaDB 기반 API (더 이상 사용 안함) =====
# client.py (PostgreSQL + PostGIS)로 대체됨
# class RecommendationAPIView(View):
#     """추천 API 뷰 - DEPRECATED"""
#     
#     def __init__(self):
#         super().__init__()
#         self.embedding_service = None
#         self.vector_index_builder = None
#         self.recommendation_engine = None
#         self.user_profile_service = UserProfileService()
#         self.reranker = RecommendationReranker()
#         self._initialize_services()
#     
#     def _initialize_services(self):
#         """서비스 초기화"""
#         try:
#             # 임베딩 서비스 초기화
#             self.embedding_service = EmbeddingService()
#             
#             # 벡터 인덱스 빌더 초기화
#             self.vector_index_builder = VectorIndexBuilder(self.embedding_service)
#             
#             # ChromaDB는 자동으로 인덱스 로드됨 (영구 저장소 사용)
#             
#             # 추천 엔진 초기화
#             self.recommendation_engine = RecommendationEngine(self.vector_index_builder)
#             
#             logger.info("추천 서비스 초기화 완료")
#             
#         except Exception as e:
#             logger.error(f"추천 서비스 초기화 실패: {e}")
#             raise
    
#     @method_decorator(csrf_exempt)
#     def dispatch(self, *args, **kwargs):
#         return super().dispatch(*args, **kwargs)
#     
#     def post(self, request):
#         """추천 요청 처리 - DEPRECATED"""
#         # ... (주석 처리됨)
#     
#     def _create_user_profile(self, data: Dict) -> str:
#         """사용자 프로필 생성 - DEPRECATED"""
#         # ... (주석 처리됨)
#     
#     def _create_search_context(self, data: Dict) -> SearchContext:
#         """검색 컨텍스트 생성 - DEPRECATED"""
#         # ... (주석 처리됨)
#     
#     def _search_menu_recommendations(self, user_profile_text: str, 
#                                    search_context: SearchContext, 
#                                    query_text: str, max_results: int) -> List[Dict]:
#         """메뉴 추천 검색 - DEPRECATED"""
#         # ... (주석 처리됨)
#     
#     def _search_place_recommendations(self, user_profile_text: str, 
#                                     search_context: SearchContext, 
#                                     query_text: str, max_results: int) -> List[Dict]:
#         """가게 추천 검색 - DEPRECATED"""
#         # ... (주석 처리됨)
# ===== 구버전 API 끝 =====

@require_http_methods(["POST"])
@csrf_exempt
def recommend_menu_phase1(request):
    """Phase 1: Get menu recommendations without reasons"""
    return _recommend_menu_internal(request, phase=1)

@require_http_methods(["POST"]) 
@csrf_exempt
def recommend_menu_phase2(request):
    """Phase 2: Get recommendation reasons for specific menus"""
    logger.info("🔥 Phase 2 endpoint called!")
    return _recommend_menu_internal(request, phase=2)

def _recommend_menu_internal(request, phase=None):
    """Internal function to handle menu recommendations for different phases"""
    # Manually check authentication
    if not request.user.is_authenticated:
        return JsonResponse({
            'error': 'Authentication required',
            'detail': 'You must be logged in to request recommendations'
        }, status=status.HTTP_401_UNAUTHORIZED)

    # Only allow POST requests
    if request.method != 'POST':
        return JsonResponse({
            'error': 'Method not allowed',
            'detail': 'Use POST request for recommendations'
        }, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    try:
        # 요청 데이터 파싱
        import json
        data = json.loads(request.body.decode('utf-8'))
        logger.info(f"=== 메뉴 추천 요청 시작 ===")
        logger.info(f"요청 데이터: {data}")

        # EARLY PHASE CHECK: Handle Phase 2 immediately without running full pipeline
        if phase == 2:
            # Phase 2: LIGHTWEIGHT reason generation only - bypass all heavy logic
            logger.info(f"🔥 Phase 2 Early Exit: 추천 이유만 생성 (전체 파이프라인 우회)")
            menu_ids = data.get('menu_ids', [])
            logger.info(f"Phase 2 요청된 메뉴 ID 개수: {len(menu_ids)}")
            
            if not menu_ids:
                logger.warning("Phase 2 요청에 menu_ids가 없습니다")
                return JsonResponse({
                    'error': 'menu_ids required for phase 2'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get user preferences for reason generation (without running full pipeline)
            try:
                from users.models import User
                user = request.user
                user_preference = UserPreference.objects.get(user=user)
                
                # Lightweight onboarding_data for reason generation only
                onboarding_data = {
                    'taste_preferences': {
                        'spicy': user_preference.spicy_level,
                        'sweet': user_preference.sweet_level,
                        'salty': user_preference.salty_level,
                    },
                    'preferred_categories': user_preference.favorite_cuisines,
                }
            except UserPreference.DoesNotExist:
                # Fallback to basic preferences
                onboarding_data = {
                    'taste_preferences': {'spicy': 3.0, 'sweet': 3.0, 'salty': 3.0},
                    'preferred_categories': [],
                }
            
            # Phase 2: LIGHTWEIGHT menu data fetch for reason generation only
            reason_updates = []
            
            try:
                # Lightweight database connection for menu details only
                recommender = RestaurantRecommender(verbose=False)
                menu_data_map = {}
                
                # Convert string IDs to UUIDs
                uuid_menu_ids = []
                for menu_id in menu_ids:
                    try:
                        import uuid
                        uuid_obj = uuid.UUID(menu_id)
                        uuid_menu_ids.append(uuid_obj)
                    except Exception as e:
                        logger.warning(f"Invalid menu ID format: {menu_id}")
                        continue
                
                if uuid_menu_ids:
                    # LIGHTWEIGHT query: fetch only menu details for reason generation
                    try:
                        with recommender.conn.cursor() as cursor:
                            # Simple query to get menu details - NO complex recommendation logic
                            query = """
                            SELECT m.id, m.name, m.description, m.price,
                                   r.name as restaurant_name, r.category as restaurant_category
                            FROM db_menus m
                            JOIN db_restaurants r ON m.restaurant_id = r.id
                            WHERE m.id = ANY(%s)
                            """
                            
                            cursor.execute(query, (uuid_menu_ids,))
                            menu_results = cursor.fetchall()
                        
                        for row in menu_results:
                            menu_id_str = str(row[0])
                                
                            menu_data_map[menu_id_str] = {
                                'id': row[0],
                                'name': row[1],
                                'description': row[2] or '',
                                'price': row[3],
                                'category': row[5] or '',  
                                'restaurant_name': row[4],
                                'restaurant_category': row[5] or '',
                                'keywords': []  
                            }
                        
                        logger.info(f"✅ Early Phase 2 - Lightweight fetch: got data for {len(menu_data_map)} menus")
                        
                    except Exception as db_error:
                        logger.warning(f"Early Phase 2 - Lightweight database query failed: {db_error}")
                        # Fallback to generic reasons if DB query fails
                
                # Generate ONLY personalized reasons based on menu data
                for menu_id in menu_ids:
                    try:
                        menu_data = menu_data_map.get(menu_id)
                        
                        if menu_data:
                            # Generate specific reason using OpenAI (lightweight)
                            explanation = _generate_openai_reason(
                                menu_data, onboarding_data
                            )
                        else:
                            # Fallback to generic reason
                            explanation = _generate_generic_reason(onboarding_data)
                            
                        reason_updates.append({
                            'menu_id': menu_id,
                            'reason': explanation
                        })
                        
                    except Exception as e:
                        logger.warning(f"Failed to generate reason for menu {menu_id}: {e}")
                        reason_updates.append({
                            'menu_id': menu_id, 
                            'reason': '당신의 취향에 맞춰 추천된 메뉴입니다.'
                        })
                
                try:
                    recommender.close()
                except:
                    pass
                        
                logger.info(f"🎉 Early Phase 2 완료: {len(reason_updates)}개 이유 생성 (전체 추천 시스템 완전 우회)")
                    
            except Exception as e:
                logger.error(f"Early Phase 2 error: {e}")
                # Generate fallback generic reasons for all menu IDs
                for menu_id in menu_ids:
                    reason_updates.append({
                        'menu_id': menu_id,
                        'reason': '당신의 취향에 맞춰 추천된 메뉴입니다.'
                    })
                
            return JsonResponse({
                'success': True,
                'reason_updates': reason_updates
            })

        # 필수 필드 검증 (user_id 제거) - Only for Phase 1 and streaming
        required_fields = ['user_location']
        for field in required_fields:
            if field not in data:
                logger.error(f"필수 필드 누락: {field}")
                return JsonResponse({
                    'error': f'필수 필드 누락: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Note: Frontend handles request deduplication via debouncing and pending request tracking
        # Backend dedup is disabled to allow legitimate streaming requests through
        user_location = data.get('user_location', [0, 0])
        max_results = data.get('maxResults', 10)

        # Uncomment below to enable backend deduplication if needed
        # if _is_duplicate_request(request.user.id, user_location, max_results):
        #     logger.warning(f"Rejecting duplicate request from user {request.user.id}")
        #     return JsonResponse({...}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # 사용자 프로필 생성
        user_profile_service = UserProfileService()
        user_id = request.user.username  # 인증된 사용자의 username 사용
        
        # DB에서 유저의 온보딩 정보 조회
        exploration_preference = 2.5  # 기본값
        try:
            # 커스텀 User 모델 사용
            from users.models import User
            user = request.user  # 이미 인증된 사용자
            user_preference = UserPreference.objects.get(user=user)
            
            # exploration_preference 가져오기
            exploration_preference = user_preference.exploration_preference
            
            # DB에서 가져온 정보로 onboarding_data 구성
            onboarding_data = {
                'taste_preferences': {
                    'spicy': user_preference.spicy_level,
                    'sweet': user_preference.sweet_level,
                    'salty': user_preference.salty_level,
                    'sour': 3.0,  # 기본값 (DB에 없는 필드)
                    'bitter': 3.0  # 기본값 (DB에 없는 필드)
                },
                'allergies': user_preference.allergies,
                'dislikes': user_preference.disliked_ingredients,
                'preferred_categories': user_preference.favorite_cuisines,
                'budget_range': data.get('budget_range', [0, 0]),  # API 파라미터에서 가져오거나 기본값
                'distance_preference': data.get('distance_preference', 2.0)  # API 파라미터에서 가져오거나 기본값
            }
        except UserPreference.DoesNotExist:
            # 온보딩 정보가 없는 경우 기본값 사용
            onboarding_data = {
                'taste_preferences': {
                    'spicy': 3.0,
                    'sweet': 3.0,
                    'salty': 3.0,
                    'sour': 3.0,
                    'bitter': 3.0
                },
                'allergies': [],
                'dislikes': [],
                'preferred_categories': [],
                'budget_range': data.get('budget_range', [0, 0]),
                'distance_preference': data.get('distance_preference', 2.0)
            }
        
        gallery_analysis = data.get('gallery_analysis')
        behavior_data = data.get('behavior_data')

        user_profile_text = user_profile_service.create_user_profile(
            user_id, onboarding_data, gallery_analysis, behavior_data
        )

        # Process query context: use user's profile image labels if no explicit query provided
        query_text = data.get('query_text', '')

        # If no explicit query text, aggregate image labels from user's profile
        if not query_text or not query_text.strip():
            try:
                from users.models import UserGalleryImage
                user_photos = UserGalleryImage.objects.filter(user=request.user)
                image_labels = []

                for photo in user_photos:
                    if photo.ai_label and photo.ai_label.strip():
                        label = photo.ai_label.strip()
                        if label and label not in image_labels:
                            image_labels.append(label)

                if image_labels:
                    query_text = ' AND '.join(image_labels)
                    logger.info(f"Auto-aggregated user image labels for recommendation: {query_text}")
            except Exception as e:
                logger.debug(f"Could not aggregate image labels: {e}")
                # Continue without query_text if image aggregation fails

        context_info = process_query_context(query_text, onboarding_data, request.user)
        enhanced_onboarding_data = context_info.get('enhanced_preferences', onboarding_data)

        # 검색 컨텍스트 생성 (쿼리 컨텍스트로 강화된 선호도 사용)
        search_context = SearchContext(
            user_location=tuple(data['user_location']),
            budget_range=tuple(enhanced_onboarding_data.get('budget_range', [0, 0])),
            max_distance=enhanced_onboarding_data.get('distance_preference', 2.0),
            allergies=enhanced_onboarding_data.get('allergies', []),
            dislikes=enhanced_onboarding_data.get('dislikes', []),
            preferred_categories=enhanced_onboarding_data.get('preferred_categories', []),
            time_of_day=data.get('time_of_day', '점심'),
            day_of_week=data.get('day_of_week', '평일')
        )

        # 추천 실행
        max_results = data.get('max_results', 20)

        # ===== client.py 기반 검색 (PostgreSQL + PostGIS) =====
        if RestaurantRecommender is None:
            return JsonResponse({
                'error': 'RestaurantRecommender를 사용할 수 없습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            # RestaurantRecommender 초기화
            recommender = RestaurantRecommender(verbose=False)
            
            # client.py용 UserProfile 생성
            client_profile = ClientUserProfile(
                location=(search_context.user_location[0], search_context.user_location[1]),
                cuisine_preferences=search_context.preferred_categories,
                max_distance_km=search_context.max_distance
            )
            
            # PostGIS 공간 쿼리로 근처 레스토랑 검색
            logger.info(f"근처 레스토랑 검색 중... (위치: {client_profile.location}, 반경: {search_context.max_distance}km)")
            
            restaurants = recommender.find_nearby_restaurants(
                client_profile,
                max_distance_km=search_context.max_distance,
                categories=search_context.preferred_categories,
                max_restaurants=100  # 충분한 후보 확보
            )
            logger.info(f"검색된 레스토랑 수: {len(restaurants) if restaurants else 0}")
            
            if not restaurants:
                logger.warning("주변에 레스토랑이 없습니다.")
                return JsonResponse({
                    'success': True,
                    'query_type': 'menu',
                    'total_results': 0,
                    'results': [],
                    'message': '주변에 레스토랑이 없습니다.'
                })
            
            # 메뉴 수집
            restaurant_ids = [r['id'] for r in restaurants]
            logger.info(f"레스토랑 ID 목록: {restaurant_ids[:10]}... (총 {len(restaurant_ids)}개)")
            logger.info("레스토랑 메뉴 가져오는 중...")
            restaurant_menus = recommender.get_restaurant_menus(restaurant_ids)
            logger.info(f"메뉴를 가져온 레스토랑 수: {len(restaurant_menus)}")
            
            # 모든 메뉴를 flat list로 변환
            all_menus = []
            # 레스토랑 ID로 distance_meters를 빠르게 조회하기 위한 dict 생성
            restaurant_distances = {str(r['id']): r.get('distance_meters', 0) for r in restaurants}
            
            for rest_id, menus in restaurant_menus.items():
                for menu in menus:
                    # 메뉴에 이미 레스토랑 정보가 포함되어 있음 (client.py의 JOIN 쿼리)
                    # distance_meters만 추가
                    menu['distance_meters'] = restaurant_distances.get(str(rest_id), 0)
                    all_menus.append(menu)
            
            logger.info(f"검색된 메뉴 수: {len(all_menus)}")
            
            # query_text가 있으면 필터링
            if query_text:
                filtered_menus = []
                query_lower = query_text.lower()
                for menu in all_menus:
                    menu_name = menu.get('name', '').lower()
                    restaurant_name = menu.get('restaurant_name', '').lower()
                    keywords = ' '.join(menu.get('keywords', [])).lower() if menu.get('keywords') else ''
                    
                    if query_lower in menu_name or query_lower in restaurant_name or query_lower in keywords:
                        filtered_menus.append(menu)
                
                if filtered_menus:
                    all_menus = filtered_menus
                    logger.info(f"쿼리 필터링 후 메뉴 수: {len(all_menus)}")
            
            # 메뉴가 없으면 빈 결과 반환
            if not all_menus:
                recommender.close()
                return JsonResponse({
                    'success': True,
                    'query_type': 'menu',
                    'total_results': 0,
                    'results': [],
                    'message': '조건에 맞는 메뉴가 없습니다.'
                })
            
        except Exception as e:
            logger.error(f"client.py 검색 오류: {e}")
            return JsonResponse({
                'error': f'검색 오류: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # ===== Strategy Pattern을 사용한 스코어링 =====
        # Scoring context 초기화 (자동으로 사용 가능한 최적의 strategy 선택)
        scoring_context = ScoringContext()

        # 사용자 embedding 생성
        user_embedding_aggregator = get_user_embedding_aggregator()
        user_embedding = None
        if user_embedding_aggregator:
            user_embedding = user_embedding_aggregator.create_user_embedding(
                user_preferences=enhanced_onboarding_data,
                favorite_cuisines=enhanced_onboarding_data.get('preferred_categories', [])
            )

        # 사용자의 RL weight vector 가져오기
        rl_weights = None
        try:
            user_pref = UserPreference.objects.get(user=request.user)
            if user_pref.rl_weight_vector and len(user_pref.rl_weight_vector) >= 7:
                rl_weights = ScoringWeights.from_list(user_pref.rl_weight_vector)
        except (UserPreference.DoesNotExist, Exception) as e:
            logger.debug(f"Could not load RL weights, using defaults: {e}")

        # 메뉴 embedding 생성 및 스코어링
        menu_embedding_pipeline = get_menu_embedding_pipeline()
        scored_results = []

        # Process menus without progress bar logging
        for menu in all_menus:
            # 메뉴 embedding 생성
            menu_embedding = None
            if menu_embedding_pipeline:
                menu_embedding = menu_embedding_pipeline.create_menu_embedding(
                    menu_name=menu.get('name', ''),
                    description=menu.get('description', ''),
                    category=menu.get('category', ''),
                    ingredients=menu.get('ingredients', []) if menu.get('ingredients') else None
                )

            # 사용자 위치가 있으면 tuple로 변환
            user_location = None
            if 'user_location' in data:
                user_location = tuple(data['user_location'])

            # Text similarity 계산 (HybridScorer fallback을 위해)
            similarity_score = calculate_menu_similarity(menu, enhanced_onboarding_data)

            # Strategy Pattern을 사용한 점수 계산
            final_score, components = scoring_context.calculate_score(
                menu=menu,
                user_prefs=enhanced_onboarding_data,
                search_context=search_context,
                text_similarity=similarity_score,
                user_embedding=user_embedding,
                menu_embedding=menu_embedding,
                query_context=context_info.get('intent').__dict__ if context_info.get('intent') else None,
                user_location=user_location,
                weights=rl_weights,
            )

            scored_results.append((menu, final_score, components))
        
        # ===== 음식점별 다양성 보장 로직 =====
        # 1. 스코어 순으로 정렬
        scored_results.sort(key=lambda x: x[1], reverse=True)

        # 2. 음식점별로 그룹화 (restaurant_id 기준)
        restaurant_groups = defaultdict(list)
        for menu, score, components in scored_results:
            # restaurant_id가 있으면 그것을 사용, 없으면 restaurant_name 사용
            rest_id = menu.get('restaurant_id') or menu.get('restaurant_name', 'unknown')
            restaurant_groups[rest_id].append((menu, score, components))
        
        logger.info(f"검색된 메뉴를 {len(restaurant_groups)}개 음식점으로 그룹화")
        
        # 3. 각 음식점에서 하나씩 선택 (라운드 로빈 방식)
        final_results = []
        restaurant_ids = list(restaurant_groups.keys())

        # 음식점 순서를 랜덤화 (매번 다른 순서로)
        random.shuffle(restaurant_ids)

        round_idx = 0
        while len(final_results) < max_results and restaurant_ids:
            selected_in_this_round = False

            for rest_id in restaurant_ids[:]:  # 복사본으로 순회
                if rest_id not in restaurant_groups or not restaurant_groups[rest_id]:
                    # 이 음식점의 메뉴를 모두 소진함
                    restaurant_ids.remove(rest_id)
                    continue

                # 이 음식점에서 아직 선택 안 한 메뉴 중 랜덤으로 하나 선택
                # (단, 스코어가 높은 것 우선 - 상위 3개 중에서 랜덤)
                available_menus = restaurant_groups[rest_id]
                if available_menus:
                    # 상위 3개 중에서 랜덤 선택 (다양성 + 품질 균형)
                    top_k = min(3, len(available_menus))
                    selected_item = random.choice(available_menus[:top_k])
                    final_results.append(selected_item)
                    restaurant_groups[rest_id].remove(selected_item)
                    selected_in_this_round = True

                if len(final_results) >= max_results:
                    break

            # 이번 라운드에서 아무것도 선택 안 했으면 중단
            if not selected_in_this_round:
                break

            round_idx += 1

        logger.info(f"음식점 다양성 보장: {round_idx}라운드 진행, 최종 {len(final_results)}개 메뉴 선택")

        # Phase 1: Stream menu information without reasons
        def stream_phase1_recommendations():
            """Stream menu recommendations without reasons (Phase 1)"""
            import time
            result_count = 0

            # Get user preferences summary for contextualized messages
            user_prefs_summary = []
            if enhanced_onboarding_data:
                cuisines = enhanced_onboarding_data.get('preferred_categories', [])
                if cuisines:
                    user_prefs_summary.append(f"선호 요리: {', '.join(cuisines[:2])}")
                
                taste_prefs = enhanced_onboarding_data.get('taste_preferences', {})
                if taste_prefs:
                    taste_desc = []
                    if taste_prefs.get('spicy', 3) > 3: taste_desc.append("매운맛")
                    if taste_prefs.get('sweet', 3) > 3: taste_desc.append("단맛") 
                    if taste_prefs.get('salty', 3) > 3: taste_desc.append("짠맛")
                    if taste_desc:
                        user_prefs_summary.append(f"선호 맛: {', '.join(taste_desc)}")
            
            prefs_text = " / ".join(user_prefs_summary[:2]) if user_prefs_summary else "당신의 취향"

            # Send initial progress status: analyzing preferences
            initial_progress_chunk = json.dumps({
                'type': 'progress',
                'message': f"{prefs_text}을 분석 중입니다"
            }) + '\n'
            yield initial_progress_chunk
            import sys
            sys.stdout.flush()
            sys.stderr.flush()
            time.sleep(0.3)

            # Send second progress status: finding restaurants
            restaurant_progress_chunk = json.dumps({
                'type': 'progress',
                'message': "식당을 탐색하는 중입니다"
            }) + '\n'
            yield restaurant_progress_chunk
            sys.stdout.flush()
            sys.stderr.flush()
            time.sleep(0.3)

            # 첫 메타데이터 스트림
            metadata_chunk = json.dumps({
                'type': 'metadata',
                'success': True,
                'query_type': 'menu',
                'total_results': len(final_results)
            }) + '\n'
            
            # Force immediate delivery of metadata
            yield metadata_chunk
            sys.stdout.flush()
            sys.stderr.flush()
            
            logger.debug(f"Streaming metadata: {len(final_results)} results")

            # Send progress status: menu selection phase
            progress_chunk = json.dumps({
                'type': 'progress',
                'message': f"{prefs_text} 기준에 맞춰 메뉴를 선정하는 중입니다"
            }) + '\n'
            yield progress_chunk
            sys.stdout.flush()
            sys.stderr.flush()
            time.sleep(0.2)  # Brief delay to show progress

            # Phase 1: 즉시 메뉴 정보 스트리밍 (추천 이유 없이)
            for menu, score, components in final_results:
                # 기본 정보만으로 메뉴 아이템 포맷 (추천 이유 없음)
                formatted_item = format_menu_item(menu, score, components, None, enhanced_onboarding_data)
                chunk = json.dumps({
                    'type': 'result',
                    'item': formatted_item
                }) + '\n'
                
                # Force immediate streaming for each menu item
                yield chunk
                
                # Force system flush to ensure immediate delivery
                import sys
                sys.stdout.flush()
                sys.stderr.flush()
                
                result_count += 1

            logger.info(f"Phase 1 완료: {result_count}개 메뉴 정보 스트리밍")

            # Send Phase 1 completion signal - this will hide loading screen and show food images
            phase1_complete_chunk = json.dumps({
                'type': 'phase1_complete',
                'message': f"Phase 1 완료: {result_count}개 메뉴 표시"
            }) + '\n'
            yield phase1_complete_chunk
            sys.stdout.flush()
            sys.stderr.flush()
            time.sleep(0.1)  # Brief pause before starting Phase 2

        # Phase 2: Stream recommendation reasons (currently commented out)
        def stream_phase2_reasons():
            """Stream recommendation reasons using OpenAI (Phase 2) - DISABLED"""
            import time
            reason_calculator = get_reason_calculator()

            # # Phase 2: 추천 이유 생성 및 스트리밍 (각 메뉴별로 개별 생성)
            # logger.info("Phase 2 시작: 추천 이유 생성")
            # 
            # # Re-enable explanation generator for Phase 2
            # explanation_generator = get_explanation_generator()
            # 
            # for idx, (menu, score, components) in enumerate(final_results):
            #     menu_id = str(menu.get('id'))  # Convert UUID to string for JSON serialization
            #     try:
            #         # Calculate reason features
            #         reason_features = reason_calculator.calculate_features(
            #             menu=menu,
            #             user_preferences=enhanced_onboarding_data,
            #             user_query_intent=context_info.get('intent').__dict__ if context_info.get('intent') else None,
            #             similarity_scores={'text_similarity': components.text_similarity if components else 0.0}
            #         )
            # 
            #         # Phase 2: Generate actual explanations using OpenAI
            #         explanation = ""
            #         reason_keys = []
            #         
            #         if explanation_generator:
            #             gpt_explanation, reason_keys = explanation_generator.generate_explanation(
            #                 menu_name=menu.get('name', ''),
            #                 restaurant_name=menu.get('restaurant_name', ''),
            #                 reason_features=reason_features,
            #                 user_query=query_text,
            #                 taste_info={
            #                     'spicy_level': enhanced_onboarding_data.get('taste_preferences', {}).get('spicy', 3),
            #                     'sweet_level': enhanced_onboarding_data.get('taste_preferences', {}).get('sweet', 3),
            #                     'salty_level': enhanced_onboarding_data.get('taste_preferences', {}).get('salty', 3),
            #                     'favorite_cuisines': enhanced_onboarding_data.get('preferred_categories', [])
            #                 }
            #             )
            #             explanation = gpt_explanation
            #             logger.info(f"Generated explanation for {menu.get('name', '')}")
            #             logger.info(f"Explanation: {explanation}")
            # 
            #         # Store reason features in database with generated explanation
            #         try:
            #             external_menu_uuid = menu.get('id')
            #             external_restaurant_uuid = menu.get('restaurant_id')
            # 
            #             if external_menu_uuid and external_restaurant_uuid:
            #                 menu_obj, _ = get_or_create_menu_with_mapping(external_menu_uuid, menu)
            #                 restaurant_obj, _ = get_or_create_restaurant_with_mapping(external_restaurant_uuid, menu)
            # 
            #                 if menu_obj and restaurant_obj:
            #                     MenuReasonFeatures.objects.update_or_create(
            #                         user=request.user,
            #                         menu=menu_obj,
            #                         restaurant=restaurant_obj,
            #                         defaults={
            #                             'semantic_similarity': reason_features.get('semantic_similarity', 0.0),
            #                             'image_similarity': reason_features.get('image_similarity', 0.0),
            #                             'category_match_score': reason_features.get('category_match_score', 0.0),
            #                             'taste_alignment': reason_features.get('taste_alignment', 0.0),
            #                             'query_alignment': reason_features.get('query_alignment', 0.0),
            #                             'temporal_fit_score': reason_features.get('temporal_fit_score', 0.0),
            #                             'distance_score': reason_features.get('distance_score', 0.0),
            #                             'popularity_score': reason_features.get('popularity_score', 0.0),
            #                             'allergy_penalty': components.allergy_penalty if components else 0.0,
            #                             'dislike_penalty': components.dislike_penalty if components else 0.0,
            #                             'explanation': explanation,
            #                             'explanation_reason_keys': reason_keys,
            #                             'final_score': score,
            #                             'query_context': query_text
            #                         }
            #                     )
            #                     logger.info(f"Stored reason features for menu={external_menu_uuid}, restaurant={external_restaurant_uuid}")
            #         except Exception as e:
            #             logger.warning(f"Error storing reason features: {e}")
            # 
            #         # Stream the generated reason immediately to frontend
            #         logger.info(f"📤 Streaming reason {idx+1}/{len(final_results)} for menu {menu_id}: {explanation[:50]}...")
            #         chunk = json.dumps({
            #             'type': 'reason_update',
            #             'menu_id': menu_id,
            #             'reason': explanation
            #         }) + '\n'
            #         
            #         # Force immediate flushing to ensure real-time streaming
            #         yield chunk
            #         
            #         # Force system flush to ensure data is sent immediately
            #         import sys
            #         sys.stdout.flush()
            #         sys.stderr.flush()
            #         
            #         # Small delay to ensure chunk boundary recognition
            #         time.sleep(0.1)
            # 
            #     except Exception as e:
            #         logger.warning(f"Failed to generate explanation for {menu.get('name', '')}: {e}")
            #         # Stream error indication for this menu
            #         yield json.dumps({
            #             'type': 'reason_update',
            #             'menu_id': menu_id,
            #             'reason': '추천 이유 생성 실패'
            #         }) + '\n'

        # Combined streaming function that orchestrates both phases
        def stream_recommendations():
            """Main streaming function that combines Phase 1 and Phase 2"""
            # Phase 1: Stream menu information immediately
            yield from stream_phase1_recommendations()
            
            # Phase 2: Stream reasons (currently disabled)
            # yield from stream_phase2_reasons()
            
            # Close recommender
            try:
                recommender.close()
            except:
                pass

            logger.info(f"=== 메뉴 추천 완료: Phase 1 only (Phase 2 disabled) ===")

        # Handle different phases
        if phase == 1:
            # Phase 1: Return only menu data without reasons
            formatted_results = []
            for menu, score, components in final_results:
                formatted_item = format_menu_item(menu, score, components, None, enhanced_onboarding_data)
                formatted_results.append(formatted_item)
            
            # Close recommender
            try:
                recommender.close()
            except:
                pass
                
            return JsonResponse({
                'success': True,
                'query_type': 'menu',
                'total_results': len(formatted_results),
                'results': formatted_results
            })
            
        # Note: Phase 2 is now handled at the beginning of this function for early exit
        
        else:
            # Original streaming behavior (phase=None)
            # Return streaming response with proper headers for real-time delivery
            response = RecommendationStreamResponse(
                stream_recommendations(),
                content_type='application/x-ndjson; charset=utf-8'
            )
            # Disable caching and buffering for streaming
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            response['X-Accel-Buffering'] = 'no'  # Nginx: disable buffering
            # Remove Content-Length to enable streaming
            if 'Content-Length' in response:
                del response['Content-Length']
            return response
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in request: {e}")
        return JsonResponse({
            'error': 'Invalid JSON in request body'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"메뉴 추천 API 오류: {e}", exc_info=True)
        return JsonResponse({
            'error': '서버 내부 오류',
            'detail': str(e) if __import__('django').conf.settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@require_http_methods(["POST"])
@csrf_exempt  
def recommend_menu(request):
    """Original streaming menu recommendation API"""
    return _recommend_menu_internal(request, phase=None)

@api_view(['POST'])
@permission_classes([AllowAny])
def recommend_place(request):
    """가게 추천 API"""
    try:
        # 요청 데이터 파싱
        data = request.data
        
        # 필수 필드 검증
        required_fields = ['user_id', 'user_location']
        for field in required_fields:
            if field not in data:
                return Response({
                    'error': f'필수 필드 누락: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # 사용자 프로필 생성
        user_profile_service = UserProfileService()
        user_id = data['user_id']
        onboarding_data = data.get('onboarding_data', {})
        gallery_analysis = data.get('gallery_analysis')
        behavior_data = data.get('behavior_data')
        
        # exploration_preference 가져오기 (기본값 2.5)
        exploration_preference = onboarding_data.get('exploration_preference', 2.5)
        
        user_profile_text = user_profile_service.create_user_profile(
            user_id, onboarding_data, gallery_analysis, behavior_data
        )
        
        # 검색 컨텍스트 생성
        search_context = SearchContext(
            user_location=tuple(data['user_location']),
            budget_range=tuple(onboarding_data.get('budget_range', [0, 0])),
            max_distance=onboarding_data.get('distance_preference', 2.0),
            allergies=onboarding_data.get('allergies', []),
            dislikes=onboarding_data.get('dislikes', []),
            preferred_categories=onboarding_data.get('preferred_categories', []),
            time_of_day=data.get('time_of_day', '점심'),
            day_of_week=data.get('day_of_week', '평일')
        )
        
        # 추천 실행: use user's profile image labels if no explicit query provided
        query_text = data.get('query_text', '')

        # If no explicit query text, aggregate image labels from user's profile
        if not query_text or not query_text.strip():
            try:
                from users.models import UserGalleryImage
                user_photos = UserGalleryImage.objects.filter(user=request.user)
                image_labels = []

                for photo in user_photos:
                    if photo.ai_label and photo.ai_label.strip():
                        label = photo.ai_label.strip()
                        if label and label not in image_labels:
                            image_labels.append(label)

                if image_labels:
                    query_text = ' AND '.join(image_labels)
                    logger.info(f"Auto-aggregated user image labels for place recommendation: {query_text}")
            except Exception as e:
                logger.debug(f"Could not aggregate image labels: {e}")
                # Continue without query_text if image aggregation fails

        max_results = data.get('max_results', 20)
        
        # ===== client.py 기반 검색 (PostgreSQL + PostGIS) =====
        if RestaurantRecommender is None:
            return Response({
                'error': 'RestaurantRecommender를 사용할 수 없습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            # RestaurantRecommender 초기화
            recommender = RestaurantRecommender(verbose=False)
            
            # client.py용 UserProfile 생성
            client_profile = ClientUserProfile(
                location=(search_context.user_location[0], search_context.user_location[1]),
                cuisine_preferences=search_context.preferred_categories,
                max_distance_km=search_context.max_distance
            )
            
            # PostGIS 공간 쿼리로 근처 레스토랑 검색
            restaurants = recommender.find_nearby_restaurants(
                client_profile,
                max_distance_km=search_context.max_distance,
                categories=search_context.preferred_categories,
                max_restaurants=100  # 충분한 후보 확보
            )
            
            if not restaurants:
                return Response({
                    'success': True,
                    'query_type': 'place',
                    'total_results': 0,
                    'results': [],
                    'message': '주변에 레스토랑이 없습니다.'
                })
            
            logger.info(f"검색된 레스토랑 수: {len(restaurants)}")
            
            # query_text가 있으면 필터링
            if query_text:
                filtered_restaurants = []
                query_lower = query_text.lower()
                for restaurant in restaurants:
                    name = restaurant.get('name', '').lower()
                    category = restaurant.get('category', '').lower()
                    keywords = ' '.join(restaurant.get('keywords', [])).lower() if restaurant.get('keywords') else ''
                    
                    if query_lower in name or query_lower in category or query_lower in keywords:
                        filtered_restaurants.append(restaurant)
                
                if filtered_restaurants:
                    restaurants = filtered_restaurants
                    logger.info(f"쿼리 필터링 후 레스토랑 수: {len(restaurants)}")
            
            # 레스토랑이 없으면 빈 결과 반환
            if not restaurants:
                recommender.close()
                return Response({
                    'success': True,
                    'query_type': 'place',
                    'total_results': 0,
                    'results': [],
                    'message': '조건에 맞는 레스토랑이 없습니다.'
                })
            
        except Exception as e:
            logger.error(f"client.py 검색 오류: {e}")
            return Response({
                'error': f'검색 오류: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # ===== Strategy Pattern을 사용한 스코어링 =====
        # Scoring context 초기화 (HybridScoringStrategy 사용, 가게 추천은 기본적으로 Hybrid 방식)
        scoring_context = ScoringContext(strategy=HybridScoringStrategy())
        scored_results = []
        
        for restaurant in restaurants:
            # 유사도 계산 (가게의 경우 카테고리와 키워드 기반)
            similarity_score = calculate_menu_similarity(restaurant, onboarding_data)
            
            # Strategy Pattern을 사용한 점수 계산
            score, _ = scoring_context.calculate_score(
                menu=restaurant,
                user_prefs=onboarding_data,
                search_context=search_context,
                text_similarity=similarity_score,
            )
            
            scored_results.append((restaurant, score))
        
        # MMR 리랭킹 적용 (exploration_preference 사용)
        reranker = MMRReranker(exploration_preference=exploration_preference)
        final_results = reranker.rerank_with_mmr(scored_results, max_results)
        
        # 결과 포맷팅
        formatted_results = []
        for restaurant, score in final_results:
            # client.py에서 온 레스토랑 데이터 형식에 맞춰 변환
            # Decimal 타입을 float로 변환하고 None 처리
            rating_raw = restaurant.get('rating') or restaurant.get('avg_rating')
            rating = float(rating_raw) if rating_raw is not None else 0.0
            
            review_count_raw = restaurant.get('review_count')
            review_count = int(review_count_raw) if review_count_raw is not None else 0
            
            category = restaurant.get('category', '')
            
            # x, y 좌표도 안전하게 변환
            x_raw = restaurant.get('x')
            y_raw = restaurant.get('y')
            x = float(x_raw) if x_raw is not None else 0.0
            y = float(y_raw) if y_raw is not None else 0.0
            
            formatted_results.append({
                'id': restaurant.get('id'),
                'name': restaurant.get('name', ''),
                'category': category,
                'location': restaurant.get('location', ''),
                'rating': rating,
                'review_count': review_count,
                'avg_price': restaurant.get('avg_price', 0),
                'keywords': restaurant.get('keywords', []) if restaurant.get('keywords') else [],
                'voted_keywords': restaurant.get('voted_keywords', []) if restaurant.get('voted_keywords') else [],
                'features': restaurant.get('features', []) if restaurant.get('features') else [],
                'coordinates': (x, y),
                'distance_meters': restaurant.get('distance_meters', 0),
                'score': score,
                'reason': f"'{category}' 카테고리, 평점 {rating:.1f} (리뷰 {review_count:,}건)" if review_count > 0 else f"'{category}' 카테고리"
            })
        
        # RestaurantRecommender 연결 종료
        try:
            recommender.close()
        except:
            pass
        
        return Response({
            'success': True,
            'query_type': 'place',
            'total_results': len(formatted_results),
            'results': formatted_results
        })
        
    except Exception as e:
        logger.error(f"가게 추천 API 오류: {e}")
        return Response({
            'error': '서버 내부 오류'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """헬스 체크 API"""
    return Response({
        'status': 'healthy',
        'service': 'recommendation_system'
    })

def create_sample_request():
    """샘플 요청 데이터 생성"""
    return {
        "user_id": "sample_user",
        "user_location": [126.9619864, 37.477136],
        "query_type": "menu",
        "query_text": "단팥빵 크림치즈",
        "max_results": 10,
        "time_of_day": "점심",
        "day_of_week": "평일",
        "onboarding_data": {
            "spicy": 2.0,
            "sweet": 4.5,
            "salty": 3.0,
            "sour": 2.5,
            "bitter": 1.5,
            "allergies": ["땅콩", "견과류"],
            "dislikes": ["고수", "양고기"],
            "preferred_categories": ["베이커리", "디저트"],
            "budget_range": [5000, 15000],
            "distance_preference": 1.0
        },
        "gallery_analysis": {
            "frequent_keywords": [
                ["단팥빵", 15],
                ["크림치즈", 12],
                ["맘모스빵", 10]
            ],
            "recent_keywords": ["단팥빵", "크림치즈", "맘모스빵"]
        },
        "behavior_data": {
            "liked_menus": ["단팥빵", "크림치즈", "맘모스빵"],
            "liked_places": ["쟝블랑제리", "파리바게뜨"],
            "clicked_keywords": ["단팥빵", "크림치즈", "맘모스빵"]
        }
    }

if __name__ == "__main__":
    # 샘플 요청 데이터 출력
    sample_request = create_sample_request()
    print("샘플 요청 데이터:")
    print(json.dumps(sample_request, ensure_ascii=False, indent=2))

    