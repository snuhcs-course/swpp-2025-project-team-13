from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import User, Profile, Follow


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
