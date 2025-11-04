from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import User, Follow, UserScrap, UserPreference
from .serializers import UserSerializer, ProfileSerializer, FollowSerializer, UserScrapSerializer, UserPreferenceSerializer
from restaurant.models import Restaurant
from .serializers import UserGalleryImageSerializer, UserSerializer, ProfileSerializer, FollowSerializer
from . import services

class PhotoViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        photos = services.list_user_photos(user=request.user)
        serializer = UserGalleryImageSerializer(photos, many=True)
        return Response(serializer.data)

    def create(self, request):
        photo = services.upload_user_photo(user=request.user, photo_url=request.data["photo_url"], local_uri=request.data["local_uri"])
        serializer = UserGalleryImageSerializer(photo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=["patch"])
    def preferences(self, request):
        profile = services.update_profile_preferences(user=request.user, patch=request.data)
        return Response(ProfileSerializer(profile).data)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.select_related("profile").all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["get"])
    def followers(self, request, pk=None):
        users = services.list_followers(user_id=pk)
        return Response(UserSerializer(users, many=True).data)

    @action(detail=True, methods=["get"])
    def followings(self, request, pk=None):
        users = services.list_followings(user_id=pk)
        return Response(UserSerializer(users, many=True).data)


class FollowViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FollowSerializer

    @action(detail=False, methods=["post"])
    def request(self, request):
        f = services.request_follow(follower=request.user, following_id=request.data["following_id"])
        return Response(FollowSerializer(f).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def accept(self, request):
        f = services.accept_follow(follower_id=request.data["follower_id"], following=request.user)
        return Response(FollowSerializer(f).data)

    @action(detail=False, methods=["post"])
    def unfollow(self, request):
        services.unfollow(follower=request.user, following_id=request.data["following_id"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SuggestionViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        users = services.list_follow_suggestions(user=request.user, limit=int(request.query_params.get("limit", 10)))
        return Response(UserSerializer(users, many=True).data)


class ScrapViewSet(viewsets.GenericViewSet):
    """음식점 스크랩 관리 API"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserScrapSerializer
    
    def get_queryset(self):
        """현재 유저의 스크랩만 조회"""
        return UserScrap.objects.filter(user=self.request.user).select_related('restaurant')
    
    def list(self, request):
        """내 스크랩 목록 조회"""
        scraps = self.get_queryset().order_by('-created_at')
        serializer = self.get_serializer(scraps, many=True)
        return Response(serializer.data)
    
    def create(self, request):
        """스크랩 추가"""
        restaurant_id = request.data.get('restaurant_id')
        
        if not restaurant_id:
            return Response(
                {"error": "restaurant_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 음식점 존재 확인
        restaurant = get_object_or_404(Restaurant, id=restaurant_id)
        
        # 이미 스크랩했는지 확인
        if UserScrap.objects.filter(user=request.user, restaurant=restaurant).exists():
            return Response(
                {"error": "Already scrapped"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 스크랩 생성
        scrap = UserScrap.objects.create(user=request.user, restaurant=restaurant)
        serializer = self.get_serializer(scrap)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, pk=None):
        """스크랩 삭제"""
        scrap = get_object_or_404(self.get_queryset(), pk=pk)
        scrap.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        """스크랩 토글 (있으면 삭제, 없으면 추가)"""
        restaurant_id = request.data.get('restaurant_id')
        
        if not restaurant_id:
            return Response(
                {"error": "restaurant_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        restaurant = get_object_or_404(Restaurant, id=restaurant_id)
        
        # 이미 스크랩했는지 확인
        scrap = UserScrap.objects.filter(user=request.user, restaurant=restaurant).first()
        
        if scrap:
            # 스크랩 해제
            scrap.delete()
            return Response(
                {"scrapped": False, "message": "Scrap removed"},
                status=status.HTTP_200_OK
            )
        else:
            # 스크랩 추가
            scrap = UserScrap.objects.create(user=request.user, restaurant=restaurant)
            serializer = self.get_serializer(scrap)
            return Response(
                {"scrapped": True, "data": serializer.data},
                status=status.HTTP_201_CREATED
            )


class OnboardingViewSet(viewsets.GenericViewSet):
    """온보딩 취향 설정 API"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserPreferenceSerializer
    
    def get_queryset(self):
        """현재 유저의 취향 설정만 조회"""
        return UserPreference.objects.filter(user=self.request.user)
    
    def list(self, request):
        """내 취향 설정 조회"""
        preference = UserPreference.objects.filter(user=request.user).first()
        if preference:
            serializer = self.get_serializer(preference)
            return Response(serializer.data)
        else:
            return Response(
                {"message": "No preferences set yet"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def create(self, request):
        """취향 설정 생성/업데이트"""
        preference, created = UserPreference.objects.get_or_create(
            user=request.user,
            defaults={
                'spicy_level': request.data.get('spicy_level', 0),
                'sweet_level': request.data.get('sweet_level', 0),
                'salty_level': request.data.get('salty_level', 0),
                'allergies': request.data.get('allergies', []),
                'disliked_ingredients': request.data.get('disliked_ingredients', []),
                'favorite_cuisines': request.data.get('favorite_cuisines', []),
            }
        )
        
        if not created:
            # 기존 설정 업데이트
            serializer = self.get_serializer(preference, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            serializer = self.get_serializer(preference)
        
        return Response(
            serializer.data, 
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['patch'], url_path='update')
    def update_preferences(self, request):
        """취향 설정 부분 업데이트"""
        preference = UserPreference.objects.filter(user=request.user).first()
        
        if not preference:
            return Response(
                {"error": "No preferences found. Please create preferences first."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(preference, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
