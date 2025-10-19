from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Profile, Follow, UserScrap, UserPreference


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('username',)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'bio', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('updated_at',)


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'following', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('follower__username', 'following__username')
    readonly_fields = ('created_at',)


@admin.register(UserScrap)
class UserScrapAdmin(admin.ModelAdmin):
    list_display = ('user', 'restaurant', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'restaurant__name')
    readonly_fields = ('created_at',)
    
    def get_queryset(self, request):
        # 성능 최적화: user와 restaurant 정보를 함께 로드
        qs = super().get_queryset(request)
        return qs.select_related('user', 'restaurant')


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'spicy_level', 'sweet_level', 'salty_level', 'allergies_count', 'disliked_count', 'cuisines_count', 'created_at')
    list_filter = ('created_at', 'spicy_level', 'sweet_level', 'salty_level')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at',)
    
    def allergies_count(self, obj):
        return len(obj.allergies) if obj.allergies else 0
    allergies_count.short_description = 'Allergies'
    
    def disliked_count(self, obj):
        return len(obj.disliked_ingredients) if obj.disliked_ingredients else 0
    disliked_count.short_description = 'Disliked'
    
    def cuisines_count(self, obj):
        return len(obj.favorite_cuisines) if obj.favorite_cuisines else 0
    cuisines_count.short_description = 'Cuisines'
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Taste Preferences', {
            'fields': ('spicy_level', 'sweet_level', 'salty_level'),
            'description': 'Scale from 0 (not at all) to 10 (very much)'
        }),
        ('Dietary Restrictions', {
            'fields': ('allergies', 'disliked_ingredients'),
            'classes': ('collapse',)
        }),
        ('Cuisine Preferences', {
            'fields': ('favorite_cuisines',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        # 성능 최적화: user 정보를 함께 로드
        qs = super().get_queryset(request)
        return qs.select_related('user')
