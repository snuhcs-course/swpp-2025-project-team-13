"""
Integration Tests Pytest Configuration
공통 fixtures 및 설정
"""

import pytest
from rest_framework.test import APIClient
from users.models import User, UserPreference


@pytest.fixture
def api_client():
    """API 클라이언트 fixture"""
    return APIClient()


@pytest.fixture
def create_user():
    """사용자 생성 fixture factory"""
    def _create_user(username='testuser', email='test@test.com', password='testpass123'):
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        return user
    return _create_user


@pytest.fixture
def authenticated_client(api_client, create_user):
    """인증된 API 클라이언트 fixture"""
    user = create_user()
    api_client.force_authenticate(user=user)
    return api_client, user


@pytest.fixture
def user_with_preference(create_user):
    """취향 설정이 있는 사용자 fixture (온보딩 완료 상태)"""
    user = create_user(username='prefuser', email='pref@test.com')
    preference = UserPreference.objects.create(
        user=user,
        sweet_level=4,       # 단 걸 좋아해요
        spicy_level=3,       # 평범해요
        salty_level=2,       # 보통
        exploration_preference=4,  # 새로운 음식 좋아해요
        allergies=['달걀'],
        disliked_ingredients=['버섯', '고수'],
        favorite_cuisines=['한식', '일식', '이탈리안']
    )
    return user, preference
