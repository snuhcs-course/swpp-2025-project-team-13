from rest_framework import serializers
from .models import Restaurant, RestaurantMenu


class RestaurantSerializer(serializers.ModelSerializer):
    """음식점 정보 직렬화"""
    
    class Meta:
        model = Restaurant
        fields = (
            "id",
            "name",
            "address",
            "latitude",
            "longitude",
            "phone",
            "image_url",
            "source",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class MenuCandidateSerializer(serializers.Serializer):
    """메뉴 정보 직렬화"""
    name = serializers.CharField()
    price = serializers.CharField(required=False, allow_blank=True)
    image_url = serializers.URLField(required=False, allow_blank=True)


class RestaurantDetailSerializer(serializers.ModelSerializer):
    """음식점 상세 정보 직렬화 (메뉴 포함)"""
    menus = serializers.SerializerMethodField()
    
    class Meta:
        model = Restaurant
        fields = (
            "id",
            "name",
            "address",
            "latitude",
            "longitude",
            "phone",
            "image_url",
            "source",
            "created_at",
            "menus",
        )
        read_only_fields = ("id", "created_at")
    
    def get_menus(self, obj):
        """음식점의 메뉴 목록 가져오기"""
        try:
            from menu.models import MenuCandidate
            menu_candidates = MenuCandidate.objects.filter(restaurant=obj)
            return MenuCandidateSerializer(menu_candidates, many=True).data
        except Exception:
            return []


class RestaurantMenuSerializer(serializers.ModelSerializer):
    """음식점-메뉴 매핑 직렬화"""
    
    class Meta:
        model = RestaurantMenu
        fields = ("id", "restaurant", "menu")

