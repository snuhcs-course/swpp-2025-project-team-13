"""
갤러리 관리 통합 테스트 (UAT 기준: Integrating Album Image)

UAT 시나리오:
- 음식 이미지 가져오기 (갤러리 동기화)
- 음식 태그 표시/숨기기
- 카테고리 수정 (대체 카테고리 선택, 검색)
- 이미지 선택 및 삭제
"""

from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from users.models import User, UserGalleryImage


class GalleryImageImportIntegrationTest(TransactionTestCase):
    """갤러리 이미지 가져오기 통합 테스트 (UAT Step 1-5)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='gallerytest',
            email='gallery@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_import_food_images_to_gallery(self):
        """
        음식 이미지 갤러리에 가져오기 (UAT Step 1):
        갤러리 동기화 허용 후 음식 이미지가 마이페이지에 표시
        """
        # 이미지 메타데이터 업로드 (갤러리 동기화 시뮬레이션)
        photo_data = {
            'photo_url': 'https://s3.amazonaws.com/test-bucket/food_photo.jpg',
            'local_uri': 'file:///path/to/local/food_photo.jpg'
        }
        
        create_response = self.client.post(
            reverse('photos-list'),
            photo_data,
            format='json'
        )
        
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', create_response.json())
        
        # 갤러리 목록에 표시되는지 확인
        list_response = self.client.get(reverse('photos-list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.json()), 1)
    
    def test_import_multiple_food_images(self):
        """다중 음식 이미지 가져오기"""
        for i in range(3):
            self.client.post(
                reverse('photos-list'),
                {
                    'photo_url': f'https://s3.amazonaws.com/test-bucket/food_{i}.jpg',
                    'local_uri': f'file:///path/to/local/food_{i}.jpg'
                },
                format='json'
            )
        
        list_response = self.client.get(reverse('photos-list'))
        self.assertEqual(len(list_response.json()), 3)
    
    def test_import_prevents_duplicate_images(self):
        """중복 이미지 방지 (UAT Step 4)"""
        # 첫 번째 업로드
        photo_url = 'https://s3.amazonaws.com/test-bucket/duplicate.jpg'
        
        self.client.post(
            reverse('photos-list'),
            {
                'photo_url': photo_url,
                'local_uri': 'file:///path/to/local/duplicate.jpg'
            },
            format='json'
        )
        
        # 복원 API를 통해 같은 이미지 다시 가져오기 시도
        restore_response = self.client.post(
            reverse('photos-restore-from-aws'),
            [{
                'image_url': photo_url,
                'ai_label': '',
                'category_tag': '',
                'label_alternatives': [],
                'label_confidence': 0,
                'label_manually_edited': False,
                'label_edited_at': None,
                'original_ai_label': '',
                'embedding': [],
                'local_uri': 'file:///path/to/local/duplicate.jpg',
                'created_at': '2024-01-01T00:00:00Z',
            }],
            format='json'
        )
        
        self.assertEqual(restore_response.status_code, status.HTTP_200_OK)
        self.assertEqual(restore_response.json()['skipped'], 1)  # 중복으로 건너뜀


class GalleryCategoryModificationIntegrationTest(TestCase):
    """갤러리 카테고리 수정 통합 테스트 (UAT Step 6-9)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='categorytest',
            email='category@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
        
        # 테스트 이미지 생성 (AI 라벨 포함)
        self.photo = UserGalleryImage.objects.create(
            user=self.user,
            image_url='https://s3.amazonaws.com/test/food.jpg',
            local_uri='file:///local/food.jpg',
            ai_label='돈가스',
            category_tag='일식',
            label_alternatives=['돈까스', '함박스테이크', '포크커틀릿'],
            label_confidence=0.85
        )
    
    def test_view_food_tag(self):
        """음식 태그 조회 (UAT Step 6)"""
        response = self.client.get(reverse('photos-list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        photo = response.json()[0]
        
        self.assertEqual(photo['ai_label'], '돈가스')
        self.assertEqual(photo['category_tag'], '일식')
        self.assertIn('돈까스', photo['label_alternatives'])
    
    def test_update_category_to_alternative(self):
        """대체 카테고리로 수정 (UAT Step 7-8)"""
        response = self.client.patch(
            reverse('photos-update-label', kwargs={'pk': self.photo.id}),
            {'label': '돈까스'},  # 대체 카테고리 중 하나로 수정
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['ai_label'], '돈까스')
        
        # DB 확인
        self.photo.refresh_from_db()
        self.assertEqual(self.photo.ai_label, '돈까스')
    
    def test_update_label_requires_value(self):
        """라벨 수정 시 값 필수"""
        response = self.client.patch(
            reverse('photos-update-label', kwargs={'pk': self.photo.id}),
            {},  # 빈 요청
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class GalleryFoodSearchIntegrationTest(TestCase):
    """갤러리 음식 검색 통합 테스트 (UAT Step 8)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='searchtest',
            email='search@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_search_food_with_valid_query(self):
        """유효한 검색어로 음식 검색 (UAT Step 8 - '돈')"""
        response = self.client.get(
            reverse('photos-search-foods'),
            {'q': '돈'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['query'], '돈')
        # 검색 결과 존재 확인
        self.assertIn('primary_results', response.json())
        self.assertIn('secondary_results', response.json())
    
    def test_search_food_no_results(self):
        """검색 결과 없음 (UAT Step 8 - '돈까스' 같은 존재하지 않는 음식)"""
        response = self.client.get(
            reverse('photos-search-foods'),
            {'q': 'xxxnonexistentxxx'}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 결과가 빈 배열이거나 에러 메시지
    
    def test_search_requires_query(self):
        """검색어 필수"""
        response = self.client.get(reverse('photos-search-foods'))
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_search_empty_query(self):
        """빈 검색어 에러"""
        response = self.client.get(
            reverse('photos-search-foods'),
            {'q': ''}
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class GalleryImageDeletionIntegrationTest(TestCase):
    """갤러리 이미지 삭제 통합 테스트 (UAT Step 10-12)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='deletetest',
            email='delete@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
        
        # 테스트 이미지들 생성
        self.photos = []
        for i in range(3):
            photo = UserGalleryImage.objects.create(
                user=self.user,
                image_url=f'https://s3.amazonaws.com/test/food_{i}.jpg',
                local_uri=f'file:///local/food_{i}.jpg',
                ai_label=f'음식{i}'
            )
            self.photos.append(photo)
    
    def test_delete_single_image(self):
        """단일 이미지 삭제 (UAT Step 12)"""
        photo_id = self.photos[0].id
        
        response = self.client.delete(
            reverse('photos-delete-image', kwargs={'pk': photo_id})
        )
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # DB에서 삭제 확인
        self.assertFalse(UserGalleryImage.objects.filter(id=photo_id).exists())
        
        # 나머지 2개는 남아있음
        list_response = self.client.get(reverse('photos-list'))
        self.assertEqual(len(list_response.json()), 2)
    
    def test_delete_multiple_images(self):
        """다중 이미지 삭제"""
        # 2개 삭제
        for photo in self.photos[:2]:
            self.client.delete(
                reverse('photos-delete-image', kwargs={'pk': photo.id})
            )
        
        # 1개만 남아있음
        list_response = self.client.get(reverse('photos-list'))
        self.assertEqual(len(list_response.json()), 1)
    
    def test_delete_nonexistent_image(self):
        """존재하지 않는 이미지 삭제 시도"""
        response = self.client.delete(
            reverse('photos-delete-image', kwargs={'pk': 99999})
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class GalleryUserIsolationIntegrationTest(TestCase):
    """갤러리 사용자 격리 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.user1 = User.objects.create_user(
            username='guser1', email='gu1@test.com', password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='guser2', email='gu2@test.com', password='testpass123'
        )
        
        # user1의 사진
        self.user1_photo = UserGalleryImage.objects.create(
            user=self.user1,
            image_url='https://s3.amazonaws.com/user1/photo.jpg',
            local_uri='file:///user1/photo.jpg'
        )
    
    def test_user_can_only_see_own_photos(self):
        """사용자는 자신의 사진만 볼 수 있음"""
        # user1로 조회 - 1개
        self.client.force_authenticate(user=self.user1)
        response1 = self.client.get(reverse('photos-list'))
        self.assertEqual(len(response1.json()), 1)
        
        # user2로 조회 - 0개
        self.client.force_authenticate(user=self.user2)
        response2 = self.client.get(reverse('photos-list'))
        self.assertEqual(len(response2.json()), 0)
    
    def test_user_cannot_modify_others_photo(self):
        """다른 사용자의 사진 수정 불가"""
        self.client.force_authenticate(user=self.user2)
        
        response = self.client.patch(
            reverse('photos-update-label', kwargs={'pk': self.user1_photo.id}),
            {'label': '해킹시도'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_user_cannot_delete_others_photo(self):
        """다른 사용자의 사진 삭제 불가"""
        self.client.force_authenticate(user=self.user2)
        
        response = self.client.delete(
            reverse('photos-delete-image', kwargs={'pk': self.user1_photo.id})
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 사진 여전히 존재
        self.assertTrue(UserGalleryImage.objects.filter(id=self.user1_photo.id).exists())


class GalleryRestoreFromAWSIntegrationTest(TestCase):
    """AWS에서 갤러리 복원 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='restoretest',
            email='restore@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_restore_gallery_from_aws(self):
        """AWS에서 갤러리 복원"""
        gallery_data = [
            {
                'image_url': 'https://s3.amazonaws.com/test/food1.jpg',
                'ai_label': '김치찌개',
                'category_tag': '한식',
                'label_alternatives': ['김치전골', '김치국'],
                'label_confidence': 0.85,
                'label_manually_edited': False,
                'label_edited_at': None,
                'original_ai_label': '김치찌개',
                'embedding': [],
                'local_uri': 'file:///food1.jpg',
                'created_at': '2024-01-01T00:00:00Z',
            },
            {
                'image_url': 'https://s3.amazonaws.com/test/food2.jpg',
                'ai_label': '된장찌개',
                'category_tag': '한식',
                'label_alternatives': [],
                'label_confidence': 0.90,
                'label_manually_edited': True,
                'label_edited_at': '2024-01-02T00:00:00Z',
                'original_ai_label': '국',
                'embedding': [],
                'local_uri': 'file:///food2.jpg',
                'created_at': '2024-01-01T12:00:00Z',
            }
        ]
        
        response = self.client.post(
            reverse('photos-restore-from-aws'),
            gallery_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['restored'], 2)
        
        # DB 확인
        self.assertEqual(UserGalleryImage.objects.filter(user=self.user).count(), 2)


class GalleryAuthenticationIntegrationTest(TestCase):
    """갤러리 인증 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_gallery_requires_authentication(self):
        """갤러리 API는 인증 필요"""
        # 인증 없이 목록 조회
        response = self.client.get(reverse('photos-list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 인증 없이 업로드
        response = self.client.post(
            reverse('photos-list'),
            {'photo_url': 'test.jpg', 'local_uri': 'test.jpg'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 인증 없이 검색
        response = self.client.get(
            reverse('photos-search-foods'),
            {'q': 'test'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class GalleryCompleteFlowIntegrationTest(TransactionTestCase):
    """갤러리 전체 플로우 통합 테스트 (UAT 전체 시나리오)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='flowtest',
            email='flow@test.com',
            password='testpassword123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_complete_gallery_flow(self):
        """
        전체 갤러리 플로우 (UAT Integrating Album Image):
        1. 이미지 가져오기 (동기화)
        2. 태그 확인
        3. 카테고리 수정
        4. 이미지 삭제
        """
        # ===== Step 1: 이미지 가져오기 =====
        create_response = self.client.post(
            reverse('photos-list'),
            {
                'photo_url': 'https://s3.amazonaws.com/test/food.jpg',
                'local_uri': 'file:///local/food.jpg'
            },
            format='json'
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        photo_id = create_response.json()['id']
        
        # ===== Step 2: 태그 확인 (목록 조회) =====
        list_response = self.client.get(reverse('photos-list'))
        self.assertEqual(len(list_response.json()), 1)
        
        # ===== Step 3: 카테고리 수정 =====
        update_response = self.client.patch(
            reverse('photos-update-label', kwargs={'pk': photo_id}),
            {'label': '김치찌개'},
            format='json'
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.json()['ai_label'], '김치찌개')
        
        # ===== Step 4: 이미지 삭제 =====
        delete_response = self.client.delete(
            reverse('photos-delete-image', kwargs={'pk': photo_id})
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        
        # 삭제 확인
        list_response = self.client.get(reverse('photos-list'))
        self.assertEqual(len(list_response.json()), 0)
