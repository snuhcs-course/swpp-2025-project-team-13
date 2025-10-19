from rest_framework import serializers
from .models import User, Profile, Follow, UserGalleryImage


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ("bio", "preferences", "updated_at")


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ("id", "username", "email", "profile")


class FollowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Follow
        fields = ("id", "follower", "following", "status", "created_at")
        read_only_fields = ("status", "created_at")

class UserGalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGalleryImage
        fields = ("id", "user", "image_url", "created_at")
        read_only_fields = ("created_at",)