from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MeViewSet, UserViewSet, FollowViewSet, SuggestionViewSet, ScrapViewSet, OnboardingViewSet, PhotoViewSet, InteractionViewSet, RLWeightViewSet
from . import auth_views

router = DefaultRouter()
router.register("me", MeViewSet, basename="me")
router.register("users", UserViewSet, basename="users")
router.register("follows", FollowViewSet, basename="follows")
router.register("suggestions", SuggestionViewSet, basename="suggestions")
router.register("scraps", ScrapViewSet, basename="scraps")
router.register("onboarding", OnboardingViewSet, basename="onboarding")
router.register("photos", PhotoViewSet, basename="photos")
router.register("interactions", InteractionViewSet, basename="interactions")
router.register("rl-weights", RLWeightViewSet, basename="rl-weights")

urlpatterns = [path("", include(router.urls))]

urlpatterns += [
	path("auth/csrf/", auth_views.csrf, name="csrf"),
	path("auth/login/", auth_views.login_view, name="login"),
	path("auth/logout/", auth_views.logout_view, name="logout"),
	path("auth/register/", auth_views.register_view, name="register"),
]
