"""

Scrap-based Category Preference Service

스크랩한 음식점의 카테고리를 분석하여 사용자의 카테고리 선호도를 계산하고
추천 알고리즘에 반영합니다.
"""

from typing import Dict, List, Tuple
from collections import Counter
from django.db.models import Count
from users.models import User, UserPreference, UserRemoteScrap
import logging
import re

logger = logging.getLogger(__name__)

# 카테고리 정규화 매핑
# 메뉴/음식점 이름에서 추출한 카테고리를 CUISINES에 정의된 표준 카테고리로 매핑
# CUISINES: 이탈리안, 멕시칸, 중식, 일식, 인도, 아메리칸, 태국, 지중해, 프렌치, 베트남, 스페인, 한식
CATEGORY_MAPPING = {
    # 중식 (chinese)
    '중식': '중식',
    '중국집': '중식',
    '중국요리': '중식',
    '중화요리': '중식',
    '마라탕': '중식',
    '마라샹궈': '중식',
    '꿔바로우': '중식',
    '짜장면': '중식',
    '짬뽕': '중식',
    '탕수육': '중식',
    '양꼬치': '중식',
    '훠궈': '중식',
    '딤섬': '중식',

    # 한식 (korean)
    '한식': '한식',
    '한정식': '한식',
    '국밥': '한식',
    '설렁탕': '한식',
    '삼겹살': '한식',
    '갈비': '한식',
    '불고기': '한식',
    '비빔밥': '한식',
    '김치찌개': '한식',
    '된장찌개': '한식',
    '순두부': '한식',
    '칼국수': '한식',
    '냉면': '한식',
    '족발': '한식',
    '보쌈': '한식',
    '찜닭': '한식',
    '해장국': '한식',
    '감자탕': '한식',
    '삼계탕': '한식',
    '추어탕': '한식',
    '곱창': '한식',
    '막창': '한식',
    '떡볶이': '한식',
    '분식': '한식',
    '김밥': '한식',
    '라면': '한식',
    '백반': '한식',
    '정식': '한식',
    '치킨': '한식',  # 치킨은 한식으로 분류
    '닭갈비': '한식',
    '치맥': '한식',
    '통닭': '한식',
    '후라이드': '한식',
    '양념치킨': '한식',

    # 일식 (japanese)
    '일식': '일식',
    '일본요리': '일식',
    '스시': '일식',
    '초밥': '일식',
    '사시미': '일식',
    '회': '일식',
    '라멘': '일식',
    '우동': '일식',
    '소바': '일식',
    '돈카츠': '일식',
    '돈가스': '일식',
    '카츠': '일식',
    '덮밥': '일식',
    '규동': '일식',
    '오마카세': '일식',
    '이자카야': '일식',
    '야키토리': '일식',
    '타코야키': '일식',
    '텐동': '일식',
    '텐푸라': '일식',

    # 이탈리안 (italian)
    '이탈리안': '이탈리안',
    '이탈리아': '이탈리안',
    '파스타': '이탈리안',
    '피자': '이탈리안',
    '리조또': '이탈리안',
    '라자냐': '이탈리안',
    '뇨끼': '이탈리안',
    '까르보나라': '이탈리안',

    # 프렌치 (french)
    '프렌치': '프렌치',
    '프랑스': '프렌치',
    '프랑스요리': '프렌치',
    '비스트로': '프렌치',
    '크레페': '프렌치',
    '크루아상': '프렌치',

    # 아메리칸 (american)
    '아메리칸': '아메리칸',
    '양식': '아메리칸',
    '스테이크': '아메리칸',
    '햄버거': '아메리칸',
    '버거': '아메리칸',
    '샐러드': '아메리칸',
    '브런치': '아메리칸',
    '오믈렛': '아메리칸',
    '그라탕': '아메리칸',
    '패스트푸드': '아메리칸',
    '맥도날드': '아메리칸',
    '버거킹': '아메리칸',
    'KFC': '아메리칸',
    '롯데리아': '아메리칸',

    # 멕시칸 (mexican)
    '멕시칸': '멕시칸',
    '멕시코': '멕시칸',
    '타코': '멕시칸',
    '부리또': '멕시칸',
    '퀘사디아': '멕시칸',
    '나쵸': '멕시칸',

    # 태국 (thai)
    '태국': '태국',
    '타이': '태국',
    '팟타이': '태국',
    '똠양꿍': '태국',
    '그린커리': '태국',
    '레드커리': '태국',

    # 베트남 (vietnamese)
    '베트남': '베트남',
    '쌀국수': '베트남',
    '분짜': '베트남',
    '반미': '베트남',
    '포': '베트남',

    # 인도 (indian)
    '인도': '인도',
    '인디안': '인도',
    '커리': '인도',
    '난': '인도',
    '탄두리': '인도',
    '비리야니': '인도',
    '사모사': '인도',

    # 지중해 (mediterranean)
    '지중해': '지중해',
    '그리스': '지중해',
    '터키': '지중해',
    '케밥': '지중해',
    '후무스': '지중해',
    '팔라펠': '지중해',
    '샤와르마': '지중해',

    # 스페인 (spanish)
    '스페인': '스페인',
    '스패니시': '스페인',
    '타파스': '스페인',
    '빠에야': '스페인',
    '하몽': '스페인',
    '츄러스': '스페인',
}

