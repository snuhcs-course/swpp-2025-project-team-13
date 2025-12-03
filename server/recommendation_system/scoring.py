"""
하이브리드 스코어링 및 MMR 리랭크 시스템

이 모듈은 텍스트 유사도, 인기도, 거리, 가격 등을 종합적으로 고려한
하이브리드 스코어링과 MMR(Maximal Marginal Relevance)을 이용한
다양성 확보 리랭크 시스템을 구현합니다.
"""

import math
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import numpy as np

logger = logging.getLogger(__name__)

@dataclass
class ScoringWeights:
    """스코어링 가중치 클래스"""
    text_similarity: float = 0.65  # 텍스트 유사도
    popularity: float = 0.20       # 인기도
    distance: float = 0.10         # 거리
    price: float = 0.05            # 가격 적합도
    penalty: float = 1.0           # 패널티 (알레르기/비선호)
    freshness: float = 0.1         # 신선도 (이미지 유무 등)

@dataclass
class SearchContext:
    """검색 컨텍스트 클래스"""
    user_location: Tuple[float, float]  # 사용자 위치 (x, y)
    budget_range: Tuple[int, int]       # 예산 범위
    max_distance: float                 # 최대 거리 (km)
    allergies: List[str]                # 알레르기
    dislikes: List[str]                # 비선호 재료
    preferred_categories: List[str]     # 선호 카테고리
    time_of_day: str                   # 시간대
    day_of_week: str                   # 요일

class HybridScorer:
    """하이브리드 스코어링 클래스"""
    
    def __init__(self, weights: ScoringWeights = None):
        self.weights = weights or ScoringWeights()
        self.logger = logging.getLogger(__name__)
    
    def calculate_popularity_score(self, rating: float, review_count: int) -> float:
        """인기도 점수 계산"""
        try:
            # None 체크 및 타입 변환
            if rating is None or review_count is None:
                return 0.0
            
            # Decimal 타입을 float로 변환
            rating_float = float(rating) if rating is not None else 0.0
            review_count_int = int(review_count) if review_count is not None else 0
            
            # log(1+reviewCount) * avgRating 공식 사용
            if review_count_int <= 0:
                return 0.0
            
            popularity_score = math.log(1 + review_count_int) * rating_float
            # 정규화 (0-1 범위로)
            normalized_score = min(popularity_score / 50.0, 1.0)
            return normalized_score
            
        except Exception as e:
            self.logger.error(f"인기도 점수 계산 실패: {e}")
            return 0.0
    
    def calculate_distance_score(self, user_location: Tuple[float, float], 
                               item_location: Tuple[float, float]) -> float:
        """거리 점수 계산 (가까울수록 높은 점수)"""
        try:
            # 하버사인 공식으로 거리 계산
            distance_km = self._calculate_distance(user_location, item_location)
            
            # 거리 감쇠 함수 (가까울수록 높은 점수)
            if distance_km <= 0.5:
                return 1.0
            elif distance_km <= 1.0:
                return 0.8
            elif distance_km <= 2.0:
                return 0.6
            elif distance_km <= 5.0:
                return 0.4
            else:
                return 0.2
                
        except Exception as e:
            self.logger.error(f"거리 점수 계산 실패: {e}")
            return 0.0
    
    def calculate_price_score(self, item_price: int, budget_range: Tuple[int, int]) -> float:
        """가격 적합도 점수 계산"""
        try:
            min_budget, max_budget = budget_range
            
            if min_budget == 0 and max_budget == 0:
                return 1.0  # 예산 제한 없음
            
            if min_budget <= item_price <= max_budget:
                return 1.0  # 예산 범위 내
            elif item_price < min_budget:
                # 예산보다 저렴한 경우 (약간 감점)
                return 0.8
            else:
                # 예산보다 비싼 경우 (거리 비례 감점)
                excess_ratio = (item_price - max_budget) / max_budget
                if excess_ratio <= 0.2:  # 20% 초과까지는 허용
                    return 0.6
                elif excess_ratio <= 0.5:  # 50% 초과까지는 약간 허용
                    return 0.3
                else:
                    return 0.1
                    
        except Exception as e:
            self.logger.error(f"가격 점수 계산 실패: {e}")
            return 0.0
    
    def calculate_penalty_score(self, item_keywords: List[str], 
                              allergies: List[str], dislikes: List[str]) -> float:
        """패널티 점수 계산 (알레르기/비선호 재료)"""
        try:
            penalty = 0.0
            
            # 알레르기 체크
            for allergy in allergies:
                for keyword in item_keywords:
                    if allergy.lower() in keyword.lower():
                        penalty += 0.5  # 알레르기는 강한 패널티
            
            # 비선호 재료 체크
            for dislike in dislikes:
                for keyword in item_keywords:
                    if dislike.lower() in keyword.lower():
                        penalty += 0.3  # 비선호는 중간 패널티
            
            return min(penalty, 1.0)  # 최대 1.0까지
            
        except Exception as e:
            self.logger.error(f"패널티 점수 계산 실패: {e}")
            return 0.0
    
    def calculate_freshness_score(self, has_image: bool, review_count: int) -> float:
        """신선도 점수 계산 (이미지 유무, 리뷰 수 등)"""
        try:
            score = 0.0
            
            # 이미지 유무
            if has_image:
                score += 0.3
            
            # 리뷰 수 (많을수록 신뢰도 높음)
            if review_count >= 100:
                score += 0.4
            elif review_count >= 50:
                score += 0.3
            elif review_count >= 10:
                score += 0.2
            else:
                score += 0.1
            
            return min(score, 1.0)
            
        except Exception as e:
            self.logger.error(f"신선도 점수 계산 실패: {e}")
            return 0.0
    
    def calculate_hybrid_score(self, text_similarity: float, item_data: Dict, 
                             context: SearchContext) -> float:
        """하이브리드 점수 계산"""
        try:
            # 각 점수 계산
            popularity_score = self.calculate_popularity_score(
                item_data.get("rating", 0), 
                item_data.get("review_count", 0)
            )
            
            distance_score = self.calculate_distance_score(
                context.user_location, 
                item_data.get("coordinates", (0, 0))
            )
            
            price_score = self.calculate_price_score(
                item_data.get("price", 0), 
                context.budget_range
            )
            
            penalty_score = self.calculate_penalty_score(
                item_data.get("keywords", []), 
                context.allergies, 
                context.dislikes
            )
            
            freshness_score = self.calculate_freshness_score(
                item_data.get("has_image", False), 
                item_data.get("review_count", 0)
            )
            
            # 가중합 계산
            hybrid_score = (
                self.weights.text_similarity * text_similarity +
                self.weights.popularity * popularity_score +
                self.weights.distance * distance_score +
                self.weights.price * price_score +
                self.weights.freshness * freshness_score -
                self.weights.penalty * penalty_score
            )
            
            return max(hybrid_score, 0.0)  # 음수 방지
            
        except Exception as e:
            self.logger.error(f"하이브리드 점수 계산 실패: {e}")
            return 0.0
    
    def _calculate_distance(self, loc1: Tuple[float, float], 
                          loc2: Tuple[float, float]) -> float:
        """하버사인 공식으로 거리 계산 (km)"""
        try:
            lat1, lon1 = loc1
            lat2, lon2 = loc2
            
            # 위도, 경도를 라디안으로 변환
            lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
            
            # 하버사인 공식
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            
            # 지구 반지름 (km)
            r = 6371
            
            return c * r
            
        except Exception as e:
            self.logger.error(f"거리 계산 실패: {e}")
            return float('inf')

