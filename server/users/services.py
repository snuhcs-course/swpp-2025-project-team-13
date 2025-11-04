from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import User, Profile, Follow, UserGalleryImage
from .image_utils import _read_image_from_s3, get_clip_embedding_from_bytes, get_food_image_category, normalize_to_onboarding_category

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
def upload_user_photo(*, user: User, photo_url: str, local_uri: str) -> str:
    photo = UserGalleryImage.objects.create(user=user, image_url=photo_url, local_uri=local_uri)
    photo.category_tag = get_food_image_category(photo_url)[0]
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