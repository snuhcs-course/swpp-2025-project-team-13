"""
추천 API 엔드포인트

이 모듈은 Django REST Framework를 이용한 추천 API를 구현합니다.
"""

import json
import logging
import math
import random
from collections import Counter, defaultdict
from typing import Dict, List, Optional, Tuple, Any
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .user_profile import UserProfileService, create_sample_user_profile
from .scoring import SearchContext, HybridScorer, MMRReranker, RecommendationReranker
from users.models import UserPreference, UserGalleryImage, UserScrap
from psql_data.models import DbRestaurant

logger = logging.getLogger(__name__)

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

def calculate_gallery_exploration_preference(user_id: int, min_images: int = 10) -> Optional[float]:
    """
    사용자 갤러리 이미지 카테고리 분포로 탐험성 점수(0~5) 계산
    """
    try:
        categories = list(
            UserGalleryImage.objects.filter(user_id=user_id)
            .exclude(category_tag__isnull=True)
            .exclude(category_tag__exact='')
            .values_list('category_tag', flat=True)
        )
    except Exception as exc:
        logger.warning(f"갤러리 탐험성 계산 실패(user_id={user_id}): {exc}")
        return None

    if len(categories) < min_images:
        return None

    counts = Counter(categories)
    total = sum(counts.values())
    distinct = len(counts)

    if total == 0 or distinct == 0:
        return None

    probabilities = [count / total for count in counts.values()]
    entropy = -sum(p * math.log(p + 1e-12) for p in probabilities)
    max_entropy = math.log(distinct)

    if max_entropy <= 0:
        return None

    exploration_score = round(5.0 * (entropy / max_entropy), 2)
    return exploration_score


