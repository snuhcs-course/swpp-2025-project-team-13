from django.views.decorators.csrf import ensure_csrf_cookie, get_token, csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status
from .serializers import UserSerializer
from . import services


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
@csrf_exempt
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


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_exempt
def register_view(request):
    """회원가입 API"""
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")
    
    # 필수 필드 검증
    if not all([username, email, password]):
        return JsonResponse(
            {"detail": "Username, email, and password are required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 비밀번호 길이 검증
    if len(password) < 8:
        return JsonResponse(
            {"detail": "Password must be at least 8 characters long"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # 사용자 생성
        user = services.create_user_with_profile(
            username=username,
            email=email,
            password=password,
            bio="",
            preferences={}
        )
        
        # 자동 로그인
        login(request, user)
        
        return JsonResponse(
            UserSerializer(user).data, 
            status=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        # 중복 사용자명이나 이메일 등의 에러 처리
        error_message = str(e)
        if "username" in error_message.lower():
            return JsonResponse(
                {"detail": "Username already exists"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        elif "email" in error_message.lower():
            return JsonResponse(
                {"detail": "Email already exists"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            return JsonResponse(
                {"detail": "Registration failed"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
