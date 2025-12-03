"""
추천 시스템 URL 설정
"""

from django.urls import path
from . import api

urlpatterns = [
    path('recommend/menu/', api.recommend_menu, name='recommend_menu'),
    path('recommend/menu/phase1/', api.recommend_menu_phase1, name='recommend_menu_phase1'),
    path('recommend/menu/phase2/', api.recommend_menu_phase2, name='recommend_menu_phase2'),
    path('recommend/place/', api.recommend_place, name='recommend_place'),
    path('health/', api.health_check, name='health_check'),
]