# 표준 카테고리 목록 (CUISINES에 맞춤)
STANDARD_CATEGORIES = [
    '한식', '중식', '일식', '이탈리안', '프렌치', '아메리칸',
    '멕시칸', '태국', '베트남', '인도', '지중해', '스페인', '기타'
]


def normalize_category(raw_category: str) -> str:
    """
    원본 카테고리를 표준 카테고리로 정규화

    Args:
        raw_category: 원본 카테고리 문자열 (예: "마라탕", "중국집>중식당")

    Returns:
        정규화된 카테고리 (예: "중식")
    """
    if not raw_category:
        return '기타'

    # 소문자로 변환하고 공백 제거
    category_lower = raw_category.lower().strip()

    # 직접 매핑 확인
    for keyword, normalized in CATEGORY_MAPPING.items():
        if keyword.lower() in category_lower:
            return normalized

    # '>' 구분자로 분리된 경우 각 부분 확인
    if '>' in raw_category:
        parts = raw_category.split('>')
        for part in parts:
            part = part.strip()
            for keyword, normalized in CATEGORY_MAPPING.items():
                if keyword.lower() in part.lower():
                    return normalized

    return '기타'


def extract_category_from_menu_name(menu_name: str) -> str:
    """
    메뉴 이름에서 카테고리 추출

    Args:
        menu_name: 메뉴 이름 (예: "마라탕", "짜장면")

    Returns:
        추출된 카테고리
    """
    if not menu_name:
        return '기타'

    menu_lower = menu_name.lower()

    for keyword, category in CATEGORY_MAPPING.items():
        if keyword.lower() in menu_lower:
            return category

    return '기타'