class MMRReranker:
    """MMR 리랭크 클래스"""
    
    def __init__(self, lambda_param: float = None, exploration_preference: float = None):
        # exploration_preference가 주어진 경우 동적으로 lambda 계산
        if exploration_preference is not None:
            # 0 (familiar) -> lambda=0.9 (관련성 중시)
            # 5 (adventurous) -> lambda=0.3 (다양성 중시)
            self.lambda_param = 0.9 - (exploration_preference / 5.0) * 0.6
        elif lambda_param is not None:
            self.lambda_param = lambda_param
        else:
            self.lambda_param = 0.7  # 기본값
        
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"MMR initialized with lambda={self.lambda_param:.2f}")
    
    def rerank_with_mmr(self, items: List[Tuple[Any, float]], 
                       max_results: int = 20) -> List[Tuple[Any, float]]:
        """MMR을 이용한 리랭크"""
        try:
            if not items:
                return []
            
            # 결과를 저장할 리스트
            selected_items = []
            remaining_items = items.copy()
            
            # 첫 번째 아이템은 가장 높은 점수로 선택
            if remaining_items:
                first_item = max(remaining_items, key=lambda x: x[1])
                selected_items.append(first_item)
                remaining_items.remove(first_item)
            
            # MMR 알고리즘 적용
            while remaining_items and len(selected_items) < max_results:
                best_item = None
                best_mmr_score = -float('inf')
                
                for item in remaining_items:
                    # 관련성 점수
                    relevance_score = item[1]
                    
                    # 다양성 점수 (이미 선택된 아이템들과의 최대 유사도)
                    max_similarity = 0.0
                    for selected_item in selected_items:
                        similarity = self._calculate_similarity(item[0], selected_item[0])
                        max_similarity = max(max_similarity, similarity)
                    
                    # MMR 점수 계산
                    mmr_score = (
                        self.lambda_param * relevance_score - 
                        (1 - self.lambda_param) * max_similarity
                    )
                    
                    if mmr_score > best_mmr_score:
                        best_mmr_score = mmr_score
                        best_item = item
                
                if best_item:
                    selected_items.append(best_item)
                    remaining_items.remove(best_item)
                else:
                    break
            
            return selected_items
            
        except Exception as e:
            self.logger.error(f"MMR 리랭크 실패: {e}")
            return items[:max_results]
    
    def _calculate_similarity(self, item1: Any, item2: Any) -> float:
        """두 아이템 간의 유사도 계산"""
        try:
            # 키워드 기반 유사도 계산
            keywords1 = getattr(item1, 'keywords', [])
            keywords2 = getattr(item2, 'keywords', [])
            
            if not keywords1 or not keywords2:
                return 0.0
            
            # Jaccard 유사도 계산
            set1 = set(keywords1)
            set2 = set(keywords2)
            
            intersection = len(set1.intersection(set2))
            union = len(set1.union(set2))
            
            if union == 0:
                return 0.0
            
            return intersection / union
            
        except Exception as e:
            self.logger.error(f"유사도 계산 실패: {e}")
            return 0.0

