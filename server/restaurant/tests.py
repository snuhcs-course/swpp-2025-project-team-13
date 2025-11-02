from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal

from .models import Restaurant, RestaurantMenu
from menu.models import Menu, MenuCandidate
from users.models import User


class RestaurantModelTests(TestCase):
    """Restaurant 모델 테스트"""
    
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name="테스트 음식점",
            address="서울시 관악구 테스트로 123",
            latitude=Decimal("37.477136"),
            longitude=Decimal("126.961986"),
            phone="02-1234-5678",
            image_url="http://example.com/image.jpg",
            source="test_source_001"
        )
    
    def test_restaurant_creation(self):
        """식당 생성 테스트"""
        self.assertEqual(self.restaurant.name, "테스트 음식점")
        self.assertEqual(self.restaurant.address, "서울시 관악구 테스트로 123")
        self.assertEqual(self.restaurant.latitude, Decimal("37.477136"))
        self.assertEqual(self.restaurant.longitude, Decimal("126.961986"))
        self.assertEqual(self.restaurant.phone, "02-1234-5678")
        self.assertIsNotNone(self.restaurant.created_at)
    
    def test_restaurant_str_method(self):
        """식당 __str__ 메서드 테스트"""
        expected = f"테스트 음식점 (ID: {self.restaurant.id})"
        self.assertEqual(str(self.restaurant), expected)
    
    def test_restaurant_source_unique(self):
        """source 필드 unique 제약 테스트"""
        from django.db import IntegrityError
        
        with self.assertRaises(IntegrityError):
            Restaurant.objects.create(
                name="중복 소스 식당",
                source="test_source_001"  # 중복된 source
            )
    
    def test_restaurant_optional_fields(self):
        """선택 필드가 비어있어도 생성 가능한지 테스트"""
        restaurant = Restaurant.objects.create(
            name="최소 정보 식당",
            source="test_source_002"
        )
        self.assertEqual(restaurant.name, "최소 정보 식당")
        self.assertEqual(restaurant.address, "")
        self.assertIsNone(restaurant.latitude)
        self.assertIsNone(restaurant.longitude)
        self.assertIsNone(restaurant.phone)
        self.assertIsNone(restaurant.image_url)


class RestaurantMenuModelTests(TestCase):
    """RestaurantMenu 모델 테스트"""
    
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name="테스트 식당",
            source="test_rest_001"
        )
        self.menu = Menu.objects.create(
            name="테스트 메뉴",
            category="한식"
        )
    
    def test_restaurant_menu_creation(self):
        """식당-메뉴 관계 생성 테스트"""
        restaurant_menu = RestaurantMenu.objects.create(
            restaurant=self.restaurant,
            menu=self.menu
        )
        self.assertEqual(restaurant_menu.restaurant, self.restaurant)
        self.assertEqual(restaurant_menu.menu, self.menu)
    
    def test_restaurant_menu_str_method(self):
        """RestaurantMenu __str__ 메서드 테스트"""
        restaurant_menu = RestaurantMenu.objects.create(
            restaurant=self.restaurant,
            menu=self.menu
        )
        expected = f"{self.restaurant.name} - {self.menu}"
        self.assertEqual(str(restaurant_menu), expected)
    
    def test_restaurant_menu_unique_constraint(self):
        """식당-메뉴 쌍 unique 제약 테스트"""
        from django.db import IntegrityError
        
        # 첫 번째 생성은 성공
        RestaurantMenu.objects.create(
            restaurant=self.restaurant,
            menu=self.menu
        )
        
        # 같은 쌍으로 다시 생성하면 실패
        with self.assertRaises(IntegrityError):
            RestaurantMenu.objects.create(
                restaurant=self.restaurant,
                menu=self.menu
            )
    
    def test_restaurant_cascade_delete(self):
        """식당 삭제 시 관계도 삭제되는지 테스트"""
        RestaurantMenu.objects.create(
            restaurant=self.restaurant,
            menu=self.menu
        )
        
        restaurant_menu_count = RestaurantMenu.objects.filter(restaurant=self.restaurant).count()
        self.assertEqual(restaurant_menu_count, 1)
        
        # 식당 삭제
        self.restaurant.delete()
        
        # 관계도 삭제되어야 함
        restaurant_menu_count = RestaurantMenu.objects.filter(menu=self.menu).count()
        self.assertEqual(restaurant_menu_count, 0)


