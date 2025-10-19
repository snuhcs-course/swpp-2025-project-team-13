from django.db import models


class Menu(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    embedding = models.JSONField(default=list, blank=True)
    tag_name = models.CharField(max_length=100, blank=True)

    class Meta:
        indexes = [models.Index(fields=["name", "category"])]


class MenuCandidate(models.Model):
    restaurant = models.ForeignKey("restaurant.Restaurant", on_delete=models.CASCADE, related_name="menu_candidates")
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    image_url = models.URLField(blank=True)
    embedding = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["restaurant", "name"])]


