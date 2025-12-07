"""
스크랩 관리 통합 테스트 (UAT 기준: Menu Scraping)

UAT 시나리오:
- 스크랩된 메뉴가 없을 때 안내 메시지
- 스크랩된 메뉴 목록 표시
- X 버튼으로 스크랩 삭제
- 추천 탭에서 스크랩 버튼 클릭 시 스크랩 추가/해제
- 로그아웃 후 다시 로그인해도 스크랩 유지
"""

from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal

from users.models import User, UserScrap, UserRemoteScrap
from restaurant.models import Restaurant


# API URL 상수 (reverse 대신 직접 사용)
API_LOGIN_URL = '/api/v1/auth/login/'
API_LOGOUT_URL = '/api/v1/auth/logout/'


# API URL 상수 (Django 기본 auth URL과 충돌 방지)
API_LOGIN_URL = '/api/v1/auth/login/'
API_LOGOUT_URL = '/api/v1/auth/logout/'


class ScrapEmptyStateIntegrationTest(TestCase):
    """스크랩 빈 상태 통합 테스트 (UAT Step 1)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='emptytest',
            email='empty@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_empty_scrap_list(self):
        """스크랩된 메뉴가 없을 때 (UAT Step 1)"""
        response = self.client.get(reverse('scraps-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 0)
        # UI에서 "스크랩된 메뉴가 없습니다" 표시


class ScrapListDisplayIntegrationTest(TestCase):
    """스크랩 목록 표시 통합 테스트 (UAT Step 1)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='listtest',
            email='list@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
        
        # 테스트용 음식점 및 스크랩 생성
        self.restaurant1 = Restaurant.objects.create(
            name='맛있는 한식당',
            address='서울시 관악구 신림동',
            latitude=Decimal('37.477136'),
            longitude=Decimal('126.961986'),
            source='test_001'
        )
        self.restaurant2 = Restaurant.objects.create(
            name='훌륭한 일식당',
            address='서울시 관악구 봉천동',
            source='test_002'
        )
        
        # 스크랩 추가
        UserScrap.objects.create(user=self.user, restaurant=self.restaurant1)
        UserScrap.objects.create(user=self.user, restaurant=self.restaurant2)
    
    def test_scrap_list_with_items(self):
        """스크랩된 메뉴가 있을 때 목록 표시 (UAT Step 1)"""
        response = self.client.get(reverse('scraps-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 2)


class ScrapRemoveByXButtonIntegrationTest(TestCase):
    """X 버튼으로 스크랩 삭제 통합 테스트 (UAT Step 2)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='removetest',
            email='remove@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.restaurant = Restaurant.objects.create(
            name='삭제 테스트 식당',
            source='test_remove_001'
        )
        self.scrap = UserScrap.objects.create(user=self.user, restaurant=self.restaurant)
    
    def test_remove_scrap_by_delete(self):
        """X 버튼 클릭으로 스크랩 삭제 (UAT Step 2)"""
        response = self.client.delete(
            reverse('scraps-detail', kwargs={'pk': self.scrap.id})
        )
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # DB에서 삭제 확인
        self.assertFalse(UserScrap.objects.filter(id=self.scrap.id).exists())
        
        # 목록에서도 제거됨
        list_response = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(list_response.json()), 0)


class ScrapToggleFromRecommendationIntegrationTest(TestCase):
    """추천 탭에서 스크랩 토글 통합 테스트 (UAT Step 3-4)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='toggletest',
            email='toggle@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.restaurant = Restaurant.objects.create(
            name='토글 테스트 식당',
            source='test_toggle_001'
        )
    
    def test_scrap_button_adds_scrap(self):
        """스크랩 버튼 클릭 시 스크랩 추가 (UAT Step 3)"""
        response = self.client.post(
            reverse('scraps-toggle'),
            {'restaurant_id': self.restaurant.id},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.json()['scrapped'])
        
        # DB 확인
        self.assertTrue(
            UserScrap.objects.filter(user=self.user, restaurant=self.restaurant).exists()
        )
        
        # 스크랩 탭에 저장됨
        list_response = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(list_response.json()), 1)
    
    def test_filled_scrap_button_removes_scrap(self):
        """채워진 스크랩 버튼 클릭 시 스크랩 해제 (UAT Step 4)"""
        # 먼저 스크랩 추가
        UserScrap.objects.create(user=self.user, restaurant=self.restaurant)
        
        # 토글로 해제
        response = self.client.post(
            reverse('scraps-toggle'),
            {'restaurant_id': self.restaurant.id},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()['scrapped'])
        
        # DB 확인
        self.assertFalse(
            UserScrap.objects.filter(user=self.user, restaurant=self.restaurant).exists()
        )
        
        # 스크랩 탭에서 제거됨
        list_response = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(list_response.json()), 0)