class RecommendationReranker:
    """추천 리랭크 통합 클래스"""
    
    def __init__(self, weights: ScoringWeights = None, lambda_param: float = 0.7):
        self.scorer = HybridScorer(weights)
        self.mmr_reranker = MMRReranker(lambda_param)
        self.logger = logging.getLogger(__name__)
    
    def rerank_recommendations(self, items: List[Tuple[Any, float]], 
                             context: SearchContext, 
                             max_results: int = 20) -> List[Tuple[Any, float, str]]:
        """추천 결과 리랭크"""
        try:
            if not items:
                return []
            
            # 하이브리드 점수 계산
            hybrid_scores = []
            for item, text_similarity in items:
                # 아이템 데이터 추출
                item_data = {
                    "rating": getattr(item, 'rating', 0),
                    "review_count": getattr(item, 'review_count', 0),
                    "price": getattr(item, 'price', 0),
                    "keywords": getattr(item, 'keywords', []),
                    "has_image": getattr(item, 'has_image', False),
                    "coordinates": getattr(item, 'coordinates', (0, 0))
                }
                
                # 하이브리드 점수 계산
                hybrid_score = self.scorer.calculate_hybrid_score(
                    text_similarity, item_data, context
                )
                
                hybrid_scores.append((item, hybrid_score))
            
            # MMR 리랭크 적용
            reranked_items = self.mmr_reranker.rerank_with_mmr(
                hybrid_scores, max_results
            )
            
            # 추천 사유 생성
            final_results = []
            for item, score in reranked_items:
                # reason = self._generate_recommendation_reason(item, context)
                reason = None  # Temporarily disabled reason generation
                final_results.append((item, score, reason))
            
            return final_results
            
        except Exception as e:
            self.logger.error(f"추천 리랭크 실패: {e}")
            return []
    
    def _generate_recommendation_reason(self, item: Any, context: SearchContext) -> str:
        """추천 사유 생성"""
        try:
            reasons = []
            
            # 카테고리 매칭
            item_category = getattr(item, 'category', '')
            if item_category in context.preferred_categories:
                reasons.append(f"'{item_category}' 선호 카테고리")
            
            # 키워드 매칭
            item_keywords = getattr(item, 'keywords', [])
            matched_keywords = []
            for keyword in item_keywords[:3]:
                if any(pref in keyword.lower() for pref in context.preferred_categories):
                    matched_keywords.append(keyword)
            
            if matched_keywords:
                reasons.append(f"'{', '.join(matched_keywords)}' 키워드 매칭")
            
            # 평점/리뷰
            rating = getattr(item, 'rating', 0)
            review_count = getattr(item, 'review_count', 0)
            if rating >= 4.0 and review_count >= 100:
                reasons.append(f"높은 평점 {rating:.1f} (리뷰 {review_count}건)")
            
            # 거리
            distance = self.scorer._calculate_distance(
                context.user_location, 
                getattr(item, 'coordinates', (0, 0))
            )
            if distance <= 1.0:
                reasons.append(f"가까운 거리 {distance:.1f}km")
            
            # 가격
            price = getattr(item, 'price', 0)
            min_budget, max_budget = context.budget_range
            if min_budget <= price <= max_budget:
                reasons.append(f"적합한 가격 {price:,}원")
            
            if not reasons:
                reasons.append("개인화 추천")
            
            return ", ".join(reasons[:3])  # 최대 3개 사유
            
        except Exception as e:
            self.logger.error(f"추천 사유 생성 실패: {e}")
            return "개인화 추천"

def create_sample_search_context() -> SearchContext:
    """샘플 검색 컨텍스트 생성"""
    return SearchContext(
        user_location=(126.9619864, 37.477136),  # 낙성대역
        budget_range=(5000, 15000),
        max_distance=2.0,
        allergies=["땅콩", "견과류"],
        dislikes=["고수", "양고기"],
        preferred_categories=["베이커리", "디저트"],
        time_of_day="점심",
        day_of_week="평일"
    )

if __name__ == "__main__":
    # 샘플 테스트
    context = create_sample_search_context()
    print("샘플 검색 컨텍스트:")
    print(f"위치: {context.user_location}")
    print(f"예산: {context.budget_range}")
    print(f"알레르기: {context.allergies}")
    print(f"선호 카테고리: {context.preferred_categories}")
