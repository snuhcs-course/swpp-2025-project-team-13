# 스크랩 API 사용 가이드

## 개요
음식점 스크랩 기능 API입니다. 사용자가 음식점을 저장하고 관리할 수 있습니다.

## 엔드포인트

Base URL: `http://127.0.0.1:8000/api/`

### 1. 스크랩 목록 조회
**GET** `/api/scraps/`

내가 스크랩한 음식점 목록을 조회합니다.

**Response:**
```json
[
  {
    "id": 1,
    "user": 1,
    "restaurant": {
      "id": 1,
      "name": "맛있는 중식당",
      "address": "서울특별시 관악구 봉천동 123-45",
      "latitude": "37.482100",
      "longitude": "126.951400",
      "phone": "02-1234-5678",
      "image_url": "https://example.com/image.jpg",
      "rating": "4.50",
      "source": "test",
      "created_at": "2025-10-18T12:00:00Z"
    },
    "created_at": "2025-10-18T15:30:00Z"
  }
]
```

### 2. 스크랩 추가
**POST** `/api/scraps/`

새로운 음식점을 스크랩합니다.

**Request Body:**
```json
{
  "restaurant_id": 1
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "user": 1,
  "restaurant": {
    "id": 1,
    "name": "맛있는 중식당",
    ...
  },
  "created_at": "2025-10-18T15:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - restaurant_id가 없거나 이미 스크랩한 경우
- `404 Not Found` - 존재하지 않는 음식점

### 3. 스크랩 삭제
**DELETE** `/api/scraps/{scrap_id}/`

스크랩을 삭제합니다.

**Response (204 No Content)**

### 4. 스크랩 토글 (추천)
**POST** `/api/scraps/toggle/`

스크랩 상태를 토글합니다. 이미 스크랩했으면 삭제, 안 했으면 추가합니다.

**Request Body:**
```json
{
  "restaurant_id": 1
}
```

**Response (스크랩 추가):**
```json
{
  "scrapped": true,
  "data": {
    "id": 1,
    "user": 1,
    "restaurant": {...},
    "created_at": "2025-10-18T15:30:00Z"
  }
}
```

**Response (스크랩 삭제):**
```json
{
  "scrapped": false,
  "message": "Scrap removed"
}
```

## 인증
모든 API는 인증이 필요합니다. Session Authentication을 사용합니다.

## 테스트 방법

### 1. 서버 실행
```bash
cd server
python manage.py runserver
```

### 2. 테스트 유저로 로그인
```bash
# Django Shell에서
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
User = get_user_model()

# 테스트 유저 생성
user = User.objects.create_user(
    username='testuser',
    email='test@example.com',
    password='testpass123'
)
```

### 3. API 테스트 (curl 예제)

#### 로그인
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}' \
  -c cookies.txt
```

#### 스크랩 목록 조회
```bash
curl http://127.0.0.1:8000/api/scraps/ \
  -b cookies.txt
```

#### 스크랩 추가
```bash
curl -X POST http://127.0.0.1:8000/api/scraps/ \
  -H "Content-Type: application/json" \
  -d '{"restaurant_id": 1}' \
  -b cookies.txt
```

#### 스크랩 토글
```bash
curl -X POST http://127.0.0.1:8000/api/scraps/toggle/ \
  -H "Content-Type: application/json" \
  -d '{"restaurant_id": 1}' \
  -b cookies.txt
```

#### 스크랩 삭제
```bash
curl -X DELETE http://127.0.0.1:8000/api/scraps/1/ \
  -b cookies.txt
```

## Django Admin에서 확인
1. Superuser 생성: `python manage.py createsuperuser`
2. http://127.0.0.1:8000/admin/ 접속
3. User scraps 메뉴에서 확인

## 프론트엔드 연동 예시

```javascript
// 스크랩 토글 (가장 많이 사용할 API)
const toggleScrap = async (restaurantId) => {
  const response = await fetch('http://127.0.0.1:8000/api/scraps/toggle/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // 세션 쿠키 포함
    body: JSON.stringify({ restaurant_id: restaurantId })
  });
  
  const data = await response.json();
  return data.scrapped; // true: 스크랩됨, false: 스크랩 해제됨
};

// 내 스크랩 목록 가져오기
const getMyScraps = async () => {
  const response = await fetch('http://127.0.0.1:8000/api/scraps/', {
    credentials: 'include'
  });
  
  return await response.json();
};
```

## DB 스키마
```
UserScrap
- id (PK)
- user_id (FK → User)
- restaurant_id (FK → Restaurant)
- created_at

Unique Constraint: (user_id, restaurant_id)
```