class ScrapPersistenceAfterLogoutIntegrationTest(TransactionTestCase):
    """로그아웃 후 스크랩 유지 통합 테스트 (UAT Step 5)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='persisttest',
            email='persist@test.com',
            password='testpassword123'
        )
        
        self.restaurant = Restaurant.objects.create(
            name='지속성 테스트 식당',
            source='test_persist_001'
        )
    
    def test_scraps_persist_after_logout_login(self):
        """로그아웃 후 다시 로그인해도 스크랩 유지 (UAT Step 5)"""
        # 로그인
        self.client.force_authenticate(user=self.user)
        
        # 스크랩 추가
        self.client.post(
            reverse('scraps-toggle'),
            {'restaurant_id': self.restaurant.id},
            format='json'
        )
        
        # 스크랩 확인
        list_response = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(list_response.json()), 1)
        
        # 로그아웃
        self.client.post(API_LOGOUT_URL)
        
        # 다시 로그인
        self.client.post(
            API_LOGIN_URL,
            {'username': 'persisttest', 'password': 'testpassword123'},
            format='json'
        )
        
        # 스크랩이 여전히 유지됨
        list_response = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(list_response.json()), 1)


class ScrapCreateIntegrationTest(TestCase):
    """스크랩 생성 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='createtest',
            email='create@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.restaurant = Restaurant.objects.create(
            name='생성 테스트 식당',
            source='test_create_001'
        )
    
    def test_create_scrap(self):
        """스크랩 생성"""
        response = self.client.post(
            reverse('scraps-list'),
            {'restaurant_id': self.restaurant.id},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.json())
    
    def test_create_scrap_requires_restaurant_id(self):
        """restaurant_id 필수"""
        response = self.client.post(
            reverse('scraps-list'),
            {},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_prevent_duplicate_scrap(self):
        """중복 스크랩 방지"""
        # 첫 번째 스크랩
        self.client.post(
            reverse('scraps-list'),
            {'restaurant_id': self.restaurant.id},
            format='json'
        )
        
        # 두 번째 스크랩 시도
        response = self.client.post(
            reverse('scraps-list'),
            {'restaurant_id': self.restaurant.id},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ScrapUserIsolationIntegrationTest(TestCase):
    """스크랩 사용자 격리 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.user1 = User.objects.create_user(
            username='user1', email='user1@test.com', password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='user2', email='user2@test.com', password='testpass123'
        )
        
        self.restaurant = Restaurant.objects.create(
            name='격리 테스트 식당',
            source='test_iso_001'
        )
        
        # user1의 스크랩
        self.user1_scrap = UserScrap.objects.create(user=self.user1, restaurant=self.restaurant)
    
    def test_user_can_only_see_own_scraps(self):
        """사용자는 자신의 스크랩만 볼 수 있음"""
        # user1로 조회 - 1개
        self.client.force_authenticate(user=self.user1)
        response1 = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(response1.json()), 1)
        
        # user2로 조회 - 0개
        self.client.force_authenticate(user=self.user2)
        response2 = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(response2.json()), 0)
    
    def test_user_cannot_delete_others_scrap(self):
        """다른 사용자의 스크랩 삭제 불가"""
        self.client.force_authenticate(user=self.user2)
        
        response = self.client.delete(
            reverse('scraps-detail', kwargs={'pk': self.user1_scrap.id})
        )
        
        # 404 (자신의 스크랩 쿼리셋에서 찾을 수 없음)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 스크랩 여전히 존재
        self.assertTrue(UserScrap.objects.filter(id=self.user1_scrap.id).exists())


class ScrapAuthenticationIntegrationTest(TestCase):
    """스크랩 인증 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.restaurant = Restaurant.objects.create(
            name='인증 테스트 식당',
            source='test_auth_001'
        )
    
    def test_scrap_requires_authentication(self):
        """스크랩 API는 인증 필요"""
        # 인증 없이 목록 조회
        response = self.client.get(reverse('scraps-list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 인증 없이 스크랩 추가
        response = self.client.post(
            reverse('scraps-list'),
            {'restaurant_id': self.restaurant.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 인증 없이 토글
        response = self.client.post(
            reverse('scraps-toggle'),
            {'restaurant_id': self.restaurant.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class RemoteScrapSyncIntegrationTest(TestCase):
    """원격 스크랩 동기화 통합 테스트 (앱 재설치 시 복원용)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='remotescrap',
            email='remote@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_sync_scraps_to_remote(self):
        """스크랩 원격 동기화"""
        scraps_data = {
            'scraps': [
                {
                    'menu_id': 'menu_001',
                    'menu_name': '김치찌개',
                    'place_name': '한식당',
                    'price': 8000,
                    'category': '한식',
                    'location': '서울 관악구',
                },
                {
                    'menu_id': 'menu_002',
                    'menu_name': '된장찌개',
                    'place_name': '한식당',
                    'price': 7500,
                    'category': '한식',
                    'location': '서울 관악구',
                }
            ]
        }
        
        response = self.client.post(
            reverse('remote-scraps-list'),
            scraps_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['created'], 2)
    
    def test_retrieve_synced_scraps(self):
        """동기화된 스크랩 조회"""
        # 먼저 동기화
        self.client.post(
            reverse('remote-scraps-list'),
            {
                'scraps': [{
                    'menu_id': 'menu_003',
                    'menu_name': '라멘',
                    'place_name': '일식당',
                    'category': '일식',
                }]
            },
            format='json'
        )
        
        # 조회
        response = self.client.get(reverse('remote-scraps-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['menu_name'], '라멘')


class ScrapCompleteFlowIntegrationTest(TransactionTestCase):
    """스크랩 전체 플로우 통합 테스트 (UAT 전체 시나리오)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='flowtest',
            email='flow@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.restaurant1 = Restaurant.objects.create(
            name='플로우 테스트 식당1',
            source='test_flow_001'
        )
        self.restaurant2 = Restaurant.objects.create(
            name='플로우 테스트 식당2',
            source='test_flow_002'
        )
    
    def test_complete_scrap_flow(self):
        """
        전체 스크랩 플로우 (UAT Menu Scraping):
        1. 빈 스크랩 목록 확인
        2. 추천에서 스크랩 버튼 클릭 → 스크랩 추가
        3. 스크랩 탭에서 확인
        4. 스크랩 버튼 다시 클릭 → 스크랩 해제
        5. X 버튼으로 삭제
        """
        # ===== Step 1: 빈 스크랩 목록 확인 =====
        list_response = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(list_response.json()), 0)
        
        # ===== Step 2: 추천에서 스크랩 버튼 클릭 → 스크랩 추가 =====
        toggle_response = self.client.post(
            reverse('scraps-toggle'),
            {'restaurant_id': self.restaurant1.id},
            format='json'
        )
        self.assertEqual(toggle_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(toggle_response.json()['scrapped'])
        
        # ===== Step 3: 스크랩 탭에서 확인 =====
        list_response = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(list_response.json()), 1)
        
        # 두 번째 식당도 스크랩
        self.client.post(
            reverse('scraps-toggle'),
            {'restaurant_id': self.restaurant2.id},
            format='json'
        )
        list_response = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(list_response.json()), 2)
        
        # ===== Step 4: 스크랩 버튼 다시 클릭 → 스크랩 해제 =====
        toggle_response = self.client.post(
            reverse('scraps-toggle'),
            {'restaurant_id': self.restaurant1.id},
            format='json'
        )
        self.assertEqual(toggle_response.status_code, status.HTTP_200_OK)
        self.assertFalse(toggle_response.json()['scrapped'])
        
        list_response = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(list_response.json()), 1)
        
        # ===== Step 5: X 버튼으로 삭제 =====
        scrap = UserScrap.objects.get(user=self.user, restaurant=self.restaurant2)
        delete_response = self.client.delete(
            reverse('scraps-detail', kwargs={'pk': scrap.id})
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        
        list_response = self.client.get(reverse('scraps-list'))
        self.assertEqual(len(list_response.json()), 0)
