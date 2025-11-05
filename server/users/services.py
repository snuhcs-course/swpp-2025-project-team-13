from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
import logging

from users.image_utils import get_food_image_with_alternatives, get_food_image_with_alternatives_from_bytes
from .models import User, Profile, Follow, UserGalleryImage
from .image_utils import _read_image_from_s3, get_clip_embedding_from_bytes, get_food_image_category, normalize_to_onboarding_category

logger = logging.getLogger(__name__)


@transaction.atomic
def create_user_with_profile(*, username: str, email: str, password: str, bio: str = "", preferences: dict | None = None) -> User:
    user = User.objects.create_user(username=username, email=email, password=password)
    Profile.objects.create(user=user, bio=bio, preferences=preferences or {})
    return user


def update_profile_preferences(*, user: User, patch: dict) -> Profile:
    profile = user.profile
    profile.preferences = {**profile.preferences, **(patch or {})}
    profile.save(update_fields=["preferences", "updated_at"])
    return profile


def request_follow(*, follower: User, following_id: int) -> Follow:
    following = get_object_or_404(User, id=following_id)
    follow, _ = Follow.objects.get_or_create(
        follower=follower,
        following=following,
        defaults={"status": "requested"}
    )
    return follow


def accept_follow(*, follower_id: int, following: User) -> Follow:
    follow = get_object_or_404(Follow, follower_id=follower_id, following=following)
    if follow.status != "accepted":
        follow.status = "accepted"
        follow.save(update_fields=["status"])
    return follow


def unfollow(*, follower: User, following_id: int) -> None:
    Follow.objects.filter(follower=follower, following_id=following_id).delete()


def list_followers(*, user_id: int):
    return User.objects.filter(following__following_id=user_id, following__status="accepted").select_related("profile")


def list_followings(*, user_id: int):
    return User.objects.filter(followers__follower_id=user_id, followers__status="accepted").select_related("profile")


def list_follow_suggestions(*, user: User, limit: int = 10):
    return (
        User.objects.exclude(id=user.id)
        .exclude(id__in=user.following.values("following_id"))
        .order_by("-date_joined")[:limit]
    )

@transaction.atomic
def upload_user_photo(*, user: User, photo_url: str, local_uri: str, image_bytes: bytes = None) -> UserGalleryImage:
    """
    Upload photo and automatically categorize it using CLIP + foodlist.json

    Args:
        user: User uploading the photo
        photo_url: S3 URL of the photo
        local_uri: Local file path/URI
        image_bytes: Raw image bytes (if provided, will be used instead of reading from S3)

    Returns:
        UserGalleryImage instance with AI-inferred label and alternatives
    """
    photo = UserGalleryImage.objects.create(user=user, image_url=photo_url, local_uri=local_uri)

    # Only attempt CLIP labeling if image bytes are provided
    # This avoids S3 AccessDenied errors and allows graceful degradation
    if image_bytes:
        try:
            # Get CLIP categorization with top-5 alternatives from image bytes
            result = get_food_image_with_alternatives_from_bytes(image_bytes)

            if result.get('primary_label'):
                # Check if new fields exist (database migration applied)
                try:
                    photo.ai_label = result['primary_label']
                    photo.category_tag = result['primary_label']
                    photo.label_confidence = result['confidence']
                    photo.original_ai_label = result['clip_prediction']
                    photo.label_alternatives = result['alternatives']

                    photo.save(update_fields=[
                        'ai_label', 'category_tag', 'label_confidence',
                        'original_ai_label', 'label_alternatives'
                    ])
                    logger.info(f"Labeled image {photo.id}: {photo.ai_label} (confidence: {photo.label_confidence:.2f})")
                except Exception as db_error:
                    # If the new fields don't exist yet (migration not applied), log warning and continue
                    logger.warning(f"Could not save labels for image {photo.id}: {db_error}. Database migration may not be applied.")
            else:
                logger.warning(f"Failed to label image {photo.id}: {result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.error(f"Failed to classify image {photo_url}: {e}")
            # Continue without label - don't fail the upload
    else:
        logger.debug(f"Skipped CLIP labeling for image {photo.id} (no image bytes provided)")

    return photo

def upload_user_photo_with_embedding(*, user: User, photo_url: str):
    img_bytes = _read_image_from_s3(photo_url)
    emb = get_clip_embedding_from_bytes(img_bytes)

    # 카테고리 예측은 실패해도 무시(임베딩 저장은 계속 수행)
    try:
        raw_category, _ = get_food_image_category(photo_url)
    except Exception:
        raw_category = None
    _, category_label = normalize_to_onboarding_category(raw_category or "")

    photo = UserGalleryImage.objects.create(
        user=user,
        image_url=photo_url,
        ai_label=raw_category or "",
        category_tag=category_label,
        embedding=emb,
    )

    return photo

@transaction.atomic
def update_image_label(*, photo: UserGalleryImage, new_label: str) -> UserGalleryImage:
    """
    Update image label manually chosen by user

    Args:
        photo: UserGalleryImage instance
        new_label: New label text chosen by user

    Returns:
        Updated UserGalleryImage instance
    """
    photo.ai_label = new_label
    photo.category_tag = new_label
    photo.label_manually_edited = True
    photo.label_edited_at = timezone.now()
    photo.save(update_fields=[
        'ai_label', 'category_tag', 'label_manually_edited', 'label_edited_at'
    ])
    logger.info(f"User manually updated image {photo.id} label to: {new_label}")
    return photo


@transaction.atomic
def delete_image(*, photo: UserGalleryImage) -> None:
    """
    Delete image from gallery

    Args:
        photo: UserGalleryImage instance to delete
    """
    photo_id = photo.id
    photo.delete()
    logger.info(f"Deleted image {photo_id}")


@transaction.atomic
def process_photo_with_clip_from_s3(*, photo: UserGalleryImage) -> UserGalleryImage:
    """
    Process photo with CLIP by fetching image from S3 URL

    Args:
        photo: UserGalleryImage instance to process

    Returns:
        Updated UserGalleryImage instance
    """
    from django.core.files.storage import default_storage
    import io

    if not photo.image_url:
        logger.warning(f"Photo {photo.id} has no image URL, skipping CLIP processing")
        return photo

    try:
        # Fetch image from S3 using boto3
        logger.debug(f"Fetching image from S3: {photo.image_url}")

        import boto3
        from django.conf import settings

        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
            aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY'),
        )

        bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME')
        key = photo.image_url

        # Read the file from S3
        response = s3_client.get_object(Bucket=bucket, Key=key)
        image_bytes = response['Body'].read()

        logger.debug(f"Downloaded {len(image_bytes)} bytes from S3")

        # Get CLIP categorization with top-5 alternatives from image bytes
        result = get_food_image_with_alternatives_from_bytes(image_bytes)

        if result.get('primary_label'):
            # Update photo with CLIP results
            try:
                photo.ai_label = result['primary_label']
                photo.category_tag = result['primary_label']
                photo.label_confidence = result['confidence']
                photo.original_ai_label = result['clip_prediction']
                photo.label_alternatives = result['alternatives']

                photo.save(update_fields=[
                    'ai_label', 'category_tag', 'label_confidence',
                    'original_ai_label', 'label_alternatives'
                ])
                logger.info(f"CLIP processed image {photo.id}: {photo.ai_label} (confidence: {photo.label_confidence:.2f})")
            except Exception as db_error:
                logger.warning(f"Could not save CLIP labels for image {photo.id}: {db_error}. Database migration may not be applied.")
        else:
            logger.warning(f"Failed to label image {photo.id}: {result.get('error', 'Unknown error')}")
    except Exception as e:
        logger.error(f"Failed to process image {photo.id} with CLIP: {e}")
        raise

    return photo


