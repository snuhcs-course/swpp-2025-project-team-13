"""

Gallery Image-based Category Preference Service

사용자의 갤러리 이미지(CLIP 라벨링된)에서 카테고리를 분석하여
카테고리 선호도와 음식 탐험 성향(exploration_preference)을 계산합니다.

주요 기능:
1. 갤러리 이미지의 category_tag 기반 카테고리 선호도 점수 계산
2. 카테고리 분포 분석을 통한 exploration_preference 자동 조정
   - 고르게 분산: 높은 탐험성 (다양한 음식을 먹음)
   - 1-2개 집중: 낮은 탐험성 (먹던 것만 먹음)
"""

from typing import Dict, List, Tuple, Optional
from collections import Counter
import math
import logging

from django.db.models import Count

from users.models import User, UserPreference, UserGalleryImage
from users.scrap_category_service import (
    CATEGORY_MAPPING,
    STANDARD_CATEGORIES,
    normalize_category,
    extract_category_from_menu_name,
)

logger = logging.getLogger(__name__)


# 갤러리 이미지 기반 선호도 계산 설정
GALLERY_MIN_IMAGES_FOR_PREFERENCE = 5  # 선호도 계산에 필요한 최소 이미지 수
GALLERY_MIN_IMAGES_FOR_EXPLORATION = 10  # 탐험성향 계산에 필요한 최소 이미지 수
GALLERY_SIGNIFICANT_CATEGORY_THRESHOLD = 3  # 유의미한 카테고리로 간주할 최소 이미지 수