class RestaurantViewSetTests(TestCase):
    """RestaurantViewSet API 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        
        # 테스트용 식당 데이터 생성
        self.restaurant1 = Restaurant.objects.create(
            name="맛있는 한식당",
            address="서울시 관악구 신림동 123",
            latitude=Decimal("37.477136"),
            longitude=Decimal("126.961986"),
            phone="02-111-2222",
            image_url="http://example.com/rest1.jpg",
            source="test_rest_001"
        )
        
        self.restaurant2 = Restaurant.objects.create(
            name="멋진 중식당",
            address="서울시 관악구 봉천동 456",
            latitude=Decimal("37.480000"),
            longitude=Decimal("126.950000"),
            phone="02-333-4444",
            source="test_rest_002"
        )
        
        self.restaurant3 = Restaurant.objects.create(
            name="훌륭한 일식당",
            address="서울시 관악구 낙성대 789",
            latitude=Decimal("37.476000"),
            longitude=Decimal("126.963000"),
            image_url="http://example.com/rest3.jpg",
            source="test_rest_003"
        )
        
        # 메뉴 후보 생성
        self.menu1 = MenuCandidate.objects.create(
            restaurant=self.restaurant1,
            name="김치찌개",
            price=Decimal("8000"),
            image_url="http://example.com/kimchi.jpg"
        )
        
        self.menu2 = MenuCandidate.objects.create(
            restaurant=self.restaurant1,
            name="된장찌개",
            price=Decimal("7500")
        )
    
    def authenticate(self):
        """사용자 인증"""
        self.client.force_authenticate(user=self.user)
    
    def test_requires_authentication(self):
        """인증 필요 테스트"""
        # 인증 없이 목록 조회
        response = self.client.get(reverse('restaurants-list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 인증 없이 상세 조회
        response = self.client.get(
            reverse('restaurants-detail', kwargs={'pk': self.restaurant1.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_list_restaurants(self):
        """식당 목록 조회 테스트"""
        self.authenticate()
        
        response = self.client.get(reverse('restaurants-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Pagination이 적용된 경우와 아닌 경우 모두 처리
        if isinstance(response.data, dict) and 'results' in response.data:
            results = response.data['results']
        else:
            results = response.data
        
        self.assertGreaterEqual(len(results), 3)
        
        # 첫 번째 식당 데이터 검증
        restaurant_names = [r['name'] for r in results]
        self.assertIn("맛있는 한식당", restaurant_names)
        self.assertIn("멋진 중식당", restaurant_names)
        self.assertIn("훌륭한 일식당", restaurant_names)
    
    def test_retrieve_restaurant(self):
        """식당 상세 조회 테스트"""
        self.authenticate()
        
        response = self.client.get(
            reverse('restaurants-detail', kwargs={'pk': self.restaurant1.pk})
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "맛있는 한식당")
        self.assertEqual(response.data['address'], "서울시 관악구 신림동 123")
        self.assertEqual(response.data['phone'], "02-111-2222")
        self.assertEqual(
            response.data['image_url'], 
            "http://example.com/rest1.jpg"
        )
    
    def test_retrieve_restaurant_with_menus(self):
        """식당 상세 조회 시 메뉴 포함 테스트"""
        self.authenticate()
        
        response = self.client.get(
            reverse('restaurants-detail', kwargs={'pk': self.restaurant1.pk})
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('menus', response.data)
        self.assertEqual(len(response.data['menus']), 2)
        
        # 메뉴 데이터 검증
        menu_names = [m['name'] for m in response.data['menus']]
        self.assertIn("김치찌개", menu_names)
        self.assertIn("된장찌개", menu_names)
        
        # 김치찌개 상세 정보 검증
        kimchi = next(m for m in response.data['menus'] if m['name'] == "김치찌개")
        self.assertEqual(kimchi['price'], "8000.00")
        self.assertEqual(kimchi['image_url'], "http://example.com/kimchi.jpg")
    
    def test_retrieve_restaurant_without_menus(self):
        """메뉴가 없는 식당 상세 조회 테스트"""
        self.authenticate()
        
        response = self.client.get(
            reverse('restaurants-detail', kwargs={'pk': self.restaurant2.pk})
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('menus', response.data)
        self.assertEqual(len(response.data['menus']), 0)
    
    def test_retrieve_nonexistent_restaurant(self):
        """존재하지 않는 식당 조회 테스트"""
        self.authenticate()
        
        response = self.client.get(
            reverse('restaurants-detail', kwargs={'pk': 99999})
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_readonly_viewset_post_not_allowed(self):
        """POST 요청 불가 테스트 (읽기 전용)"""
        self.authenticate()
        
        data = {
            'name': '새로운 식당',
            'source': 'new_source'
        }
        
        response = self.client.post(reverse('restaurants-list'), data)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_readonly_viewset_put_not_allowed(self):
        """PUT 요청 불가 테스트 (읽기 전용)"""
        self.authenticate()
        
        data = {
            'name': '수정된 식당',
            'source': 'test_rest_001'
        }
        
        response = self.client.put(
            reverse('restaurants-detail', kwargs={'pk': self.restaurant1.pk}),
            data
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_readonly_viewset_delete_not_allowed(self):
        """DELETE 요청 불가 테스트 (읽기 전용)"""
        self.authenticate()
        
        response = self.client.delete(
            reverse('restaurants-detail', kwargs={'pk': self.restaurant1.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_list_response_fields(self):
        """목록 응답 필드 검증"""
        self.authenticate()
        
        response = self.client.get(reverse('restaurants-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Pagination이 적용된 경우와 아닌 경우 모두 처리
        if isinstance(response.data, dict) and 'results' in response.data:
            results = response.data['results']
        else:
            results = response.data
        
        self.assertGreater(len(results), 0, "식당 데이터가 없습니다")
        
        # 첫 번째 항목 필드 검증
        first_restaurant = results[0]
        required_fields = [
            'id', 'name', 'address', 'latitude', 'longitude',
            'phone', 'image_url', 'source', 'created_at'
        ]
        
        for field in required_fields:
            self.assertIn(field, first_restaurant)
    
    def test_detail_response_fields(self):
        """상세 응답 필드 검증"""
        self.authenticate()
        
        response = self.client.get(
            reverse('restaurants-detail', kwargs={'pk': self.restaurant1.pk})
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        required_fields = [
            'id', 'name', 'address', 'latitude', 'longitude',
            'phone', 'image_url', 'source', 'created_at', 'menus'
        ]
        
        for field in required_fields:
            self.assertIn(field, response.data)
    
    def test_filter_by_user_isolation(self):
        """사용자별 데이터 격리가 필요하지 않음 (공용 데이터)"""
        # 다른 사용자 생성
        other_user = User.objects.create_user(
            username='otheruser',
            password='otherpass123',
            email='other@example.com'
        )
        
        # 첫 번째 사용자로 조회
        self.authenticate()
        response1 = self.client.get(reverse('restaurants-list'))
        
        # Pagination이 적용된 경우와 아닌 경우 모두 처리
        if isinstance(response1.data, dict) and 'results' in response1.data:
            count1 = len(response1.data['results'])
        else:
            count1 = len(response1.data)
        
        # 두 번째 사용자로 조회
        self.client.force_authenticate(user=other_user)
        response2 = self.client.get(reverse('restaurants-list'))
        
        if isinstance(response2.data, dict) and 'results' in response2.data:
            count2 = len(response2.data['results'])
        else:
            count2 = len(response2.data)
        
        # 같은 데이터를 봐야 함 (공용 데이터)
        self.assertEqual(count1, count2)
        self.assertGreaterEqual(count1, 3)


class RestaurantSerializerTests(TestCase):
    """Serializer 테스트"""
    
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name="테스트 식당",
            address="서울시 관악구",
            latitude=Decimal("37.477136"),
            longitude=Decimal("126.961986"),
            phone="02-1234-5678",
            image_url="http://example.com/test.jpg",
            source="test_source"
        )
        
        MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="테스트 메뉴",
            price=Decimal("10000")
        )
    
    def test_restaurant_serializer_fields(self):
        """RestaurantSerializer 필드 검증"""
        from .serializers import RestaurantSerializer
        
        serializer = RestaurantSerializer(self.restaurant)
        data = serializer.data
        
        self.assertEqual(data['name'], "테스트 식당")
        self.assertEqual(data['address'], "서울시 관악구")
        self.assertEqual(data['phone'], "02-1234-5678")
        self.assertEqual(data['image_url'], "http://example.com/test.jpg")
        self.assertEqual(data['source'], "test_source")
        
        # 읽기 전용 필드 존재 확인
        self.assertIn('id', data)
        self.assertIn('created_at', data)
    
    def test_restaurant_detail_serializer_includes_menus(self):
        """RestaurantDetailSerializer 메뉴 포함 검증"""
        from .serializers import RestaurantDetailSerializer
        
        serializer = RestaurantDetailSerializer(self.restaurant)
        data = serializer.data
        
        self.assertIn('menus', data)
        self.assertEqual(len(data['menus']), 1)
        self.assertEqual(data['menus'][0]['name'], "테스트 메뉴")
        self.assertEqual(data['menus'][0]['price'], "10000.00")
    
    def test_menu_candidate_serializer(self):
        """MenuCandidateSerializer 검증"""
        from .serializers import MenuCandidateSerializer
        
        menu = MenuCandidate.objects.get(restaurant=self.restaurant)
        serializer = MenuCandidateSerializer(menu)
        data = serializer.data
        
        self.assertEqual(data['name'], "테스트 메뉴")
        self.assertEqual(data['price'], "10000.00")
        self.assertIn('image_url', data)

