from django.db import models


class Restaurant(models.Model):
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=300, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    image_url = models.URLField(null=True, blank=True)
    source = models.CharField(max_length=50, unique=True)  # unique 제약조건 추가
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["name"])]
    
    def __str__(self):
        return f"{self.name} (ID: {self.id})"


class RestaurantMenu(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="menus")
    menu = models.ForeignKey("menu.Menu", on_delete=models.CASCADE, related_name="restaurants")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["restaurant", "menu"], name="uniq_restaurant_menu_pair"),
        ]
        indexes = [models.Index(fields=["restaurant", "menu"])]
    
    def __str__(self):
        return f"{self.restaurant.name} - {self.menu}"