class GalleryCategoryPreferenceService:
    """갤러리 이미지 기반 카테고리 선호도 서비스"""

    def __init__(self, user: User):
        self.user = user

    def get_gallery_category_counts(self) -> Dict[str, int]:
        """
        사용자의 갤러리 이미지에서 카테고리별 개수 집계

        Returns:
            카테고리별 개수 딕셔너리 (예: {'중식': 10, '한식': 5})
        """
        category_counts = Counter()

        # UserGalleryImage에서 category_tag 또는 ai_label 추출
        gallery_images = UserGalleryImage.objects.filter(user=self.user)

        for image in gallery_images:
            # 1. category_tag 필드 사용 (이미 정규화된 경우)
            if image.category_tag:
                normalized = normalize_category(image.category_tag)
                if normalized != '기타':
                    category_counts[normalized] += 1
                    continue

            # 2. ai_label에서 카테고리 추출
            if image.ai_label:
                # ai_label을 카테고리로 변환
                inferred_category = extract_category_from_menu_name(image.ai_label)
                if inferred_category != '기타':
                    category_counts[inferred_category] += 1
                    continue

                # 직접 매핑 시도
                normalized = normalize_category(image.ai_label)
                if normalized != '기타':
                    category_counts[normalized] += 1

        logger.info(f"User {self.user.id} gallery category counts: {dict(category_counts)}")
        return dict(category_counts)

    def calculate_category_preferences(self) -> Dict[str, float]:
        """
        갤러리 이미지 기반 카테고리별 선호도 점수 계산

        Recency 가중치 적용: 최근 이미지일수록 높은 가중치 (90일 기준 지수 감소)
        선호도 점수 = (가중치 합계 / 전체 가중치 합계) * 신뢰도

        Returns:
            카테고리별 선호도 점수 (0.0 ~ 1.0)
        """
        from django.utils import timezone

        # 갤러리 이미지 직접 조회 (recency 계산 위해)
        gallery_images = UserGalleryImage.objects.filter(user=self.user)

        if not gallery_images.exists():
            return {}

        now = timezone.now()
        category_weighted_counts = Counter()
        category_raw_counts = Counter()

        for image in gallery_images:
            # 카테고리 추출
            category = None

            if image.category_tag:
                category = normalize_category(image.category_tag)
                if category == '기타' and image.ai_label:
                    category = extract_category_from_menu_name(image.ai_label)
            elif image.ai_label:
                category = extract_category_from_menu_name(image.ai_label)
                if category == '기타':
                    category = normalize_category(image.ai_label)

            if not category or category == '기타':
                continue

            # Recency 가중치 계산 (90일 기준 지수 감소, 최소 0.1)
            days_old = (now - image.created_at).days
            recency_weight = max(0.1, 1.0 - (days_old / 90))

            category_weighted_counts[category] += recency_weight
            category_raw_counts[category] += 1

        total_weight = sum(category_weighted_counts.values())
        total_count = sum(category_raw_counts.values())

        if total_count < GALLERY_MIN_IMAGES_FOR_PREFERENCE:
            logger.info(f"User {self.user.id}: Not enough gallery images for preference ({total_count} < {GALLERY_MIN_IMAGES_FOR_PREFERENCE})")
            return {}

        if total_weight == 0:
            return {}

        preferences = {}
        for category, weighted_count in category_weighted_counts.items():
            # Recency 가중치가 적용된 비율
            ratio = weighted_count / total_weight

            # 유의미한 개수에 따른 신뢰도 가중치
            raw_count = category_raw_counts[category]
            confidence = min(raw_count / GALLERY_SIGNIFICANT_CATEGORY_THRESHOLD, 1.0)

            # 최종 선호도 점수
            preferences[category] = round(ratio * confidence, 3)

        # 점수 기준 내림차순 정렬
        preferences = dict(sorted(preferences.items(), key=lambda x: x[1], reverse=True))

        logger.info(f"User {self.user.id} gallery category preferences (with recency): {preferences}")
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

    def calculate_exploration_tendency(self) -> Dict[str, any]:
        """
        갤러리 이미지 카테고리 분포를 기반으로 음식 탐험 성향 분석

        분석 방법:
        - 엔트로피(다양성 지수) 계산: 카테고리가 고르게 분포될수록 높음
        - 집중도 계산: 상위 1-2개 카테고리에 집중될수록 높음

        Returns:
            {
                'total_images': 20,
                'unique_categories': 5,
                'entropy': 0.85,           # 0~1, 높을수록 다양함
                'concentration': 0.3,      # 0~1, 높을수록 집중됨
                'dominant_categories': ['중식', '한식'],  # 상위 카테고리
                'exploration_tendency': 'diverse',  # 'diverse' or 'focused'
                'suggested_exploration_preference': 3.5  # 0~5
            }
        """
        category_counts = self.get_gallery_category_counts()
        total_images = sum(category_counts.values())

        if total_images < GALLERY_MIN_IMAGES_FOR_EXPLORATION:
            logger.info(f"User {self.user.id}: Not enough images for exploration analysis ({total_images} < {GALLERY_MIN_IMAGES_FOR_EXPLORATION})")
            return {
                'total_images': total_images,
                'unique_categories': len(category_counts),
                'entropy': 0.5,
                'concentration': 0.5,
                'dominant_categories': [],
                'exploration_tendency': 'unknown',
                'suggested_exploration_preference': None,  # 조정하지 않음
                'sufficient_data': False
            }

        unique_categories = len(category_counts)

        # 1. 엔트로피 계산 (Shannon entropy, normalized)
        entropy = 0.0
        if unique_categories > 1:
            for count in category_counts.values():
                if count > 0:
                    prob = count / total_images
                    entropy -= prob * math.log2(prob)
            # Normalize by max entropy (log2 of number of categories)
            max_entropy = math.log2(unique_categories)
            entropy = entropy / max_entropy if max_entropy > 0 else 0.0
        else:
            entropy = 0.0  # 단일 카테고리면 엔트로피 0

        # 2. 집중도 계산 (상위 2개 카테고리가 차지하는 비율)
        sorted_counts = sorted(category_counts.values(), reverse=True)
        top_2_count = sum(sorted_counts[:2]) if len(sorted_counts) >= 2 else sum(sorted_counts)
        concentration = top_2_count / total_images if total_images > 0 else 0.0

        # 3. 지배적 카테고리 추출 (전체의 20% 이상 차지하는 카테고리)
        dominant_categories = [
            cat for cat, count in category_counts.items()
            if count / total_images >= 0.2
        ]
        # 점수 기준 정렬
        dominant_categories = sorted(
            dominant_categories,
            key=lambda x: category_counts[x],
            reverse=True
        )[:3]  # 최대 3개

        # 4. 탐험 성향 판단
        # 높은 엔트로피 + 낮은 집중도 = 다양성 (새로운 것을 먹음)
        # 낮은 엔트로피 + 높은 집중도 = 관련성 (먹던 것만 먹음)
        if entropy >= 0.7 and concentration <= 0.5:
            exploration_tendency = 'diverse'
            suggested_preference = 3.5 + (entropy - 0.7) * 5  # 3.5 ~ 5.0
        elif entropy <= 0.4 or concentration >= 0.7:
            exploration_tendency = 'focused'
            suggested_preference = 1.0 + entropy * 2.5  # 1.0 ~ 2.0
        else:
            exploration_tendency = 'balanced'
            suggested_preference = 2.0 + entropy * 1.5  # 2.0 ~ 3.5

        # 범위 제한 (0 ~ 5)
        suggested_preference = max(0.0, min(5.0, suggested_preference))

        result = {
            'total_images': total_images,
            'unique_categories': unique_categories,
            'entropy': round(entropy, 3),
            'concentration': round(concentration, 3),
            'dominant_categories': dominant_categories,
            'exploration_tendency': exploration_tendency,
            'suggested_exploration_preference': round(suggested_preference, 2),
            'sufficient_data': True
        }

        logger.info(f"User {self.user.id} exploration tendency: {result}")
        return result

    def update_user_preferences_from_gallery(self) -> Dict[str, any]:
        """
        갤러리 이미지 분석 결과를 사용자 선호도에 반영

        1. favorite_cuisines에 갤러리 기반 선호 카테고리 추가
        2. exploration_preference 조정 (선택적)

        Returns:
            업데이트 결과 요약
        """
        try:
            user_pref, created = UserPreference.objects.get_or_create(
                user=self.user,
                defaults={'favorite_cuisines': [], 'exploration_preference': 2.5}
            )

            updates = {
                'cuisines_added': [],
                'exploration_adjusted': False,
                'old_exploration': user_pref.exploration_preference,
                'new_exploration': user_pref.exploration_preference,
            }

            # 1. 갤러리 기반 선호 카테고리를 favorite_cuisines에 추가
            gallery_top_categories = set(self.get_top_preferred_categories(top_n=5))
            existing_cuisines = set(user_pref.favorite_cuisines or [])

            new_cuisines = gallery_top_categories - existing_cuisines
            if new_cuisines:
                merged_cuisines = list(existing_cuisines | gallery_top_categories)[:10]
                user_pref.favorite_cuisines = merged_cuisines
                updates['cuisines_added'] = list(new_cuisines)

            # 2. 탐험 성향 분석 및 exploration_preference 조정
            exploration_analysis = self.calculate_exploration_tendency()

            if exploration_analysis.get('sufficient_data') and exploration_analysis.get('suggested_exploration_preference') is not None:
                suggested = exploration_analysis['suggested_exploration_preference']
                current = user_pref.exploration_preference

                # 갤러리 기반 값과 현재 값의 가중 평균
                # 갤러리 데이터가 많을수록 갤러리 값에 더 가중치
                total_images = exploration_analysis.get('total_images', 0)
                gallery_weight = min(total_images / 20, 0.7)  # 최대 70% 가중치

                new_exploration = (current * (1 - gallery_weight)) + (suggested * gallery_weight)
                new_exploration = round(max(0.0, min(5.0, new_exploration)), 2)

                if abs(new_exploration - current) > 0.1:
                    user_pref.exploration_preference = new_exploration
                    updates['exploration_adjusted'] = True
                    updates['new_exploration'] = new_exploration

            # 저장
            update_fields = []
            if updates['cuisines_added']:
                update_fields.append('favorite_cuisines')
            if updates['exploration_adjusted']:
                update_fields.append('exploration_preference')

            if update_fields:
                user_pref.save(update_fields=update_fields)
                logger.info(f"Updated user {self.user.id} preferences from gallery: {updates}")

            return updates

        except Exception as e:
            logger.error(f"Error updating preferences from gallery for user {self.user.id}: {e}")
            return {'error': str(e)}

    def get_gallery_category_preference_profile(self) -> Dict:
        """
        갤러리 기반 카테고리 선호도 프로필 반환

        Returns:
            {
                'category_counts': {'중식': 10, '한식': 5},
                'category_preferences': {'중식': 0.667, '한식': 0.333},
                'top_categories': ['중식', '한식'],
                'total_images': 15,
                'exploration_analysis': { ... }
            }
        """
        counts = self.get_gallery_category_counts()
        preferences = self.calculate_category_preferences()
        top_categories = self.get_top_preferred_categories()
        exploration_analysis = self.calculate_exploration_tendency()

        return {
            'category_counts': counts,
            'category_preferences': preferences,
            'top_categories': top_categories,
            'total_images': sum(counts.values()),
            'exploration_analysis': exploration_analysis
        }


