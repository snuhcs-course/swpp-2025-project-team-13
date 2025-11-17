from django.db import models


class RecommendationResult(models.Model):
    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="recommendation_results")
    query_text = models.TextField(blank=True)
    input_context = models.JSONField(default=dict, blank=True)
    recommended_menu_ids = models.JSONField(default=list, blank=True)
    scores = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
        ]


class RecommendationRanking(models.Model):
    recommendation = models.ForeignKey(RecommendationResult, on_delete=models.CASCADE, related_name="rankings")
    menu = models.ForeignKey("menu.Menu", on_delete=models.CASCADE, related_name="recommendation_rankings")
    rank = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["recommendation", "menu"], name="uniq_recommendation_menu"),
        ]
        indexes = [models.Index(fields=["recommendation", "rank"])]


class EmbeddingCache(models.Model):
    class EntityType(models.TextChoices):
        USER = "user", "user"
        MENU = "menu", "menu"
        IMAGE = "image", "image"
        RESTAURANT = "restaurant", "restaurant"

    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    entity_id = models.PositiveBigIntegerField()
    embedding = models.JSONField(default=list, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["entity_type", "entity_id"], name="uniq_embedding_entity"),
        ]
        indexes = [models.Index(fields=["entity_type", "entity_id"])]


class MenuReasonFeatures(models.Model):
    """Store reason features for recommendations to generate explanations"""
    menu = models.ForeignKey("menu.Menu", on_delete=models.CASCADE, related_name="reason_features")
    restaurant = models.ForeignKey("restaurant.Restaurant", on_delete=models.CASCADE, related_name="menu_reason_features")
    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="menu_reason_features")

    # Reason feature scores (0.0 - 1.0)
    semantic_similarity = models.FloatField(default=0.0, help_text="Text similarity score")
    image_similarity = models.FloatField(default=0.0, help_text="Image/visual similarity score")
    category_match_score = models.FloatField(default=0.0, help_text="Category preference match")
    taste_alignment = models.FloatField(default=0.0, help_text="User taste preference alignment")
    query_alignment = models.FloatField(default=0.0, help_text="Alignment with user's natural language query")
    temporal_fit_score = models.FloatField(default=0.0, help_text="Time-based fit (breakfast/lunch/dinner)")
    distance_score = models.FloatField(default=0.0, help_text="Distance appropriateness")
    popularity_score = models.FloatField(default=0.0, help_text="Restaurant popularity/rating")

    # Penalties
    allergy_penalty = models.FloatField(default=0.0, help_text="Allergy conflict penalty")
    dislike_penalty = models.FloatField(default=0.0, help_text="Disliked ingredient penalty")

    # Generated explanation
    explanation = models.TextField(blank=True, help_text="GPT-generated Korean explanation")
    explanation_reason_keys = models.JSONField(
        default=list,
        blank=True,
        help_text="Top 3 reason keys that contributed most to recommendation"
    )

    # Final score
    final_score = models.FloatField(default=0.0, help_text="Final recommendation score")

    # Metadata
    query_context = models.TextField(blank=True, help_text="User's natural language query context")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["menu", "user"]),
            models.Index(fields=["restaurant", "user"]),
        ]

    def __str__(self):
        return f"{self.user.username} → {self.menu.name} @ {self.restaurant.name}"


class MenuExternalMapping(models.Model):
    """Map Django Menu to external database UUID"""
    menu = models.OneToOneField(
        "menu.Menu",
        on_delete=models.CASCADE,
        related_name="external_mapping"
    )
    external_uuid = models.CharField(
        max_length=36,
        unique=True,
        db_index=True,
        help_text="External database menu UUID"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["external_uuid"]),
        ]

    def __str__(self):
        return f"MenuMapping(django={self.menu.id}, external={self.external_uuid})"


class RestaurantExternalMapping(models.Model):
    """Map Django Restaurant to external database UUID"""
    restaurant = models.OneToOneField(
        "restaurant.Restaurant",
        on_delete=models.CASCADE,
        related_name="external_mapping"
    )
    external_uuid = models.CharField(
        max_length=36,
        unique=True,
        db_index=True,
        help_text="External database restaurant UUID"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["external_uuid"]),
        ]

    def __str__(self):
        return f"RestaurantMapping(django={self.restaurant.id}, external={self.external_uuid})"
