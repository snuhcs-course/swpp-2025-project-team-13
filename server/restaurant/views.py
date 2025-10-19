from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Restaurant
from .serializers import RestaurantSerializer, RestaurantDetailSerializer


class RestaurantViewSet(viewsets.ReadOnlyModelViewSet):
    """음식점 조회 API"""
    permission_classes = [IsAuthenticated]
    queryset = Restaurant.objects.all()
    
    def get_serializer_class(self):
        """상세 조회 시에는 메뉴 포함"""
        if self.action == 'retrieve':
            return RestaurantDetailSerializer
        return RestaurantSerializer

