from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import User, Follow, UserScrap, UserPreference, UserGalleryImage
from .serializers import UserSerializer, ProfileSerializer, FollowSerializer, UserScrapSerializer, UserPreferenceSerializer, UserGalleryImageSerializer
from restaurant.models import Restaurant
from . import services
import logging

logger = logging.getLogger(__name__)


class PhotoViewSet(viewsets.ViewSet):
    """API for managing user gallery images with AI-inferred labels"""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """List all photos for authenticated user"""
        photos = services.list_user_photos(user=request.user)
        serializer = UserGalleryImageSerializer(photos, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Create photo metadata record (S3 URL + local URI). CLIP processing happens separately."""
        # Handle both form data and JSON
        data = request.data or {}
        photo_url = data.get("photo_url", "")
        local_uri = data.get("local_uri", "")

        logger.debug(f"Photo metadata request - photo_url: {photo_url}, local_uri: {local_uri}")

        if not photo_url or not local_uri:
            logger.error(f"Missing required fields: photo_url={photo_url}, local_uri={local_uri}")
            return Response(
                {'error': 'photo_url and local_uri are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create photo record WITHOUT image bytes (no CLIP processing here)
        photo = services.upload_user_photo(
            user=request.user,
            photo_url=photo_url,
            local_uri=local_uri,
            image_bytes=None  # Don't process CLIP here
        )
        serializer = UserGalleryImageSerializer(photo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def update_label(self, request, pk=None):
        """Update image label manually"""
        photo = get_object_or_404(UserGalleryImage, id=pk, user=request.user)
        new_label = request.data.get('label')

        if not new_label:
            return Response(
                {'error': 'Label is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        services.update_image_label(photo=photo, new_label=new_label)
        serializer = UserGalleryImageSerializer(photo)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'])
    def delete_image(self, request, pk=None):
        """Delete image from gallery"""
        photo = get_object_or_404(UserGalleryImage, id=pk, user=request.user)
        services.delete_image(photo=photo)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def search_foods(self, request):
        """Search foodlist for matching food names"""
        query = request.query_params.get('q', '').strip()

        if not query:
            return Response(
                {'error': 'Search query is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            results = services.search_foodlist(query)
            return Response({
                'query': query,
                'primary_results': results['primary'],
                'secondary_results': results['secondary'],
            })
        except Exception as e:
            logger.error(f"Error searching foodlist: {e}")
            return Response(
                {'error': f'Search failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def process_clip(self, request, pk=None):
        """Process image with CLIP using image bytes from request"""
        photo = get_object_or_404(UserGalleryImage, id=pk, user=request.user)
        image_bytes = None

        logger.debug(f"CLIP processing request for photo {pk}")

        # Get image from FormData FILES
        if request.FILES and "image" in request.FILES:
            image_file = request.FILES["image"]
            image_bytes = image_file.read()
            logger.debug(f"Got image from FILES, size: {len(image_bytes) if image_bytes else 0} bytes")
        elif request.data and "image_data" in request.data:
            # Handle base64 encoded image data
            import base64
            try:
                image_data = request.data["image_data"]
                if "," in image_data:
                    image_data = image_data.split(",", 1)[1]
                image_bytes = base64.b64decode(image_data)
                logger.debug(f"Decoded base64 image, size: {len(image_bytes) if image_bytes else 0} bytes")
            except Exception as e:
                logger.error(f"Failed to decode image data: {e}")

        if not image_bytes:
            logger.error(f"No image provided for CLIP processing of photo {pk}")
            return Response(
                {'error': 'Image file or image_data is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Process image with CLIP
        try:
            services.process_photo_with_clip(photo=photo, image_bytes=image_bytes)
            logger.info(f"Successfully processed photo {pk} with CLIP")

            # Fetch updated photo
            serializer = UserGalleryImageSerializer(photo)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error processing photo {pk} with CLIP: {e}")
            return Response(
                {'error': f'CLIP processing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=["patch"])
    def preferences(self, request):
        profile = services.update_profile_preferences(user=request.user, patch=request.data)
        return Response(ProfileSerializer(profile).data)

    @action(detail=False, methods=["get"])
    def aggregated_preferences(self, request):
        """
        Get comprehensive user preference profile from all sources:
        - Taste preferences
        - Allergies & disliked ingredients
        - Favorite cuisines
        - Inferred food interests from gallery
        - Confidence scores
        """
        from recommendation_system.preference_aggregator import UserPreferenceAggregator

        aggregator = UserPreferenceAggregator(request.user)
        profile = aggregator.get_aggregated_profile()
        return Response(profile)


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
