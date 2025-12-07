"""
인증 플로우 통합 테스트

시나리오:
- 회원가입
- 로그인
- 사용자 정보 조회
- 로그아웃
- 계정 삭제
"""

from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from users.models import User


# API URL 상수 (reverse 대신 직접 사용)
API_LOGIN_URL = '/api/v1/auth/login/'
API_LOGOUT_URL = '/api/v1/auth/logout/'
API_REGISTER_URL = '/api/v1/auth/register/'
API_DELETE_ACCOUNT_URL = '/api/v1/auth/delete-account/'
API_ME_URL = '/api/v1/me/'


class AuthenticationFlowIntegrationTest(TransactionTestCase):
    """전체 인증 플로우 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.test_user_data = {
            'username': 'integrationtestuser',
            'email': 'integration@test.com',
            'password': 'testpassword123'
        }
    
    def test_complete_auth_flow(self):
        """
        전체 인증 플로우 테스트:
        1. 회원가입
        2. 로그아웃
        3. 로그인
        4. 사용자 정보 조회
        5. 로그아웃
        6. 계정 삭제
        """
        # ===== Step 1: 회원가입 =====
        register_response = self.client.post(
            API_REGISTER_URL,
            self.test_user_data,
            format='json'
        )
        
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', register_response.json())
        self.assertEqual(register_response.json()['username'], self.test_user_data['username'])
        
        # DB에 사용자가 생성되었는지 확인
        user = User.objects.get(username=self.test_user_data['username'])
        self.assertIsNotNone(user)
        self.assertEqual(user.email, self.test_user_data['email'])
        
        # ===== Step 2: 로그아웃 (회원가입 후 자동 로그인 상태이므로) =====
        logout_response = self.client.post(API_LOGOUT_URL)
        self.assertIn(logout_response.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])
        
        # ===== Step 3: 로그인 =====
        login_response = self.client.post(
            API_LOGIN_URL,
            {
                'username': self.test_user_data['username'],
                'password': self.test_user_data['password']
            },
            format='json'
        )
        
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertEqual(login_response.json()['username'], self.test_user_data['username'])
        
        # ===== Step 4: 사용자 정보 조회 (인증된 상태) =====
        me_response = self.client.get(API_ME_URL)
        
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.json()['username'], self.test_user_data['username'])
        
        # ===== Step 5: 로그아웃 =====
        logout_response = self.client.post(API_LOGOUT_URL)
        self.assertIn(logout_response.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])
        
        # 로그아웃 후 인증 필요한 API 접근 불가 확인
        me_after_logout = self.client.get(API_ME_URL)
        self.assertEqual(me_after_logout.status_code, status.HTTP_403_FORBIDDEN)
        
        # ===== Step 6: 다시 로그인 후 계정 삭제 =====
        self.client.post(
            API_LOGIN_URL,
            {
                'username': self.test_user_data['username'],
                'password': self.test_user_data['password']
            },
            format='json'
        )
        
        delete_response = self.client.post(
            API_DELETE_ACCOUNT_URL,
            {'password': self.test_user_data['password']},
            format='json'
        )
        
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        
        # DB에서 사용자가 삭제되었는지 확인
        self.assertFalse(User.objects.filter(username=self.test_user_data['username']).exists())


class RegisterValidationIntegrationTest(TestCase):
    """회원가입 유효성 검사 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_register_missing_fields(self):
        """필수 필드 누락 시 에러"""
        # username 누락
        response = self.client.post(
            API_REGISTER_URL,
            {'email': 'test@test.com', 'password': 'testpass123'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # email 누락
        response = self.client.post(
            API_REGISTER_URL,
            {'username': 'testuser', 'password': 'testpass123'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # password 누락
        response = self.client.post(
            API_REGISTER_URL,
            {'username': 'testuser', 'email': 'test@test.com'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_register_short_password(self):
        """짧은 비밀번호 에러"""
        response = self.client.post(
            API_REGISTER_URL,
            {
                'username': 'testuser',
                'email': 'test@test.com',
                'password': '1234567'  # 8자 미만
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_register_duplicate_username(self):
        """중복 username 에러"""
        # 첫 번째 사용자 생성
        User.objects.create_user(
            username='existinguser',
            email='existing@test.com',
            password='testpass123'
        )
        
        # 같은 username으로 회원가입 시도
        response = self.client.post(
            API_REGISTER_URL,
            {
                'username': 'existinguser',
                'email': 'new@test.com',
                'password': 'testpass123'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginValidationIntegrationTest(TestCase):
    """로그인 유효성 검사 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='logintest',
            email='login@test.com',
            password='correctpassword'
        )
    
    def test_login_wrong_password(self):
        """잘못된 비밀번호로 로그인 시도"""
        response = self.client.post(
            API_LOGIN_URL,
            {
                'username': 'logintest',
                'password': 'wrongpassword'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_nonexistent_user(self):
        """존재하지 않는 사용자로 로그인 시도"""
        response = self.client.post(
            API_LOGIN_URL,
            {
                'username': 'nonexistent',
                'password': 'somepassword'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_success(self):
        """정상 로그인"""
        response = self.client.post(
            API_LOGIN_URL,
            {
                'username': 'logintest',
                'password': 'correctpassword'
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['username'], 'logintest')


class DeleteAccountIntegrationTest(TransactionTestCase):
    """계정 삭제 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='deletetest',
            email='delete@test.com',
            password='testpassword123'
        )
    
    def test_delete_account_wrong_password(self):
        """잘못된 비밀번호로 계정 삭제 시도"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post(
            API_DELETE_ACCOUNT_URL,
            {'password': 'wrongpassword'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # 사용자가 여전히 존재해야 함
        self.assertTrue(User.objects.filter(username='deletetest').exists())
    
    def test_delete_account_not_authenticated(self):
        """인증 없이 계정 삭제 시도"""
        response = self.client.post(
            API_DELETE_ACCOUNT_URL,
            {'password': 'testpassword123'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_delete_account_success(self):
        """정상 계정 삭제"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post(
            API_DELETE_ACCOUNT_URL,
            {'password': 'testpassword123'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # DB에서 사용자가 삭제되었는지 확인
        self.assertFalse(User.objects.filter(username='deletetest').exists())


class SessionPersistenceIntegrationTest(TestCase):
    """세션 지속성 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='sessiontest',
            email='session@test.com',
            password='testpassword123'
        )
    
    def test_session_persists_after_login(self):
        """로그인 후 세션이 유지되는지 테스트"""
        # 로그인
        login_response = self.client.post(
            API_LOGIN_URL,
            {
                'username': 'sessiontest',
                'password': 'testpassword123'
            },
            format='json'
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        
        # 여러 API 호출 시 세션 유지 확인
        me_response1 = self.client.get(API_ME_URL)
        self.assertEqual(me_response1.status_code, status.HTTP_200_OK)
        
        me_response2 = self.client.get(API_ME_URL)
        self.assertEqual(me_response2.status_code, status.HTTP_200_OK)
        
        # 같은 사용자 정보 반환
        self.assertEqual(
            me_response1.json()['username'],
            me_response2.json()['username']
        )


class UserMeEndpointIntegrationTest(TestCase):
    """사용자 정보 조회 엔드포인트 통합 테스트"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='metest',
            email='me@test.com',
            password='testpassword123'
        )
    
    def test_get_me_authenticated(self):
        """인증된 사용자 정보 조회"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(API_ME_URL)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['username'], 'metest')
        self.assertEqual(response.json()['email'], 'me@test.com')
    
    def test_get_me_not_authenticated(self):
        """비인증 상태에서 사용자 정보 조회"""
        response = self.client.get(API_ME_URL)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