@transaction.atomic
def process_photo_with_clip(*, photo: UserGalleryImage, image_bytes: bytes) -> UserGalleryImage:
    """
    Process an existing photo with CLIP and update its labels

    Args:
        photo: UserGalleryImage instance to process
        image_bytes: Raw image bytes for CLIP processing

    Returns:
        Updated UserGalleryImage instance
    """
    try:
        # Get CLIP categorization with top-5 alternatives from image bytes
        result = get_food_image_with_alternatives_from_bytes(image_bytes)

        if result.get('primary_label'):
            # Update photo with CLIP results
            try:
                photo.ai_label = result['primary_label']
                photo.category_tag = result['primary_label']
                photo.label_confidence = result['confidence']
                photo.original_ai_label = result['clip_prediction']
                photo.label_alternatives = result['alternatives']

                photo.save(update_fields=[
                    'ai_label', 'category_tag', 'label_confidence',
                    'original_ai_label', 'label_alternatives'
                ])
                logger.info(f"CLIP processed image {photo.id}: {photo.ai_label} (confidence: {photo.label_confidence:.2f})")
            except Exception as db_error:
                logger.warning(f"Could not save CLIP labels for image {photo.id}: {db_error}. Database migration may not be applied.")
        else:
            logger.warning(f"Failed to label image {photo.id}: {result.get('error', 'Unknown error')}")
    except Exception as e:
        logger.error(f"Failed to process image {photo.id} with CLIP: {e}")
        raise

    return photo


def search_foodlist(query: str) -> dict:
    """
    Search foodlist.json for matching food names

    Args:
        query: Search string (e.g., '돈')

    Returns:
        {
            'primary': [list of foods that START with query],
            'secondary': [list of foods that CONTAIN query]
        }
    """
    from users.foodlist_matcher import foodlist_matcher

    if not foodlist_matcher or not foodlist_matcher.food_names:
        logger.warning("FoodListMatcher not initialized")
        return {'primary': [], 'secondary': []}

    query_lower = query.lower()
    primary = []
    secondary = []

    for food_name in foodlist_matcher.food_names:
        name_lower = food_name.lower()
        if name_lower.startswith(query_lower):
            primary.append(food_name)
        elif query_lower in name_lower:
            secondary.append(food_name)

    logger.debug(f"Foodlist search '{query}': {len(primary)} primary, {len(secondary)} secondary")
    return {
        'primary': primary,
        'secondary': secondary,
    }


def list_user_photos(*, user: User):
    """List user's photos with their labels"""
    return UserGalleryImage.objects.filter(user=user).order_by("-created_at")
