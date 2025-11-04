from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    email = models.EmailField(unique=True)
    nickname = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    bio = models.TextField(blank=True)
    preferences = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name="followers")
    status = models.CharField(
        max_length=16,
        choices=[("requested", "requested"), ("accepted", "accepted")],
        default="requested",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["follower", "following"], name="uniq_follow_pair"),
            models.CheckConstraint(check=~models.Q(follower=models.F("following")), name="no_self_follow"),
        ]
        indexes = [models.Index(fields=["follower", "following", "status"])]


class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preference")
    spicy_level = models.PositiveSmallIntegerField(default=0)
    sweet_level = models.PositiveSmallIntegerField(default=0)
    salty_level = models.PositiveSmallIntegerField(default=0)
    exploration_preference = models.FloatField(default=2.5, help_text="0=familiar foods, 5=adventurous")
    allergies = models.JSONField(default=list, blank=True)
    disliked_ingredients = models.JSONField(default=list, blank=True)
    favorite_cuisines = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class UserGalleryImage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="gallery_images")
    image_url = models.URLField()
    ai_label = models.CharField(max_length=100, blank=True)
    category_tag = models.CharField(max_length=100, blank=True)
    embedding = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    local_uri = models.CharField(max_length=100, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
        ]


class UserScrap(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="scraps")
    restaurant = models.ForeignKey("restaurant.Restaurant", on_delete=models.CASCADE, related_name="scrapped_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "restaurant"], name="uniq_user_restaurant_scrap"),
        ]
        indexes = [
            models.Index(fields=["user", "restaurant"]),
        ]
    
    def __str__(self):
        return f"{self.user.username} → {self.restaurant.name}"