class ScrapCategoryPreferenceService:
    """스크랩 기반 카테고리 선호도 서비스"""

    def __init__(self, user: User):
        self.user = user

    def get_scrap_category_counts(self) -> Dict[str, int]:
        """
        사용자의 스크랩에서 카테고리별 개수 집계

        Returns:
            카테고리별 개수 딕셔너리 (예: {'중식': 5, '한식': 3})
        """
        from users.models import UserScrap
        
        category_counts = Counter()

        # 1. UserRemoteScrap에서 카테고리 추출
        remote_scraps = UserRemoteScrap.objects.filter(user=self.user)

        for scrap in remote_scraps:
            # category 필드 사용
            if scrap.category:
                normalized = normalize_category(scrap.category)
                category_counts[normalized] += 1

            # menu_name에서도 카테고리 추출 시도
            if scrap.menu_name:
                menu_category = extract_category_from_menu_name(scrap.menu_name)
                if menu_category != '기타':
                    category_counts[menu_category] += 1

        # 2. UserScrap에서 카테고리 추출 (Restaurant 기반)
        local_scraps = UserScrap.objects.filter(user=self.user).select_related('restaurant')
        
        for scrap in local_scraps:
            if scrap.restaurant:
                # restaurant의 category 사용
                if hasattr(scrap.restaurant, 'category') and scrap.restaurant.category:
                    normalized = normalize_category(scrap.restaurant.category)
                    category_counts[normalized] += 1
                # restaurant name에서 카테고리 추출 시도
                elif hasattr(scrap.restaurant, 'name') and scrap.restaurant.name:
                    menu_category = extract_category_from_menu_name(scrap.restaurant.name)
                    if menu_category != '기타':
                        category_counts[menu_category] += 1

        logger.info(f"User {self.user.id} scrap category counts: {dict(category_counts)}")
        return dict(category_counts)

    def calculate_category_preferences(self) -> Dict[str, float]:
        """
        카테고리별 선호도 점수 계산

        선호도 점수 = (해당 카테고리 스크랩 수 / 전체 스크랩 수) * 가중치

        Returns:
            카테고리별 선호도 점수 (0.0 ~ 1.0)
        """
        category_counts = self.get_scrap_category_counts()

        if not category_counts:
            return {}

        total = sum(category_counts.values())
        if total == 0:
            return {}

        preferences = {}
        for category, count in category_counts.items():
            # 기본 비율 계산
            ratio = count / total

            # 최소 스크랩 수에 따른 신뢰도 가중치 (5개 이상이면 1.0)
            confidence = min(count / 5, 1.0)

            # 최종 선호도 점수
            preferences[category] = round(ratio * confidence, 3)

        # 점수 기준 내림차순 정렬
        preferences = dict(sorted(preferences.items(), key=lambda x: x[1], reverse=True))

        logger.info(f"User {self.user.id} category preferences: {preferences}")
        return preferences

    def get_top_preferred_categories(self, top_n: int = 3) -> List[str]:
        """
        상위 N개의 선호 카테고리 반환

        Args:
            top_n: 반환할 카테고리 수

        Returns:
            선호도 상위 카테고리 리스트
        """
        preferences = self.calculate_category_preferences()

        # 선호도 0.1 이상인 카테고리만 필터링
        filtered = {k: v for k, v in preferences.items() if v >= 0.1 and k != '기타'}

        return list(filtered.keys())[:top_n]

    def update_user_favorite_cuisines(self) -> List[str]:
        """
        사용자의 favorite_cuisines를 스크랩 기반으로 업데이트

        기존 favorite_cuisines와 스크랩 기반 선호도를 병합

        Returns:
            업데이트된 favorite_cuisines 리스트
        """
        try:
            user_pref, created = UserPreference.objects.get_or_create(
                user=self.user,
                defaults={'favorite_cuisines': []}
            )

            # 기존 선호 카테고리
            existing_cuisines = set(user_pref.favorite_cuisines or [])

            # 스크랩 기반 상위 카테고리
            scrap_based_cuisines = set(self.get_top_preferred_categories(top_n=5))

            # 병합 (기존 + 스크랩 기반)
            merged_cuisines = list(existing_cuisines | scrap_based_cuisines)

            # 최대 10개로 제한
            merged_cuisines = merged_cuisines[:10]

            # 저장
            user_pref.favorite_cuisines = merged_cuisines
            user_pref.save(update_fields=['favorite_cuisines'])

            logger.info(f"Updated favorite_cuisines for user {self.user.id}: {merged_cuisines}")
            return merged_cuisines

        except Exception as e:
            logger.error(f"Error updating favorite_cuisines for user {self.user.id}: {e}")
            return []

    def get_category_preference_profile(self) -> Dict:
        """
        스크랩 기반 카테고리 선호도 프로필 반환

        Returns:
            {
                'category_counts': {'중식': 5, '한식': 3},
                'category_preferences': {'중식': 0.625, '한식': 0.375},
                'top_categories': ['중식', '한식'],
                'total_scraps': 8
            }
        """
        counts = self.get_scrap_category_counts()
        preferences = self.calculate_category_preferences()
        top_categories = self.get_top_preferred_categories()

        return {
            'category_counts': counts,
            'category_preferences': preferences,
            'top_categories': top_categories,
            'total_scraps': sum(counts.values())
        }


def update_category_preference_on_scrap(user: User, category: str = None, menu_name: str = None):
    """
    스크랩 추가 시 카테고리 선호도 업데이트 트리거

    Args:
        user: 사용자
        category: 스크랩된 항목의 카테고리
        menu_name: 스크랩된 메뉴 이름
    """
    try:
        service = ScrapCategoryPreferenceService(user)
        service.update_user_favorite_cuisines()

        # 로깅
        if category:
            normalized = normalize_category(category)
            logger.info(f"User {user.id} scrapped category: {category} -> {normalized}")
        if menu_name:
            menu_cat = extract_category_from_menu_name(menu_name)
            logger.info(f"User {user.id} scrapped menu: {menu_name} -> {menu_cat}")

    except Exception as e:
        logger.error(f"Error updating category preference on scrap: {e}")