def derive_preferred_categories_from_scraps(user_id: int, top_k: int = 3, min_count: int = 1) -> List[str]:
    """
    사용자의 스크랩한 음식점들을 PSQL 레스토랑(external_id 매핑)로 연결해
    category_normalized 상위 빈도 카테고리를 반환한다.
    """
    try:
        # UserScrap → Restaurant.source(external_id로 가정)
        sources = list(
            UserScrap.objects.filter(user_id=user_id)
            .select_related('restaurant')
            .values_list('restaurant__source', flat=True)
        )
    except Exception as exc:
        logger.warning(f"스크랩 카테고리 추출 실패(user_id={user_id}): {exc}")
        return []
    
    if not sources:
        return []
    
    try:
        categories = list(
            DbRestaurant.objects.filter(external_id__in=sources)
            .exclude(category_normalized__isnull=True)
            .exclude(category_normalized__exact='')
            .values_list('category_normalized', flat=True)
        )
    except Exception as exc:
        logger.warning(f"스크랩-PSQL 카테고리 매핑 실패(user_id={user_id}): {exc}")
        return []
    
    if not categories:
        return []
    
    counts = Counter(categories)
    # 최소 등장 횟수 필터 및 상위 k 추출
    filtered = [(cat, cnt) for cat, cnt in counts.items() if cnt >= min_count]
    filtered.sort(key=lambda x: x[1], reverse=True)
    top_categories = [cat for cat, _ in filtered[:top_k]]
    
    if top_categories:
        logger.info(f"스크랩 기반 선호 카테고리(user_id={user_id}): {top_categories}")
    return top_categories


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recommend_menu(request):
    """메뉴 추천 API"""
    try:
        # 요청 데이터 파싱
        data = request.data
        logger.info(f"=== 메뉴 추천 요청 시작 ===")
        logger.info(f"요청 데이터: {data}")
        
        # 필수 필드 검증 (user_id 제거)
        required_fields = ['user_location']
        for field in required_fields:
            if field not in data:
                logger.error(f"필수 필드 누락: {field}")
                return Response({
                    'error': f'필수 필드 누락: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
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
        # 갤러리 카테고리 다양성 기반 exploration_preference 보정
        ep_from_gallery = calculate_gallery_exploration_preference(request.user.id, min_images=10)
        if ep_from_gallery is not None:
            exploration_preference = ep_from_gallery
            logger.info(f"갤러리 기반 exploration_preference 적용: {exploration_preference}")
        
        # 스크랩 기반 상위 카테고리를 선호 카테고리에 병합 (기존 로직 보존 + 보강)
        try:
            scrap_pref_cats = derive_preferred_categories_from_scraps(request.user.id, top_k=3, min_count=1)
            if scrap_pref_cats:
                existing = onboarding_data.get('preferred_categories', []) or []
                # 기존 + 스크랩 카테고리 유니크 병합 (순서 유지)
                merged = list(dict.fromkeys([*existing, *scrap_pref_cats]))
                onboarding_data['preferred_categories'] = merged
                logger.info(f"스크랩 기반 선호 카테고리 병합: {merged}")
        except Exception as exc:
            logger.warning(f"스크랩 기반 선호 카테고리 병합 실패: {exc}")

        gallery_analysis = data.get('gallery_analysis')
        behavior_data = data.get('behavior_data')
        
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
        
        # 추천 실행
        query_text = data.get('query_text', '')
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
                return Response({
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
                return Response({
                    'success': True,
                    'query_type': 'menu',
                    'total_results': 0,
                    'results': [],
                    'message': '조건에 맞는 메뉴가 없습니다.'
                })
            
        except Exception as e:
            logger.error(f"client.py 검색 오류: {e}")
            return Response({
                'error': f'검색 오류: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # ===== 하이브리드 스코어링 적용 (기존 유지) =====
        scorer = HybridScorer()
        scored_results = []
        
        for menu in all_menus:
            # 유사도 계산
            similarity_score = calculate_menu_similarity(menu, onboarding_data)
            
            # 메뉴 데이터를 HybridScorer 형식으로 변환
            # Decimal과 None을 안전하게 처리
            rating_raw = menu.get('rating')
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
                'price': menu.get('price', 0),
                'coordinates': (x, y),
                'keywords': menu.get('keywords', []) if menu.get('keywords') else [],
                'has_image': bool(menu.get('images'))
            }
            
            # 하이브리드 점수 계산
            score = scorer.calculate_hybrid_score(similarity_score, item_data, search_context)
            scored_results.append((menu, score))
        
        # ===== 음식점별 다양성 보장 로직 =====
        # 1. 스코어 순으로 정렬
        scored_results.sort(key=lambda x: x[1], reverse=True)
        
        # 2. 음식점별로 그룹화 (restaurant_id 기준)
        restaurant_groups = defaultdict(list)
        for menu, score in scored_results:
            # restaurant_id가 있으면 그것을 사용, 없으면 restaurant_name 사용
            rest_id = menu.get('restaurant_id') or menu.get('restaurant_name', 'unknown')
            restaurant_groups[rest_id].append((menu, score))
        
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
                    selected_menu = random.choice(available_menus[:top_k])
                    final_results.append(selected_menu)
                    restaurant_groups[rest_id].remove(selected_menu)
                    selected_in_this_round = True
                
                if len(final_results) >= max_results:
                    break
            
            # 이번 라운드에서 아무것도 선택 안 했으면 중단
            if not selected_in_this_round:
                break
            
            round_idx += 1
        
        logger.info(f"음식점 다양성 보장: {round_idx}라운드 진행, 최종 {len(final_results)}개 메뉴 선택")
        
        # 결과 포맷팅
        formatted_results = []
        for menu, score in final_results:
            # client.py에서 온 메뉴 데이터 형식에 맞춰 변환
            # Decimal 타입을 float로 변환하고 None 처리
            rating_raw = menu.get('rating')
            rating = float(rating_raw) if rating_raw is not None else 0.0
            
            review_count_raw = menu.get('review_count')
            review_count = int(review_count_raw) if review_count_raw is not None else 0
            
            category = menu.get('category', '')
            
            # x, y 좌표도 안전하게 변환
            x_raw = menu.get('x')
            y_raw = menu.get('y')
            x = float(x_raw) if x_raw is not None else 0.0
            y = float(y_raw) if y_raw is not None else 0.0
            
            formatted_results.append({
                'id': menu.get('id'),
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
                'coordinates': (x, y),
                'distance_meters': menu.get('distance_meters', 0),
                'score': score,
                'reason': f"'{category}' 카테고리, 평점 {rating:.1f} (리뷰 {review_count:,}건)" if review_count > 0 else f"'{category}' 카테고리"
            })
        
        # RestaurantRecommender 연결 종료
        try:
            recommender.close()
        except:
            pass
        
        logger.info(f"=== 메뉴 추천 완료: {len(formatted_results)}개 결과 반환 ===")
        return Response({
            'success': True,
            'query_type': 'menu',
            'total_results': len(formatted_results),
            'results': formatted_results
        })
        
    except Exception as e:
        logger.error(f"메뉴 추천 API 오류: {e}", exc_info=True)
        return Response({
            'error': '서버 내부 오류'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        
        # 추천 실행
        query_text = data.get('query_text', '')
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
        
        # ===== 하이브리드 스코어링 적용 (기존 유지) =====
        scorer = HybridScorer()
        scored_results = []
        
        for restaurant in restaurants:
            # 유사도 계산 (가게의 경우 카테고리와 키워드 기반)
            similarity_score = calculate_menu_similarity(restaurant, onboarding_data)
            
            # 가게 데이터를 HybridScorer 형식으로 변환
            # Decimal과 None을 안전하게 처리
            rating_raw = restaurant.get('rating') or restaurant.get('avg_rating')
            rating = float(rating_raw) if rating_raw is not None else 0.0
            
            review_count_raw = restaurant.get('review_count')
            review_count = int(review_count_raw) if review_count_raw is not None else 0
            
            x_raw = restaurant.get('x')
            y_raw = restaurant.get('y')
            x = float(x_raw) if x_raw is not None else 0.0
            y = float(y_raw) if y_raw is not None else 0.0
            
            item_data = {
                'rating': rating,
                'review_count': review_count,
                'price': restaurant.get('avg_price', 0),
                'coordinates': (x, y),
                'keywords': restaurant.get('keywords', []) if restaurant.get('keywords') else [],
                'has_image': True  # 가게는 기본적으로 이미지가 있다고 가정
            }
            
            # 하이브리드 점수 계산
            score = scorer.calculate_hybrid_score(similarity_score, item_data, search_context)
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

    