"""
온보딩 플로우 통합 테스트 (UAT 기준)

UAT 시나리오:
- 단 걸 좋아하시나요 (sweetness preference)
- 매운 걸 좋아하시나요 (spiciness preference)
- 짜게 드시는 편인가요 (saltiness preference)
- 새로운 음식을 좋아하시나요 (exploration preference)
- 알러지 선택
- 싫어하는 재료 선택
- 좋아하는 음식 선택
"""

from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from users.models import User, UserPreference


# API URL 상수
API_REGISTER_URL = '/api/v1/auth/register/'


class OnboardingTastePreferenceIntegrationTest(TransactionTestCase):
    """온보딩 취향 설정 통합 테스트 (UAT Step 5-12)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='onboardingtest',
            email='onboarding@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_complete_taste_preference_flow(self):
        """
        전체 취향 설정 플로우 (UAT Step 5-16):
        1. 단맛 선호도 설정 (매우 좋아해요)
        2. 매운맛 선호도 설정 (평범해요)
        3. 짠맛 선호도 설정 (싱겁게 먹어요)
        4. 탐험 선호도 설정
        5. 알러지 설정 (달걀)
        6. 싫어하는 재료 설정 (버섯)
        7. 좋아하는 음식 설정 (이탈리안, 멕시칸)
        8. 완료 확인
        """
        # ===== Step 1: 취향 설정 생성 (모든 필드) =====
        preference_data = {
            'sweet_level': 4,  # 매우 좋아해요 (1-5 scale assumed)
            'spicy_level': 3,  # 평범해요
            'salty_level': 1,  # 싱겁게 먹어요
            'exploration_preference': 4,  # 새로운 음식 좋아해요
            'allergies': ['달걀'],
            'disliked_ingredients': ['버섯'],
            'favorite_cuisines': ['이탈리안', '멕시칸']
        }
        
        create_response = self.client.post(
            reverse('onboarding-list'),
            preference_data,
            format='json'
        )
        
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        
        # ===== 저장된 값 확인 =====
        self.assertEqual(create_response.json()['sweet_level'], 4)
        self.assertEqual(create_response.json()['spicy_level'], 3)
        self.assertEqual(create_response.json()['salty_level'], 1)
        self.assertIn('달걀', create_response.json()['allergies'])
        self.assertIn('버섯', create_response.json()['disliked_ingredients'])
        self.assertIn('이탈리안', create_response.json()['favorite_cuisines'])
        
        # ===== DB 확인 =====
        preference = UserPreference.objects.get(user=self.user)
        self.assertEqual(preference.sweet_level, 4)
        self.assertEqual(preference.spicy_level, 3)
        self.assertEqual(preference.salty_level, 1)
    
    def test_sweetness_preference_setting(self):
        """단맛 선호도 설정 (UAT Step 5-6)"""
        response = self.client.post(
            reverse('onboarding-list'),
            {'sweet_level': 5},  # 매우 좋아해요
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['sweet_level'], 5)
    
    def test_spiciness_preference_setting(self):
        """매운맛 선호도 설정 (UAT Step 7-8)"""
        response = self.client.post(
            reverse('onboarding-list'),
            {'spicy_level': 3},  # 평범해요
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['spicy_level'], 3)
    
    def test_saltiness_preference_setting(self):
        """짠맛 선호도 설정 (UAT Step 9-10)"""
        response = self.client.post(
            reverse('onboarding-list'),
            {'salty_level': 1},  # 싱겁게 먹어요
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['salty_level'], 1)
    
    def test_exploration_preference_setting(self):
        """새로운 음식 선호도 설정 (UAT Step 11-12)"""
        response = self.client.post(
            reverse('onboarding-list'),
            {'exploration_preference': 4},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class OnboardingAllergyIntegrationTest(TestCase):
    """온보딩 알러지 설정 통합 테스트 (UAT Step 13)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='allergytest',
            email='allergy@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_set_no_allergies(self):
        """알러지 없음 설정 (UAT Step 13 - 선택 안 함)"""
        response = self.client.post(
            reverse('onboarding-list'),
            {
                'spicy_level': 3,
                'allergies': []  # 알러지 없음
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['allergies'], [])
    
    def test_set_single_allergy(self):
        """단일 알러지 설정 (UAT Step 13 - 달걀)"""
        response = self.client.post(
            reverse('onboarding-list'),
            {
                'spicy_level': 3,
                'allergies': ['달걀']
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('달걀', response.json()['allergies'])
    
    def test_set_multiple_allergies(self):
        """다중 알러지 설정"""
        response = self.client.post(
            reverse('onboarding-list'),
            {
                'spicy_level': 3,
                'allergies': ['달걀', '땅콩', '갑각류', '우유']
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.json()['allergies']), 4)


class OnboardingDislikedIngredientsIntegrationTest(TestCase):
    """온보딩 싫어하는 재료 설정 통합 테스트 (UAT Step 14)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='disliketest',
            email='dislike@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_set_no_disliked_ingredients(self):
        """싫어하는 재료 없음 (UAT Step 14 - 선택 안 함)"""
        response = self.client.post(
            reverse('onboarding-list'),
            {
                'spicy_level': 3,
                'disliked_ingredients': []
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['disliked_ingredients'], [])
    
    def test_set_disliked_ingredient(self):
        """싫어하는 재료 설정 (UAT Step 14 - 버섯)"""
        response = self.client.post(
            reverse('onboarding-list'),
            {
                'spicy_level': 3,
                'disliked_ingredients': ['버섯']
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('버섯', response.json()['disliked_ingredients'])
    
    def test_set_multiple_disliked_ingredients(self):
        """다중 싫어하는 재료 설정"""
        response = self.client.post(
            reverse('onboarding-list'),
            {
                'spicy_level': 3,
                'disliked_ingredients': ['버섯', '고수', '민트', '파슬리']
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.json()['disliked_ingredients']), 4)


class OnboardingFavoriteCuisinesIntegrationTest(TestCase):
    """온보딩 좋아하는 음식 설정 통합 테스트 (UAT Step 15)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='cuisinetest',
            email='cuisine@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_set_no_favorite_cuisines(self):
        """좋아하는 음식 없음 (UAT Step 15 - 선택 안 함)"""
        response = self.client.post(
            reverse('onboarding-list'),
            {
                'spicy_level': 3,
                'favorite_cuisines': []
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['favorite_cuisines'], [])
    
    def test_set_favorite_cuisines(self):
        """좋아하는 음식 설정 (UAT Step 15 - 이탈리안, 멕시칸)"""
        response = self.client.post(
            reverse('onboarding-list'),
            {
                'spicy_level': 3,
                'favorite_cuisines': ['이탈리안', '멕시칸']
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('이탈리안', response.json()['favorite_cuisines'])
        self.assertIn('멕시칸', response.json()['favorite_cuisines'])


class OnboardingPreferenceUpdateIntegrationTest(TestCase):
    """온보딩 취향 수정 통합 테스트 (뒤로 버튼으로 수정)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='updatetest',
            email='update@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
        
        # 초기 취향 설정
        self.preference = UserPreference.objects.create(
            user=self.user,
            sweet_level=3,
            spicy_level=3,
            salty_level=3,
            allergies=['달걀'],
            disliked_ingredients=['버섯'],
            favorite_cuisines=['한식']
        )
    
    def test_update_taste_preferences(self):
        """취향 수정 (UAT Step 7, 9, 11 - 뒤로 버튼 후 수정)"""
        # 단맛만 수정
        response = self.client.patch(
            reverse('onboarding-update-preferences'),
            {'sweet_level': 5},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['sweet_level'], 5)
        # 다른 값은 유지
        self.assertEqual(response.json()['spicy_level'], 3)
    
    def test_update_allergies(self):
        """알러지 수정"""
        response = self.client.patch(
            reverse('onboarding-update-preferences'),
            {'allergies': ['달걀', '땅콩']},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()['allergies']), 2)
    
    def test_update_disliked_ingredients(self):
        """싫어하는 재료 수정"""
        response = self.client.patch(
            reverse('onboarding-update-preferences'),
            {'disliked_ingredients': ['버섯', '고수']},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()['disliked_ingredients']), 2)
    
    def test_update_favorite_cuisines(self):
        """좋아하는 음식 수정"""
        response = self.client.patch(
            reverse('onboarding-update-preferences'),
            {'favorite_cuisines': ['한식', '일식', '중식']},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()['favorite_cuisines']), 3)


class OnboardingPreferenceRetrievalIntegrationTest(TestCase):
    """온보딩 취향 조회 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='retrievetest',
            email='retrieve@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_get_preferences_when_not_set(self):
        """취향 설정이 없을 때 조회"""
        response = self.client.get(reverse('onboarding-list'))
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_preferences_when_set(self):
        """취향 설정이 있을 때 조회"""
        # 먼저 생성
        UserPreference.objects.create(
            user=self.user,
            sweet_level=4,
            spicy_level=3,
            salty_level=2,
            allergies=['땅콩'],
            disliked_ingredients=['고수'],
            favorite_cuisines=['한식', '일식']
        )
        
        response = self.client.get(reverse('onboarding-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['sweet_level'], 4)
        self.assertEqual(response.json()['spicy_level'], 3)
        self.assertIn('땅콩', response.json()['allergies'])


class OnboardingAuthenticationIntegrationTest(TestCase):
    """온보딩 인증 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_onboarding_requires_authentication(self):
        """온보딩 API는 인증 필요"""
        # 인증 없이 취향 조회
        response = self.client.get(reverse('onboarding-list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 인증 없이 취향 생성
        response = self.client.post(
            reverse('onboarding-list'),
            {'spicy_level': 3},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class NewUserOnboardingFlowIntegrationTest(TransactionTestCase):
    """신규 사용자 온보딩 전체 플로우 (UAT 전체 시나리오)"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_new_user_complete_onboarding(self):
        """
        신규 사용자 전체 온보딩 (UAT Step 1-16):
        1. 회원가입
        2. 취향 설정 (단맛 → 매운맛 → 짠맛 → 탐험 → 알러지 → 싫어하는 재료 → 좋아하는 음식)
        3. 완료 확인
        """
        # ===== Step 1: 회원가입 =====
        register_response = self.client.post(
            API_REGISTER_URL,
            {
                'username': 'newuser',
                'email': 'newuser@test.com',
                'password': 'testpassword123'
            },
            format='json'
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        
        # ===== Step 2: 취향 설정 (UAT 전체 플로우 시뮬레이션) =====
        preference_response = self.client.post(
            reverse('onboarding-list'),
            {
                'sweet_level': 4,       # 단 걸 좋아해요
                'spicy_level': 3,       # 평범해요
                'salty_level': 1,       # 싱겁게 먹어요
                'exploration_preference': 4,  # 새로운 음식 좋아해요
                'allergies': ['달걀'],
                'disliked_ingredients': ['버섯'],
                'favorite_cuisines': ['이탈리안', '멕시칸']
            },
            format='json'
        )
        self.assertEqual(preference_response.status_code, status.HTTP_201_CREATED)
        
        # ===== Step 3: 완료 확인 =====
        get_response = self.client.get(reverse('onboarding-list'))
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        
        # 모든 값 저장 확인
        data = get_response.json()
        self.assertEqual(data['sweet_level'], 4)
        self.assertEqual(data['spicy_level'], 3)
        self.assertEqual(data['salty_level'], 1)
        self.assertIn('달걀', data['allergies'])
        self.assertIn('버섯', data['disliked_ingredients'])
        self.assertIn('이탈리안', data['favorite_cuisines'])
