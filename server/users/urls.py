from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MeViewSet, UserViewSet, FollowViewSet, SuggestionViewSet

router = DefaultRouter()
router.register("me", MeViewSet, basename="me")
router.register("users", UserViewSet, basename="users")
router.register("follows", FollowViewSet, basename="follows")
router.register("suggestions", SuggestionViewSet, basename="suggestions")

urlpatterns = [path("", include(router.urls))]
