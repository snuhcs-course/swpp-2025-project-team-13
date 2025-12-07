from django.test import TestCase
from decimal import Decimal

from .models import Menu, MenuCandidate
from restaurant.models import Restaurant


class MenuModelTests(TestCase):
    """Menu 모델 테스트"""
    
    def setUp(self):
        self.menu = Menu.objects.create(
            name="테스트 메뉴",
            category="한식",
            description="맛있는 테스트 메뉴입니다",
            image_url="http://example.com/menu.jpg",
            tag_name="김치찌개"
        )
    
    def test_menu_creation(self):
        """메뉴 생성 테스트"""
        self.assertEqual(self.menu.name, "테스트 메뉴")
        self.assertEqual(self.menu.category, "한식")
        self.assertEqual(self.menu.description, "맛있는 테스트 메뉴입니다")
        self.assertEqual(self.menu.tag_name, "김치찌개")
    
    def test_menu_optional_fields(self):
        """선택 필드가 비어있어도 생성 가능한지 테스트"""
        menu = Menu.objects.create(name="최소 정보 메뉴")
        
        self.assertEqual(menu.name, "최소 정보 메뉴")
        self.assertEqual(menu.category, "")
        self.assertEqual(menu.description, "")
        self.assertEqual(menu.image_url, "")
        self.assertEqual(menu.tag_name, "")
    
    def test_menu_embedding_default(self):
        """임베딩 기본값 테스트"""
        menu = Menu.objects.create(name="임베딩 테스트")
        
        self.assertEqual(menu.embedding, [])
    
    def test_menu_embedding_with_data(self):
        """임베딩 데이터 저장 테스트"""
        embedding = [0.1, 0.2, 0.3, 0.4, 0.5]
        menu = Menu.objects.create(
            name="임베딩 있는 메뉴",
            embedding=embedding
        )
        
        self.assertEqual(menu.embedding, embedding)
        self.assertEqual(len(menu.embedding), 5)
    
    def test_menu_update(self):
        """메뉴 업데이트 테스트"""
        self.menu.name = "수정된 메뉴"
        self.menu.category = "일식"
        self.menu.save()
        
        updated_menu = Menu.objects.get(id=self.menu.id)
        self.assertEqual(updated_menu.name, "수정된 메뉴")
        self.assertEqual(updated_menu.category, "일식")
    
    def test_menu_delete(self):
        """메뉴 삭제 테스트"""
        menu_id = self.menu.id
        self.menu.delete()
        
        self.assertFalse(Menu.objects.filter(id=menu_id).exists())


class MenuCandidateModelTests(TestCase):
    """MenuCandidate 모델 테스트"""
    
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name="테스트 식당",
            address="서울시 테스트구",
            source="test_menu_candidate"
        )
        
        self.menu_candidate = MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="테스트 메뉴 후보",
            price=Decimal("12000.00"),
            image_url="http://example.com/candidate.jpg"
        )
    
    def test_menu_candidate_creation(self):
        """메뉴 후보 생성 테스트"""
        self.assertEqual(self.menu_candidate.restaurant, self.restaurant)
        self.assertEqual(self.menu_candidate.name, "테스트 메뉴 후보")
        self.assertEqual(self.menu_candidate.price, Decimal("12000.00"))
        self.assertEqual(self.menu_candidate.image_url, "http://example.com/candidate.jpg")
        self.assertIsNotNone(self.menu_candidate.created_at)
    
    def test_menu_candidate_optional_fields(self):
        """선택 필드가 비어있어도 생성 가능한지 테스트"""
        candidate = MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="최소 정보 후보"
        )
        
        self.assertEqual(candidate.name, "최소 정보 후보")
        self.assertIsNone(candidate.price)
        self.assertIsNone(candidate.image_url)
    
    def test_menu_candidate_embedding_default(self):
        """임베딩 기본값 테스트"""
        candidate = MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="임베딩 테스트 후보"
        )
        
        self.assertEqual(candidate.embedding, [])
    
    def test_menu_candidate_embedding_with_data(self):
        """임베딩 데이터 저장 테스트"""
        embedding = [0.1] * 768  # BERT/SentenceTransformer 기본 차원
        candidate = MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="임베딩 있는 후보",
            embedding=embedding
        )
        
        self.assertEqual(len(candidate.embedding), 768)
    
    def test_menu_candidate_price_precision(self):
        """가격 정밀도 테스트"""
        candidate = MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="가격 테스트",
            price=Decimal("15500.50")
        )
        
        self.assertEqual(candidate.price, Decimal("15500.50"))
    
    def test_menu_candidate_restaurant_relationship(self):
        """식당-메뉴후보 관계 테스트"""
        # 같은 식당에 여러 메뉴 후보 추가
        MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="메뉴 후보 1"
        )
        MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="메뉴 후보 2"
        )
        
        # 식당에서 메뉴 후보들 조회
        candidates = self.restaurant.menu_candidates.all()
        # 기존 1개 + 새로 2개 = 3개
        self.assertEqual(candidates.count(), 3)
    
    def test_menu_candidate_cascade_delete(self):
        """식당 삭제 시 메뉴 후보도 삭제되는지 테스트"""
        candidate_id = self.menu_candidate.id
        restaurant_id = self.restaurant.id
        
        # 식당 삭제
        self.restaurant.delete()
        
        # 메뉴 후보도 삭제되어야 함
        self.assertFalse(MenuCandidate.objects.filter(id=candidate_id).exists())
        self.assertFalse(Restaurant.objects.filter(id=restaurant_id).exists())
    
    def test_menu_candidate_update(self):
        """메뉴 후보 업데이트 테스트"""
        self.menu_candidate.name = "수정된 후보"
        self.menu_candidate.price = Decimal("15000.00")
        self.menu_candidate.save()
        
        updated = MenuCandidate.objects.get(id=self.menu_candidate.id)
        self.assertEqual(updated.name, "수정된 후보")
        self.assertEqual(updated.price, Decimal("15000.00"))
    
    def test_menu_candidate_filter_by_restaurant(self):
        """식당별 메뉴 후보 필터링 테스트"""
        # 다른 식당 생성
        other_restaurant = Restaurant.objects.create(
            name="다른 식당",
            source="other_menu_candidate"
        )
        
        MenuCandidate.objects.create(
            restaurant=other_restaurant,
            name="다른 식당 메뉴"
        )
        
        # 첫 번째 식당의 메뉴만 조회
        candidates = MenuCandidate.objects.filter(restaurant=self.restaurant)
        self.assertEqual(candidates.count(), 1)
        
        # 다른 식당의 메뉴
        other_candidates = MenuCandidate.objects.filter(restaurant=other_restaurant)
        self.assertEqual(other_candidates.count(), 1)


