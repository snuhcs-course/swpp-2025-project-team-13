from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Profile, Follow


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
