from rest_framework import serializers
from .models import User, Profile, Follow


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