class MenuQueryTests(TestCase):
    """메뉴 쿼리 테스트"""
    
    def setUp(self):
        # 다양한 카테고리의 메뉴 생성
        Menu.objects.create(name="김치찌개", category="한식")
        Menu.objects.create(name="된장찌개", category="한식")
        Menu.objects.create(name="스시", category="일식")
        Menu.objects.create(name="라멘", category="일식")
        Menu.objects.create(name="파스타", category="양식")
    
    def test_filter_by_category(self):
        """카테고리별 필터링 테스트"""
        korean = Menu.objects.filter(category="한식")
        self.assertEqual(korean.count(), 2)
        
        japanese = Menu.objects.filter(category="일식")
        self.assertEqual(japanese.count(), 2)
    
    def test_search_by_name(self):
        """이름으로 검색 테스트"""
        results = Menu.objects.filter(name__icontains="찌개")
        self.assertEqual(results.count(), 2)
        
        results = Menu.objects.filter(name__icontains="스시")
        self.assertEqual(results.count(), 1)
    
    def test_order_by_name(self):
        """이름순 정렬 테스트"""
        menus = Menu.objects.all().order_by('name')
        names = [m.name for m in menus]
        
        self.assertEqual(names, sorted(names))


class MenuCandidateQueryTests(TestCase):
    """메뉴 후보 쿼리 테스트"""
    
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name="테스트 식당",
            source="query_test"
        )
        
        MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="비싼 메뉴",
            price=Decimal("30000.00")
        )
        MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="저렴한 메뉴",
            price=Decimal("8000.00")
        )
        MenuCandidate.objects.create(
            restaurant=self.restaurant,
            name="중간 가격 메뉴",
            price=Decimal("15000.00")
        )
    
    def test_filter_by_price_range(self):
        """가격 범위로 필터링 테스트"""
        cheap = MenuCandidate.objects.filter(price__lte=10000)
        self.assertEqual(cheap.count(), 1)
        
        expensive = MenuCandidate.objects.filter(price__gte=20000)
        self.assertEqual(expensive.count(), 1)
        
        mid_range = MenuCandidate.objects.filter(price__range=(10000, 20000))
        self.assertEqual(mid_range.count(), 1)
    
    def test_order_by_price(self):
        """가격순 정렬 테스트"""
        candidates = MenuCandidate.objects.filter(
            restaurant=self.restaurant,
            price__isnull=False
        ).order_by('price')
        
        prices = [c.price for c in candidates]
        self.assertEqual(prices, sorted(prices))
    
    def test_order_by_created_at(self):
        """생성일순 정렬 테스트"""
        candidates = MenuCandidate.objects.filter(
            restaurant=self.restaurant
        ).order_by('-created_at')
        
        # 최신순으로 정렬되어야 함
        self.assertTrue(
            all(
                candidates[i].created_at >= candidates[i+1].created_at
                for i in range(len(candidates)-1)
            )
        )
    
    def test_aggregate_average_price(self):
        """평균 가격 집계 테스트"""
        from django.db.models import Avg
        
        avg_price = MenuCandidate.objects.filter(
            restaurant=self.restaurant,
            price__isnull=False
        ).aggregate(avg=Avg('price'))['avg']
        
        # (30000 + 8000 + 15000) / 3 = 17666.67
        self.assertIsNotNone(avg_price)
        self.assertAlmostEqual(float(avg_price), 17666.67, places=0)
