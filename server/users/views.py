from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from restaurant.models import Restaurant
from .models import (
    User,
    Follow,
    UserScrap,
    UserPreference,
    UserGalleryImage,
    UserInteraction,
    RLWeightHistory,
    UserRemoteScrap,
)
from .serializers import (
    UserSerializer,
    ProfileSerializer,
    FollowSerializer,
    UserScrapSerializer,
    UserPreferenceSerializer,
    UserGalleryImageSerializer,
    UserInteractionSerializer,
    RLWeightHistorySerializer,
)
from . import services
from .scrap_category_service import ScrapCategoryPreferenceService, update_category_preference_on_scrap
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

    @action(detail=False, methods=['post'], url_path='restore-from-aws')
    def restore_from_aws(self, request):
        """Restore gallery images from AWS metadata to database"""
        from django.utils import timezone
        from datetime import datetime

        gallery_data = request.data
        if not isinstance(gallery_data, list):
            return Response(
                {'error': 'Expected list of gallery items'},
                status=status.HTTP_400_BAD_REQUEST
            )

        restored_count = 0
        skipped_count = 0

        for item in gallery_data:
            try:
                # Parse datetime fields
                created_at = datetime.fromisoformat(item['created_at'].replace('Z', '+00:00'))
                label_edited_at = None
                if item.get('label_edited_at'):
                    label_edited_at = datetime.fromisoformat(item['label_edited_at'].replace('Z', '+00:00'))

                # Check if image already exists (avoid duplicates)
                existing = UserGalleryImage.objects.filter(
                    user=request.user,
                    image_url=item['image_url']
                ).first()

                if existing:
                    skipped_count += 1
                    continue

                # Create gallery image record
                UserGalleryImage.objects.create(
                    user=request.user,
                    image_url=item['image_url'],
                    ai_label=item.get('ai_label', ''),
                    category_tag=item.get('category_tag', ''),
                    label_alternatives=item.get('label_alternatives', []),
                    label_confidence=item.get('label_confidence', 0.0),
                    label_manually_edited=item.get('label_manually_edited', False),
                    label_edited_at=label_edited_at,
                    original_ai_label=item.get('original_ai_label', ''),
                    embedding=item.get('embedding', []),
                    local_uri=item.get('local_uri', ''),
                    created_at=created_at,
                )
                restored_count += 1

            except Exception as e:
                logger.error(f"Error restoring gallery item: {e}")
                continue

        return Response({
            'message': f'Successfully restored {restored_count} gallery items, skipped {skipped_count} duplicates',
            'restored': restored_count,
            'skipped': skipped_count
        }, status=status.HTTP_200_OK)


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
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            print(f"🔍 DEBUG: Scraps for user {self.request.user.username} (ID: {self.request.user.id})")
            queryset = UserScrap.objects.filter(user=self.request.user).select_related('restaurant')
            print(f"📊 DEBUG: Found {queryset.count()} scraps")
            return queryset
        else:
            print("❌ DEBUG: User not authenticated")
            return UserScrap.objects.none()

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

        # Log interaction for RL reward learning
        context_query = request.data.get('context_query', '')
        UserInteraction.objects.create(
            user=request.user,
            restaurant_id=restaurant_id,
            interaction_type='scrap',
            reward_value=1.0,
            context_query=context_query
        )
        logger.info(f"User {request.user.id} scrapped restaurant {restaurant_id} - logged interaction")

        serializer = self.get_serializer(scrap)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        """스크랩 삭제"""
        scrap = get_object_or_404(self.get_queryset(), pk=pk)
        restaurant_id = scrap.restaurant_id

        # Log interaction (negative reward for removing a scrap)
        UserInteraction.objects.create(
            user=request.user,
            restaurant_id=restaurant_id,
            interaction_type='hide',
            reward_value=-1.0,
            context_query='scrap_removed'
        )
        logger.info(f"User {request.user.id} removed scrap for restaurant {restaurant_id} - logged interaction")

        scrap.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        """스크랩 토글 (있으면 삭제, 없으면 추가)"""
        print(f"🔄 DEBUG TOGGLE: User {request.user.username} (ID: {request.user.id})")
        restaurant_id = request.data.get('restaurant_id')
        restaurant_name = request.data.get('restaurant_name')
        print(f"🍽️ DEBUG TOGGLE: Restaurant ID {restaurant_id}, Name: {restaurant_name}")

        restaurant = None

        if restaurant_id:
            try:
                # First try to find by Django model ID (integer)
                restaurant = Restaurant.objects.get(id=restaurant_id)
            except (Restaurant.DoesNotExist, ValueError):
                # If not found or not a valid integer, try to find by source UUID
                try:
                    restaurant = Restaurant.objects.get(source=f"external_{restaurant_id}")
                    print(f"🎯 DEBUG TOGGLE: Found restaurant by source UUID - Django ID: {restaurant.id}")
                except Restaurant.DoesNotExist:
                    pass

        # If no restaurant found by ID, try to find by name
        if not restaurant and restaurant_name:
            try:
                restaurant = Restaurant.objects.get(name=restaurant_name)
                print(f"🎯 DEBUG TOGGLE: Found restaurant by name - ID: {restaurant.id}")
            except Restaurant.DoesNotExist:
                print(f"⚠️ DEBUG TOGGLE: Restaurant not found by name: '{restaurant_name}'")
                # Try partial match
                similar = Restaurant.objects.filter(name__icontains=restaurant_name.split()[0])[:3]
                print(f"🔍 DEBUG TOGGLE: Similar restaurants: {[r.name for r in similar]}")
                pass

        # If restaurant still not found, try to create it from recommendation system data
        if not restaurant and restaurant_id and restaurant_name:
            try:
                # Query the recommendation database to get restaurant details
                from psql.preprocess.preprocess import get_db_connection
                import uuid

                # Validate UUID format
                try:
                    uuid.UUID(restaurant_id)
                    is_valid_uuid = True
                except ValueError:
                    is_valid_uuid = False

                if is_valid_uuid:
                    conn = get_db_connection()
                    cursor = conn.cursor()

                    try:
                        # Query restaurant from recommendation database
                        cursor.execute("""
                            SELECT name, address, ST_Y(geom::geometry) as latitude, ST_X(geom::geometry) as longitude
                            FROM db_restaurants
                            WHERE id = %s
                        """, [restaurant_id])

                        restaurant_data = cursor.fetchone()

                        if restaurant_data:
                            name, address, lat, lng = restaurant_data
                            print(f"🏗️ DEBUG TOGGLE: Creating new restaurant from recommendation data: {name}")

                            # Create new restaurant in Django ORM
                            restaurant = Restaurant.objects.create(
                                name=name,
                                address=address or "",
                                latitude=lat,
                                longitude=lng,
                                source=f"external_{restaurant_id}"
                            )
                            print(f"✅ DEBUG TOGGLE: Created restaurant with Django ID: {restaurant.id}")
                        else:
                            print(f"❌ DEBUG TOGGLE: Restaurant {restaurant_id} not found in recommendation database")
                    except Exception as db_error:
                        print(f"❌ DEBUG TOGGLE: Database query error: {db_error}")
                    finally:
                        cursor.close()
                        conn.close()

            except Exception as create_error:
                print(f"❌ DEBUG TOGGLE: Error creating restaurant: {create_error}")

        if not restaurant:
            return Response(
                {"error": "restaurant_id or restaurant_name is required and must match an existing restaurant"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 이미 스크랩했는지 확인
        scrap = UserScrap.objects.filter(user=request.user, restaurant=restaurant).first()
        print(f"📋 DEBUG TOGGLE: Existing scrap found: {scrap is not None}")

        if scrap:
            # 스크랩 해제
            scrap.delete()

            # Log negative interaction
            UserInteraction.objects.create(
                user=request.user,
                restaurant_id=restaurant.id,
                interaction_type='hide',
                reward_value=-1.0,
                context_query='scrap_toggled_off'
            )
            logger.info(f"User {request.user.id} toggled off scrap for restaurant {restaurant_id} - logged interaction")

            return Response(
                {"scrapped": False, "message": "Scrap removed"},
                status=status.HTTP_200_OK
            )
        else:
            # 스크랩 추가
            scrap = UserScrap.objects.create(user=request.user, restaurant=restaurant)

            # Log positive interaction
            context_query = request.data.get('context_query', '')
            UserInteraction.objects.create(
                user=request.user,
                restaurant_id=restaurant.id,
                interaction_type='scrap',
                reward_value=1.0,
                context_query=context_query
            )
            logger.info(f"User {request.user.id} toggled on scrap for restaurant {restaurant_id} - logged interaction")

            serializer = self.get_serializer(scrap)
            return Response(
                {"scrapped": True, "data": serializer.data},
                status=status.HTTP_201_CREATED
            )

    def _is_aws_configured(self):
        """Check if AWS credentials are properly configured"""
        from django.conf import settings

        aws_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        aws_secret = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)

        # Check if credentials exist and are not placeholder values
        return bool(aws_key and aws_secret and
                   aws_key != 'placeholder_key' and
                   aws_secret != 'placeholder_secret' and
                   aws_key.strip() and aws_secret.strip())

    def _upload_to_local_storage(self, user_id, username, scraps_data):
        """Fallback: Store scraps in local file storage"""
        import json
        import os
        from django.conf import settings

        # Create user scraps directory
        base_dir = getattr(settings, 'BASE_DIR', '/tmp')
        scraps_dir = os.path.join(base_dir, 'user_scraps', str(user_id))
        os.makedirs(scraps_dir, exist_ok=True)

        # Write scraps to JSON file
        scraps_file = os.path.join(scraps_dir, 'scraps.json')
        scraps_json = json.dumps(scraps_data, indent=2, ensure_ascii=False)

        with open(scraps_file, 'w', encoding='utf-8') as f:
            f.write(scraps_json)

        print(f"✅ Successfully stored {len(scraps_data)} scraps locally: {scraps_file}")
        return scraps_file

    def _download_from_local_storage(self, user_id):
        """Fallback: Load scraps from local file storage"""
        import json
        import os
        from django.conf import settings

        base_dir = getattr(settings, 'BASE_DIR', '/tmp')
        scraps_file = os.path.join(base_dir, 'user_scraps', str(user_id), 'scraps.json')

        if os.path.exists(scraps_file):
            with open(scraps_file, 'r', encoding='utf-8') as f:
                scraps_data = json.load(f)
            print(f"✅ Successfully loaded {len(scraps_data)} scraps locally: {scraps_file}")
            return scraps_data
        else:
            print(f"ℹ️ No local scraps file found for user {user_id}")
            return []

    @action(detail=False, methods=['post'], url_path='upload-to-aws')
    def upload_to_aws(self, request):
        """원격 저장소에 스크랩 데이터 업로드 (AWS S3 또는 로컬 저장소 폴백)"""
        import json
        from django.conf import settings

        scraps_data = request.data.get('scraps', [])

        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        print(f"📤 Remote Upload: Processing {len(scraps_data)} scraps for user {request.user.username} (ID: {request.user.id})")

        # Check if AWS is properly configured
        if self._is_aws_configured():
            # Use real AWS S3
            try:
                import boto3
                from botocore.exceptions import ClientError, NoCredentialsError

                # Initialize S3 client
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY'),
                    region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
                )

                # S3 bucket and file path
                bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'swpp-foodigram-storage')
                file_key = f"user-scraps/{request.user.id}/scraps.json"

                # Convert scraps data to JSON
                scraps_json = json.dumps(scraps_data, indent=2, ensure_ascii=False)

                # Upload to S3
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=file_key,
                    Body=scraps_json.encode('utf-8'),
                    ContentType='application/json',
                    Metadata={
                        'user_id': str(request.user.id),
                        'username': request.user.username,
                        'upload_timestamp': str(timezone.now().isoformat())
                    }
                )

                print(f"✅ Successfully uploaded {len(scraps_data)} scraps to S3: s3://{bucket_name}/{file_key}")

                return Response(
                    {"message": f"Successfully uploaded {len(scraps_data)} scraps to AWS S3"},
                    status=status.HTTP_200_OK
                )

            except Exception as e:
                print(f"❌ AWS S3 upload failed: {e}")
                print("🔄 Falling back to local storage...")

                # Fallback to local storage
                try:
                    self._upload_to_local_storage(request.user.id, request.user.username, scraps_data)
                    return Response(
                        {"message": f"Successfully uploaded {len(scraps_data)} scraps to local storage (AWS fallback)"},
                        status=status.HTTP_200_OK
                    )
                except Exception as local_error:
                    print(f"❌ Local storage fallback failed: {local_error}")
                    return Response(
                        {"error": f"Upload failed: {str(local_error)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
        else:
            # AWS not configured, use local storage
            print("ℹ️ AWS not configured, using local storage")
            try:
                self._upload_to_local_storage(request.user.id, request.user.username, scraps_data)
                return Response(
                    {"message": f"Successfully uploaded {len(scraps_data)} scraps to local storage"},
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                print(f"❌ Local storage upload failed: {e}")
                return Response(
                    {"error": f"Upload failed: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

    @action(detail=False, methods=['post'], url_path='upload-gallery-to-aws')
    def upload_gallery_to_aws(self, request):
        """갤러리 이미지 메타데이터를 원격 저장소에 업로드 (AWS S3 또는 로컬 저장소 폴백)"""
        import json
        from django.conf import settings

        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Get current gallery images from database
        gallery_images = UserGalleryImage.objects.filter(user=request.user)
        gallery_data = []

        for image in gallery_images:
            gallery_data.append({
                "image_url": image.image_url,
                "ai_label": image.ai_label,
                "category_tag": image.category_tag,
                "label_alternatives": image.label_alternatives,
                "label_confidence": image.label_confidence,
                "label_manually_edited": image.label_manually_edited,
                "label_edited_at": image.label_edited_at.isoformat() if image.label_edited_at else None,
                "original_ai_label": image.original_ai_label,
                "embedding": image.embedding,
                "local_uri": image.local_uri,
                "created_at": image.created_at.isoformat(),
            })

        print(f"📤 Remote Gallery Upload: Processing {len(gallery_data)} gallery images for user {request.user.username} (ID: {request.user.id})")

        # Check if AWS is properly configured
        if self._is_aws_configured():
            # Use real AWS S3
            try:
                import boto3
                from botocore.exceptions import ClientError, NoCredentialsError

                # Initialize S3 client
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY'),
                    region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
                )

                # S3 bucket and file path
                bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'swpp-foodigram-storage')
                file_key = f"user-gallery/{request.user.id}/gallery.json"

                # Upload to S3
                gallery_json = json.dumps(gallery_data, ensure_ascii=False, indent=2)
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=file_key,
                    Body=gallery_json.encode('utf-8'),
                    ContentType='application/json'
                )

                print(f"✅ Successfully uploaded {len(gallery_data)} gallery images to S3: s3://{bucket_name}/{file_key}")

                return Response(
                    {"message": f"Successfully uploaded {len(gallery_data)} gallery images to S3"},
                    status=status.HTTP_200_OK
                )

            except Exception as e:
                print(f"❌ AWS S3 gallery upload failed: {e}")
                print("🔄 Falling back to local storage...")

                # Fallback to local storage
                try:
                    self._upload_gallery_to_local_storage(request.user.id, request.user.username, gallery_data)
                    return Response(
                        {"message": f"Successfully uploaded {len(gallery_data)} gallery images to local storage (AWS fallback)"},
                        status=status.HTTP_200_OK
                    )
                except Exception as local_error:
                    print(f"❌ Local storage fallback failed: {local_error}")
                    return Response(
                        {"error": f"Gallery upload failed: {str(local_error)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
        else:
            # AWS not configured, use local storage
            print("ℹ️ AWS not configured, using local storage for gallery")
            try:
                self._upload_gallery_to_local_storage(request.user.id, request.user.username, gallery_data)
                return Response(
                    {"message": f"Successfully uploaded {len(gallery_data)} gallery images to local storage"},
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                print(f"❌ Local storage gallery upload failed: {e}")
                return Response(
                    {"error": f"Gallery upload failed: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

    @action(detail=False, methods=['get'], url_path='download-gallery-from-aws')
    def download_gallery_from_aws(self, request):
        """원격 저장소에서 갤러리 이미지 메타데이터 다운로드 (AWS S3 또는 로컬 저장소 폴백)"""
        import json
        from django.conf import settings

        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        print(f"📥 Remote Gallery Download: Fetching gallery images for user {request.user.username} (ID: {request.user.id})")

        # Check if AWS is properly configured
        if self._is_aws_configured():
            # Use real AWS S3
            try:
                import boto3
                from botocore.exceptions import ClientError, NoCredentialsError

                # Initialize S3 client
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY'),
                    region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
                )

                # S3 bucket and file path
                bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'swpp-foodigram-storage')
                file_key = f"user-gallery/{request.user.id}/gallery.json"

                # Download from S3
                try:
                    response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
                    gallery_json = response['Body'].read().decode('utf-8')
                    gallery_data = json.loads(gallery_json)

                    print(f"✅ Successfully downloaded {len(gallery_data)} gallery images from S3: s3://{bucket_name}/{file_key}")

                    return Response(gallery_data, status=status.HTTP_200_OK)

                except ClientError as e:
                    error_code = e.response['Error']['Code']
                    if error_code == 'NoSuchKey':
                        print(f"ℹ️ No gallery file found in S3 for user {request.user.username} - returning empty array")
                        return Response([], status=status.HTTP_200_OK)
                    else:
                        raise e

            except Exception as e:
                print(f"❌ AWS S3 gallery download failed: {e}")
                print("🔄 Falling back to local storage...")

                # Fallback to local storage
                try:
                    gallery_data = self._download_gallery_from_local_storage(request.user.id)
                    return Response(gallery_data, status=status.HTTP_200_OK)
                except Exception as local_error:
                    print(f"❌ Local storage fallback failed: {local_error}")
                    return Response(
                        {"error": f"Gallery download failed: {str(local_error)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
        else:
            # AWS not configured, use local storage
            print("ℹ️ AWS not configured, using local storage for gallery")
            try:
                gallery_data = self._download_gallery_from_local_storage(request.user.id)
                return Response(gallery_data, status=status.HTTP_200_OK)
            except Exception as e:
                print(f"❌ Local storage gallery download failed: {e}")
                return Response(
                    {"error": f"Gallery download failed: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

    @action(detail=False, methods=['get'], url_path='download-from-aws')
    def download_from_aws(self, request):
        """원격 저장소에서 스크랩 데이터 다운로드 (AWS S3 또는 로컬 저장소 폴백)"""
        import json
        from django.conf import settings

        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        print(f"📥 Remote Download: Fetching scraps for user {request.user.username} (ID: {request.user.id})")

        # Check if AWS is properly configured
        if self._is_aws_configured():
            # Use real AWS S3
            try:
                import boto3
                from botocore.exceptions import ClientError, NoCredentialsError

                # Initialize S3 client
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY'),
                    region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
                )

                # S3 bucket and file path
                bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'swpp-foodigram-storage')
                file_key = f"user-scraps/{request.user.id}/scraps.json"

                # Download from S3
                try:
                    response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
                    scraps_json = response['Body'].read().decode('utf-8')
                    scraps_data = json.loads(scraps_json)

                    print(f"✅ Successfully downloaded {len(scraps_data)} scraps from S3: s3://{bucket_name}/{file_key}")

                    return Response(scraps_data, status=status.HTTP_200_OK)

                except ClientError as e:
                    error_code = e.response['Error']['Code']
                    if error_code == 'NoSuchKey':
                        print(f"ℹ️ No scraps file found in S3 for user {request.user.username} - returning empty array")
                        return Response([], status=status.HTTP_200_OK)
                    else:
                        raise e

            except Exception as e:
                print(f"❌ AWS S3 download failed: {e}")
                print("🔄 Falling back to local storage...")

                # Fallback to local storage
                try:
                    scraps_data = self._download_from_local_storage(request.user.id)
                    return Response(scraps_data, status=status.HTTP_200_OK)
                except Exception as local_error:
                    print(f"❌ Local storage fallback failed: {local_error}")
                    return Response(
                        {"error": f"Download failed: {str(local_error)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
        else:
            # AWS not configured, use local storage
            print("ℹ️ AWS not configured, using local storage")
            try:
                scraps_data = self._download_from_local_storage(request.user.id)
                return Response(scraps_data, status=status.HTTP_200_OK)
            except Exception as e:
                print(f"❌ Local storage download failed: {e}")
                return Response(
                    {"error": f"Download failed: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

    def _upload_gallery_to_local_storage(self, user_id, username, gallery_data):
        """Fallback: Store gallery metadata in local file storage"""
        import json
        import os
        from django.conf import settings

        # Create user gallery directory
        base_dir = getattr(settings, 'BASE_DIR', '/tmp')
        gallery_dir = os.path.join(base_dir, 'user_gallery', str(user_id))
        os.makedirs(gallery_dir, exist_ok=True)

        # Write gallery data to JSON file
        gallery_file = os.path.join(gallery_dir, 'gallery.json')
        gallery_json = json.dumps(gallery_data, indent=2, ensure_ascii=False)

        with open(gallery_file, 'w', encoding='utf-8') as f:
            f.write(gallery_json)

        print(f"✅ Successfully stored {len(gallery_data)} gallery images locally: {gallery_file}")

    def _download_gallery_from_local_storage(self, user_id):
        """Fallback: Load gallery metadata from local file storage"""
        import json
        import os
        from django.conf import settings

        base_dir = getattr(settings, 'BASE_DIR', '/tmp')
        gallery_file = os.path.join(base_dir, 'user_gallery', str(user_id), 'gallery.json')

        if os.path.exists(gallery_file):
            with open(gallery_file, 'r', encoding='utf-8') as f:
                gallery_data = json.load(f)
            print(f"✅ Successfully loaded {len(gallery_data)} gallery images locally: {gallery_file}")
            return gallery_data
        else:
            print(f"ℹ️ No local gallery file found for user {user_id}")
            return []


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
        from django.db import transaction, IntegrityError

        try:
            with transaction.atomic():
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
        except IntegrityError:
            # Handle race condition - preference was created by another request
            try:
                preference = UserPreference.objects.get(user=request.user)
                created = False
            except UserPreference.DoesNotExist:
                # If still doesn't exist, re-raise the error
                raise

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


class InteractionViewSet(viewsets.GenericViewSet):
    """API for logging user interactions (clicks, scraps, hides) for RL reward learning"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserInteractionSerializer

    def get_queryset(self):
        """Get interactions for current user"""
        return UserInteraction.objects.filter(user=self.request.user)

    def list(self, request):
        """List recent interactions for current user"""
        interactions = self.get_queryset().order_by('-timestamp')[:100]  # Last 100 interactions
        serializer = self.get_serializer(interactions, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Log a user interaction"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def log_scrap(self, request):
        """Log a scrap interaction (+1.0 reward)"""
        restaurant_id = request.data.get('restaurant_id')
        if not restaurant_id:
            return Response(
                {"error": "restaurant_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        interaction = UserInteraction.objects.create(
            user=request.user,
            restaurant_id=restaurant_id,
            interaction_type='scrap',
            reward_value=1.0,
            context_query=request.data.get('context_query', '')
        )
        serializer = self.get_serializer(interaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def log_click(self, request):
        """Log a menu click interaction (+0.5 reward)"""
        menu_id = request.data.get('menu_id')
        if not menu_id:
            return Response(
                {"error": "menu_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        interaction = UserInteraction.objects.create(
            user=request.user,
            menu_id=menu_id,
            interaction_type='click',
            reward_value=0.5,
            context_query=request.data.get('context_query', '')
        )
        serializer = self.get_serializer(interaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def log_hide(self, request):
        """Log a hide/swipe interaction (-1.0 reward)"""
        menu_id = request.data.get('menu_id')
        restaurant_id = request.data.get('restaurant_id')

        if not menu_id and not restaurant_id:
            return Response(
                {"error": "menu_id or restaurant_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        interaction = UserInteraction.objects.create(
            user=request.user,
            menu_id=menu_id,
            restaurant_id=restaurant_id,
            interaction_type='hide',
            reward_value=-1.0,
            context_query=request.data.get('context_query', '')
        )
        serializer = self.get_serializer(interaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def log_allergic_reaction(self, request):
        """Log allergic reaction (-2.0 reward)"""
        menu_id = request.data.get('menu_id')
        if not menu_id:
            return Response(
                {"error": "menu_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        interaction = UserInteraction.objects.create(
            user=request.user,
            menu_id=menu_id,
            interaction_type='allergic_reaction',
            reward_value=-2.0,
            context_query=request.data.get('context_query', '')
        )
        serializer = self.get_serializer(interaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RLWeightViewSet(viewsets.GenericViewSet):
    """API for managing RL weight vectors per user"""
    permission_classes = [IsAuthenticated]
    serializer_class = RLWeightHistorySerializer

    def get_queryset(self):
        """Get weight history for current user"""
        return RLWeightHistory.objects.filter(user=self.request.user)

    def list(self, request):
        """List weight history for current user"""
        weights = self.get_queryset().order_by('-created_at')
        serializer = self.get_serializer(weights, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get the current RL weight vector for the user"""
        # Get the most recent weight vector
        latest_weight = self.get_queryset().first()
        if latest_weight:
            serializer = self.get_serializer(latest_weight)
            return Response(serializer.data)
        else:
            # Return default weights if no history exists
            default_weights = [0.65, 0.20, 0.10, 0.05, 0.10, 0.0, 0.0]
            return Response({
                'weights': default_weights,
                'update_cycle': 0,
                'update_method': 'default',
                'message': 'No custom weights yet, using defaults'
            })

    @action(detail=False, methods=['post'], url_path='update_weights')
    def update_weights(self, request):
        """Create a new weight vector update"""
        weights = request.data.get('weights')
        update_cycle = request.data.get('update_cycle', 0)
        update_method = request.data.get('update_method', 'linucb')

        if not weights or not isinstance(weights, list):
            return Response(
                {"error": "weights must be a list of numbers"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(weights) != 7:
            return Response(
                {"error": "weights must have exactly 7 elements"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create new weight history entry
        weight_entry = RLWeightHistory.objects.create(
            user=request.user,
            weights=weights,
            update_cycle=update_cycle,
            update_method=update_method
        )

        # Also update the user preference with the current weights
        preference = UserPreference.objects.filter(user=request.user).first()
        if preference:
            preference.rl_weight_vector = weights
            preference.save()

        serializer = self.get_serializer(weight_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RemoteScrapViewSet(viewsets.GenericViewSet):
    """원격 스크랩 동기화 API - 카테고리 정보 포함"""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserRemoteScrap.objects.filter(user=self.request.user)

    def list(self, request):
        """원격 스크랩 목록 조회"""
        scraps = self.get_queryset().order_by('-scrapped_at')
        data = []
        for scrap in scraps:
            data.append({
                'menu_id': scrap.menu_id,
                'menu_name': scrap.menu_name,
                'place_name': scrap.place_name,
                'price': scrap.price,
                'category': scrap.category,
                'location': scrap.location,
                'rating': scrap.rating,
                'review_count': scrap.review_count,
                'image_url': scrap.image_url,
                'coordinates': scrap.coordinates,
                'scrapped_at': scrap.scrapped_at.isoformat(),
                'synced_at': scrap.synced_at.isoformat(),
            })
        return Response(data)

    def create(self, request):
        """원격 스크랩 생성/동기화"""
        from django.utils.dateparse import parse_datetime

        scraps_data = request.data.get('scraps', [])
        if not isinstance(scraps_data, list):
            scraps_data = [request.data]

        created_count = 0
        updated_count = 0

        for scrap_data in scraps_data:
            menu_id = scrap_data.get('menu_id')
            if not menu_id:
                continue

            scrapped_at = scrap_data.get('scrapped_at')
            if isinstance(scrapped_at, str):
                scrapped_at = parse_datetime(scrapped_at) or timezone.now()
            else:
                scrapped_at = timezone.now()

            defaults = {
                'menu_name': scrap_data.get('menu_name', ''),
                'place_name': scrap_data.get('place_name', ''),
                'price': scrap_data.get('price'),
                'category': scrap_data.get('category', ''),
                'location': scrap_data.get('location', ''),
                'rating': scrap_data.get('rating'),
                'review_count': scrap_data.get('review_count'),
                'image_url': scrap_data.get('image_url', ''),
                'coordinates': scrap_data.get('coordinates', []),
                'scrapped_at': scrapped_at,
            }

            _, created = UserRemoteScrap.objects.update_or_create(
                user=request.user,
                menu_id=menu_id,
                defaults=defaults
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        try:
            service = ScrapCategoryPreferenceService(request.user)
            updated_cuisines = service.update_user_favorite_cuisines()
            logger.info(f"User {request.user.id} category preferences updated: {updated_cuisines}")
        except Exception as e:
            logger.warning(f"Failed to update category preferences after remote sync: {e}")

        return Response({
            'message': 'Scraps synced successfully',
            'created': created_count,
            'updated': updated_count,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='category-preferences')
    def category_preferences(self, request):
        """스크랩 기반 카테고리 선호도 조회"""
        service = ScrapCategoryPreferenceService(request.user)
        profile = service.get_category_preference_profile()
        return Response(profile)

    @action(detail=False, methods=['post'], url_path='refresh-preferences')
    def refresh_preferences(self, request):
        """스크랩 기반 카테고리 선호도 수동 갱신"""
        service = ScrapCategoryPreferenceService(request.user)
        updated_cuisines = service.update_user_favorite_cuisines()
        profile = service.get_category_preference_profile()

        return Response({
            'message': 'Category preferences updated',
            'updated_cuisines': updated_cuisines,
            'profile': profile
        })