def update_gallery_category_preference_on_upload(user: User):
    """
    사진 업로드 시 갤러리 기반 카테고리 선호도 업데이트 트리거

    Args:
        user: 사용자
    """
    try:
        service = GalleryCategoryPreferenceService(user)
        result = service.update_user_preferences_from_gallery()

        logger.info(f"Updated gallery preferences for user {user.id}: {result}")
        return result

    except Exception as e:
        logger.error(f"Error updating gallery category preference: {e}")
        return None


def get_combined_category_preferences(user: User) -> Dict[str, float]:
    """
    스크랩 + 갤러리 기반 카테고리 선호도 통합

    두 소스의 선호도를 가중 평균으로 결합

    Args:
        user: 사용자

    Returns:
        통합 카테고리 선호도 점수
    """
    try:
        from users.scrap_category_service import ScrapCategoryPreferenceService

        # 스크랩 기반 선호도
        scrap_service = ScrapCategoryPreferenceService(user)
        scrap_prefs = scrap_service.calculate_category_preferences()

        # 갤러리 기반 선호도
        gallery_service = GalleryCategoryPreferenceService(user)
        gallery_prefs = gallery_service.calculate_category_preferences()

        if not scrap_prefs and not gallery_prefs:
            return {}

        # 통합: 갤러리와 스크랩 선호도를 결합 (갤러리 60%, 스크랩 40%)
        # 갤러리 이미지가 사용자의 실제 식습관을 더 직접적으로 반영한다고 가정
        combined = {}
        all_categories = set(scrap_prefs.keys()) | set(gallery_prefs.keys())

        for category in all_categories:
            scrap_score = scrap_prefs.get(category, 0)
            gallery_score = gallery_prefs.get(category, 0)

            # 가중 평균 (갤러리 60%, 스크랩 40%)
            combined_score = (gallery_score * 0.6) + (scrap_score * 0.4)
            if combined_score > 0:
                combined[category] = round(combined_score, 3)

        # 점수 기준 정렬
        combined = dict(sorted(combined.items(), key=lambda x: x[1], reverse=True))

        logger.info(f"User {user.id} combined category preferences: {combined}")
        return combined

    except Exception as e:
        logger.error(f"Error getting combined category preferences: {e}")
        return {}

