from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework import status
from unittest.mock import Mock, patch
from .models import User, UserGalleryImage, Profile, Follow
from .permissions import IsOwnerOrReadOnly, IsFollowerOrReadOnly
from . import services, auth_views, views


class PermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(username='testuser', password='pass', email='test@example.com')
        self.other_user = User.objects.create_user(username='other', password='pass', email='other@example.com')
    
    def test_is_owner_or_readonly_get(self):
        permission = IsOwnerOrReadOnly()
        request = self.factory.get('/')
        request.user = self.user
        self.assertTrue(permission.has_object_permission(request, None, self.user))
    
    def test_is_owner_or_readonly_post_owner(self):
        permission = IsOwnerOrReadOnly()
        request = self.factory.post('/')
        request.user = self.user
        self.assertTrue(permission.has_object_permission(request, None, self.user))
    
    def test_is_owner_or_readonly_post_not_owner(self):
        permission = IsOwnerOrReadOnly()
        request = self.factory.post('/')
        request.user = self.other_user
        self.assertFalse(permission.has_object_permission(request, None, self.user))
    
    def test_is_follower_or_readonly_get(self):
        permission = IsFollowerOrReadOnly()
        request = self.factory.get('/')
        request.user = self.user
        self.assertTrue(permission.has_object_permission(request, None, self.user))
    
    def test_is_follower_or_readonly_post_owner(self):
        permission = IsFollowerOrReadOnly()
        request = self.factory.post('/')
        request.user = self.user
        self.assertTrue(permission.has_object_permission(request, None, self.user))
    
    def test_is_follower_or_readonly_post_not_owner(self):
        permission = IsFollowerOrReadOnly()
        request = self.factory.post('/')
        request.user = self.other_user
        self.assertFalse(permission.has_object_permission(request, None, self.user))


class UserServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass', email='test@example.com')
    
    def test_create_user_with_profile(self):
        user = services.create_user_with_profile(
            username='newuser',
            email='new@example.com',
            password='newpass',
            bio='Test bio'
        )
        self.assertIsNotNone(user)
        self.assertTrue(hasattr(user, 'profile'))
        self.assertEqual(user.profile.bio, 'Test bio')
    
    def test_update_profile_preferences(self):
        Profile.objects.create(user=self.user, bio='', preferences={})
        updated_profile = services.update_profile_preferences(
            user=self.user,
            patch={'theme': 'dark'}
        )
        self.assertEqual(updated_profile.preferences['theme'], 'dark')
    
    def test_request_follow(self):
        user2 = User.objects.create_user(username='user2', password='pass', email='user2@example.com')
        follow = services.request_follow(follower=self.user, following_id=user2.id)
        self.assertIsNotNone(follow)
        self.assertEqual(follow.follower, self.user)
        self.assertEqual(follow.following, user2)
    
    def test_unfollow(self):
        user2 = User.objects.create_user(username='user2', password='pass', email='user2@example.com')
        Follow.objects.create(follower=self.user, following=user2, status='accepted')
        services.unfollow(follower=self.user, following_id=user2.id)
        self.assertFalse(Follow.objects.filter(follower=self.user, following=user2).exists())
    
    def test_upload_user_photo(self):
        photo = services.upload_user_photo(user=self.user, photo_url='http://example.com/photo.jpg')
        self.assertIsNotNone(photo)
        self.assertEqual(photo.image_url, 'http://example.com/photo.jpg')
    
    def test_list_user_photos(self):
        services.upload_user_photo(user=self.user, photo_url='http://example.com/photo1.jpg')
        services.upload_user_photo(user=self.user, photo_url='http://example.com/photo2.jpg')
        photos = services.list_user_photos(user=self.user)
        self.assertEqual(photos.count(), 2)


class PhotoViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='password123', email='test@example.com')

    def authenticate(self):
        self.client.force_authenticate(user=self.user)

    def test_requires_authentication(self):
        # Should get 401 if not authenticated
        response_get = self.client.get(reverse('photos-list'))
        response_post = self.client.post(reverse('photos-list'), {'photo_url': 'http://example.com/image.jpg'})
        self.assertEqual(response_get.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_photos_empty(self):
        self.authenticate()
        response = self.client.get(reverse('photos-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])

    def test_create_photo(self):
        self.authenticate()
        url = reverse('photos-list')
        photo_url = 'http://example.com/image1.jpg'
        response = self.client.post(url, {'photo_url': photo_url})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('image_url', response.json())
        self.assertEqual(response.json()['image_url'], photo_url)
        self.assertTrue(UserGalleryImage.objects.filter(image_url=photo_url, user=self.user).exists())

    def test_list_photos_after_creation(self):
        self.authenticate()
        photo1 = UserGalleryImage.objects.create(user=self.user, image_url='http://example.com/img1.jpg')
        photo2 = UserGalleryImage.objects.create(user=self.user, image_url='http://example.com/img2.jpg')
        response = self.client.get(reverse('photos-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        image_urls = [photo['image_url'] for photo in response.json()]
        self.assertIn('http://example.com/img1.jpg', image_urls)
        self.assertIn('http://example.com/img2.jpg', image_urls)

    def test_user_is_isolated(self):
        self.authenticate()
        other_user = User.objects.create_user(username='otheruser', password='testpass', email='other@example.com')
        UserGalleryImage.objects.create(user=other_user, image_url='http://example.com/other.jpg')
        response = self.client.get(reverse('photos-list'))
        image_urls = [photo['image_url'] for photo in response.json()]
        self.assertNotIn('http://example.com/other.jpg', image_urls)


class AuthViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass123', email='test@test.com')
    
    def test_csrf_view(self):
        from .auth_views import csrf
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        request = factory.get('/api/csrf/')
        
        response = csrf(request)
        
        self.assertEqual(response.status_code, 200)
        import json
        response_data = json.loads(response.content)
        self.assertIn('csrfToken', response_data)
    
    def test_login_view_success(self):
        response = self.client.post('/api/v1/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, 200)
    
    def test_login_view_invalid_credentials(self):
        response = self.client.post('/api/v1/auth/login/', {
            'username': 'testuser',
            'password': 'wrongpass'
        })
        
        self.assertEqual(response.status_code, 400)
    
    def test_register_view_success(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'newpass123'
        })
        
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username='newuser').exists())
    
    def test_register_view_missing_fields(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'newuser'
        })
        
        self.assertEqual(response.status_code, 400)
    
    def test_register_view_short_password(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'short'
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('at least 8 characters', response.json()['detail'])
    
    def test_register_view_duplicate_username(self):
        response = self.client.post('/api/v1/auth/register/', {
            'username': 'testuser',
            'email': 'another@test.com',
            'password': 'newpass123'
        })
        
        self.assertEqual(response.status_code, 400)


class ViewServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass123', email='test@test.com')
        self.user2 = User.objects.create_user(username='user2', password='pass123', email='user2@test.com')
    
    def test_list_followers(self):
        Follow.objects.create(follower=self.user, following=self.user2, status='accepted')
        followers = services.list_followers(user_id=self.user2.id)
        self.assertEqual(len(followers), 1)
    
    def test_list_followings(self):
        Follow.objects.create(follower=self.user, following=self.user2, status='accepted')
        followings = services.list_followings(user_id=self.user.id)
        self.assertEqual(len(followings), 1)
    
    def test_accept_follow(self):
        Follow.objects.create(follower=self.user, following=self.user2, status='pending')
        follow = services.accept_follow(follower_id=self.user.id, following=self.user2)
        self.assertEqual(follow.status, 'accepted')
    
    def test_list_follow_suggestions(self):
        suggestions = services.list_follow_suggestions(user=self.user, limit=10)
        self.assertIsNotNone(suggestions)


class CompleteViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='pass123', email='test@test.com')
        self.user2 = User.objects.create_user(username='user2', password='pass123', email='user2@test.com')
        from .models import Profile
        Profile.objects.create(user=self.user, bio='test bio', preferences={})
        Profile.objects.create(user=self.user2, bio='user2 bio', preferences={})
        
        from restaurant.models import Restaurant
        self.restaurant = Restaurant.objects.create(
            name='Test Restaurant',
            address='Test Address',
            source='test_source_1'
        )
        self.restaurant2 = Restaurant.objects.create(
            name='Test Restaurant 2',
            address='Test Address 2',
            source='test_source_2'
        )
    
    def test_me_list(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/me/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], 'testuser')
    
    def test_me_preferences_update(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/v1/me/preferences/', {'theme': 'dark'})
        self.assertEqual(response.status_code, 200)
    
    def test_user_list(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/users/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 2)
    
    def test_user_retrieve(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/users/{self.user2.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], 'user2')
    
    def test_user_followers(self):
        self.client.force_authenticate(user=self.user)
        Follow.objects.create(follower=self.user, following=self.user2, status='accepted')
        response = self.client.get(f'/api/v1/users/{self.user2.id}/followers/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
    
    def test_user_followings(self):
        self.client.force_authenticate(user=self.user)
        Follow.objects.create(follower=self.user, following=self.user2, status='accepted')
        response = self.client.get(f'/api/v1/users/{self.user.id}/followings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
    
    def test_follow_request(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/follows/request/', {'following_id': self.user2.id})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Follow.objects.filter(follower=self.user, following=self.user2).exists())
    
    def test_follow_accept(self):
        self.client.force_authenticate(user=self.user2)
        Follow.objects.create(follower=self.user, following=self.user2, status='pending')
        response = self.client.post('/api/v1/follows/accept/', {'follower_id': self.user.id})
        self.assertEqual(response.status_code, 200)
        follow = Follow.objects.get(follower=self.user, following=self.user2)
        self.assertEqual(follow.status, 'accepted')
    
    def test_follow_unfollow(self):
        self.client.force_authenticate(user=self.user)
        Follow.objects.create(follower=self.user, following=self.user2, status='accepted')
        response = self.client.post('/api/v1/follows/unfollow/', {'following_id': self.user2.id})
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Follow.objects.filter(follower=self.user, following=self.user2).exists())
    
    def test_suggestion_list(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/suggestions/')
        self.assertEqual(response.status_code, 200)
    
    def test_suggestion_list_with_limit(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/suggestions/?limit=5')
        self.assertEqual(response.status_code, 200)
    
    def test_scrap_list(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/scraps/')
        self.assertEqual(response.status_code, 200)
    
    def test_scrap_create(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/scraps/', {'restaurant_id': self.restaurant.id})
        self.assertEqual(response.status_code, 201)
    
    def test_scrap_create_missing_id(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/scraps/', {})
        self.assertEqual(response.status_code, 400)
    
    def test_scrap_create_duplicate(self):
        from .models import UserScrap
        self.client.force_authenticate(user=self.user)
        UserScrap.objects.create(user=self.user, restaurant=self.restaurant)
        response = self.client.post('/api/v1/scraps/', {'restaurant_id': self.restaurant.id})
        self.assertEqual(response.status_code, 400)
    
    def test_scrap_create_invalid_restaurant(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/scraps/', {'restaurant_id': 99999})
        self.assertEqual(response.status_code, 404)
    
    def test_scrap_destroy(self):
        from .models import UserScrap
        self.client.force_authenticate(user=self.user)
        scrap = UserScrap.objects.create(user=self.user, restaurant=self.restaurant)
        response = self.client.delete(f'/api/v1/scraps/{scrap.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(UserScrap.objects.filter(id=scrap.id).exists())
    
    def test_scrap_toggle_add(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/scraps/toggle/', {'restaurant_id': self.restaurant.id})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['scrapped'])
    
    def test_scrap_toggle_remove(self):
        from .models import UserScrap
        self.client.force_authenticate(user=self.user)
        UserScrap.objects.create(user=self.user, restaurant=self.restaurant)
        response = self.client.post('/api/v1/scraps/toggle/', {'restaurant_id': self.restaurant.id})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['scrapped'])
    
    def test_scrap_toggle_missing_id(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/scraps/toggle/', {})
        self.assertEqual(response.status_code, 400)
    
    def test_scrap_toggle_invalid_restaurant(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/scraps/toggle/', {'restaurant_id': 99999})
        self.assertEqual(response.status_code, 404)
    
    def test_onboarding_list_empty(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/onboarding/')
        self.assertEqual(response.status_code, 404)
    
    def test_onboarding_list_with_data(self):
        from .models import UserPreference
        self.client.force_authenticate(user=self.user)
        UserPreference.objects.create(
            user=self.user,
            spicy_level=3,
            sweet_level=2,
            salty_level=4
        )
        response = self.client.get('/api/v1/onboarding/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('spicy_level', response.data)
    
    def test_onboarding_create_new(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/onboarding/', {
            'spicy_level': 3,
            'sweet_level': 2,
            'salty_level': 4,
            'allergies': ['땅콩'],
            'disliked_ingredients': ['고수'],
            'favorite_cuisines': ['한식']
        })
        self.assertEqual(response.status_code, 201)
    
    def test_onboarding_create_update_existing(self):
        from .models import UserPreference
        self.client.force_authenticate(user=self.user)
        UserPreference.objects.create(
            user=self.user,
            spicy_level=3,
            sweet_level=2,
            salty_level=4
        )
        response = self.client.post('/api/v1/onboarding/', {'spicy_level': 5})
        self.assertEqual(response.status_code, 200)
    
    def test_onboarding_create_invalid_data(self):
        from .models import UserPreference
        self.client.force_authenticate(user=self.user)
        UserPreference.objects.create(
            user=self.user,
            spicy_level=3,
            sweet_level=2,
            salty_level=4
        )
        response = self.client.post('/api/v1/onboarding/', {'spicy_level': 'invalid'})
        self.assertEqual(response.status_code, 400)
    
    def test_onboarding_patch_update(self):
        from .models import UserPreference
        self.client.force_authenticate(user=self.user)
        UserPreference.objects.create(
            user=self.user,
            spicy_level=3,
            sweet_level=2,
            salty_level=4
        )
        response = self.client.patch('/api/v1/onboarding/update/', {'spicy_level': 5})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['spicy_level'], 5)
    
    def test_onboarding_patch_no_preference(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/v1/onboarding/update/', {'spicy_level': 5})
        self.assertEqual(response.status_code, 404)
    
    def test_onboarding_patch_invalid_data(self):
        from .models import UserPreference
        self.client.force_authenticate(user=self.user)
        UserPreference.objects.create(
            user=self.user,
            spicy_level=3,
            sweet_level=2,
            salty_level=4
        )
        response = self.client.patch('/api/v1/onboarding/update/', {'spicy_level': 'invalid'})
        self.assertEqual(response.status_code, 400)
