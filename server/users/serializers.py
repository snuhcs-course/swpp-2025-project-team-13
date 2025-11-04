from rest_framework import serializers
from .models import User, Profile, Follow, UserScrap, UserPreference, UserGalleryImage
from restaurant.serializers import RestaurantSerializer


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


class UserScrapSerializer(serializers.ModelSerializer):
    """유저 스크랩 직렬화"""
    restaurant = RestaurantSerializer(read_only=True)
    restaurant_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = UserScrap
        fields = ("id", "user", "restaurant", "restaurant_id", "created_at")
        read_only_fields = ("id", "user", "created_at")
    
    def create(self, validated_data):
        # user는 view에서 자동으로 설정됨
        return super().create(validated_data)


class UserPreferenceSerializer(serializers.ModelSerializer):
    """유저 취향 설정 직렬화"""
    
    class Meta:
        model = UserPreference
        fields = (
            "id", 
            "spicy_level", 
            "sweet_level", 
            "salty_level", 
            "exploration_preference",
            "allergies", 
            "disliked_ingredients", 
            "favorite_cuisines", 
            "created_at"
        )
        read_only_fields = ("id", "created_at")
    
    def validate_spicy_level(self, value):
        if value < 0 or value > 10:
            raise serializers.ValidationError("Spicy level must be between 0 and 10")
        return value
    
    def validate_sweet_level(self, value):
        if value < 0 or value > 10:
            raise serializers.ValidationError("Sweet level must be between 0 and 10")
        return value
    
    def validate_salty_level(self, value):
        if value < 0 or value > 10:
            raise serializers.ValidationError("Salty level must be between 0 and 10")
        return value
    
    def validate_exploration_preference(self, value):
        if value < 0 or value > 5:
            raise serializers.ValidationError("Exploration preference must be between 0 and 5")
        return value


class UserGalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGalleryImage
        fields = ("id", "user", "image_url", "created_at", "local_uri")
        read_only_fields = ("created_at",)