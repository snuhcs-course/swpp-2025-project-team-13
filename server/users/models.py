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
    # RL weight vector for scoring function: [w1, w2, w3, w4, w5, w6, w7]
    # Default weights from current HybridScorer: [0.65, 0.20, 0.10, 0.05, 0.10, 0.0, 0.0]
    rl_weight_vector = models.JSONField(
        default=list,
        blank=True,
        help_text="RL-optimized weights for [text_sim, popularity, distance, price, freshness, query_sim, taste_align]"
    )
    created_at = models.DateTimeField(auto_now_add=True)


class UserGalleryImage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="gallery_images")
    image_url = models.URLField()

    # Primary label (best match from CLIP + foodlist.json)
    ai_label = models.CharField(max_length=100, blank=True)
    category_tag = models.CharField(max_length=100, blank=True)

    # Alternative labels (top 5 suggestions for user to choose from)
    label_alternatives = models.JSONField(
        default=list,
        blank=True,
        help_text="List of dicts: [{'name': '치킨', 'confidence': 0.95}, ...]"
    )

    # Confidence score of the primary label
    label_confidence = models.FloatField(default=0.0, help_text="0.0-1.0 confidence")

    # Track if label was manually edited by user
    label_manually_edited = models.BooleanField(default=False)
    label_edited_at = models.DateTimeField(null=True, blank=True)

    # Original inferred label (before user edit)
    original_ai_label = models.CharField(max_length=100, blank=True)

    embedding = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    local_uri = models.CharField(max_length=100, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "category_tag"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.ai_label} ({self.created_at.date()})"


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


class UserInteraction(models.Model):
    """Track user interactions with menus and restaurants for RL reward learning."""
    INTERACTION_TYPES = [
        ('scrap', 'User saved/scrapped a restaurant'),
        ('click', 'User clicked/opened a menu item'),
        ('view', 'User viewed a menu item'),
        ('hide', 'User swiped to hide a recommendation'),
        ('expand', 'User expanded/opened detail page'),
        ('allergic_reaction', 'User reported negative reaction'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="interactions")
    menu_id = models.IntegerField(null=True, blank=True, help_text="Menu ID from recommendation system")
    restaurant_id = models.IntegerField(null=True, blank=True, help_text="Restaurant ID from recommendation system")
    interaction_type = models.CharField(max_length=20, choices=INTERACTION_TYPES)
    reward_value = models.FloatField(help_text="Reward signal: +1.0 scrap, +0.5 click, -1.0 hide, etc.")
    context_query = models.TextField(blank=True, help_text="Natural language query that led to this interaction")
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "timestamp"]),
            models.Index(fields=["user", "interaction_type"]),
            models.Index(fields=["timestamp"]),
        ]

    def __str__(self):
        return f"{self.user.username} → {self.interaction_type} (+{self.reward_value})"


class RLWeightHistory(models.Model):
    """Store RL weight vector history for each user."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rl_weight_history")
    # Weights for: text_similarity, popularity, distance, price, freshness, query_similarity, taste_alignment
    weights = models.JSONField(
        help_text="Weight vector [w1, w2, w3, w4, w5, w6, w7] for scoring function"
    )
    update_cycle = models.IntegerField(help_text="Cycle number (0, 1, 2, ...)")
    created_at = models.DateTimeField(auto_now_add=True)
    update_method = models.CharField(
        max_length=50,
        default='linucb',
        choices=[('linucb', 'LinUCB'), ('thompson', 'Thompson Sampling'), ('policy_gradient', 'Policy Gradient')]
    )

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "update_cycle"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - Cycle {self.update_cycle}"