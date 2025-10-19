from django.views.decorators.csrf import ensure_csrf_cookie, get_token
from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from .serializers import UserSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf(request):
    # This view exists so the client can fetch a CSRF cookie before login
    # Return the token in JSON so clients (mobile) can read and set the header
    token = get_token(request)
    return JsonResponse({"detail": "CSRF cookie set", "csrfToken": token})


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get("username")
    password = request.data.get("password")
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"detail": "Invalid credentials"}, status=400)
    login(request, user)
    # Session cookie will be set in response
    return JsonResponse(UserSerializer(user).data)


@api_view(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"detail": "Logged out"}, status=204)
