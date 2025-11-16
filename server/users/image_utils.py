from urllib.parse import unquote, urlparse
from config.settings import AWS_STORAGE_BUCKET_NAME, S3_CLIENT
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from io import BytesIO
import numpy as np

# =====================
# Setup
# =====================
device = "cuda" if torch.cuda.is_available() else "cpu"
model_name = "openai/clip-vit-base-patch32"
model = CLIPModel.from_pretrained(model_name).to(device)
processor = CLIPProcessor.from_pretrained(model_name)

DEFAULT_FOOD_CATEGORIES: list[str] = [
    "한식 Korean food",
    "일식 Japanese food",
    "중식 Chinese food",
    "이탈리안 Italian food",
    "멕시칸 Mexican food",
    "인도 Indian food",
    "아메리칸 American food",
    "태국 Thai food",
    "지중해 Mediterranean food",
    "프렌치 French food",
    "베트남 Vietnamese food",
    "스페인 Spanish food",
]

def _extract_s3_key(url: str) -> str:
    parsed = urlparse(url)
    return parsed.path.lstrip('/')

def _read_image_from_s3(url: str) -> bytes:
    s3_key = unquote(_extract_s3_key(url))

    response = S3_CLIENT.get_object(
        Bucket=AWS_STORAGE_BUCKET_NAME,
        Key=s3_key
    )

    # 바이트로 읽기
    image_bytes = response['Body'].read()
    return image_bytes

def _get_food_categories() -> list[str]:
    return DEFAULT_FOOD_CATEGORIES


def _predict_category_from_bytes(image_bytes: bytes, categories: list[str]) -> tuple[str, float]:
    """
    Args:
        image_bytes: 이미지 바이트
    Returns:
        (predicted_category, confidence)
    """
    image = Image.open(BytesIO(image_bytes)).convert("RGB")

    texts = [f"a photo of {c}" for c in categories]

    inputs = processor(
        text=texts,
        images=[image],
        return_tensors="pt",
        padding=True
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)

    best_idx = probs[0].argmax().item()
    return categories[best_idx], probs[0][best_idx].item()

def get_food_image_category(url: str) -> tuple[str, float]:
    image_bytes = _read_image_from_s3(url)
    food_categories = _get_food_categories()
    return _predict_category_from_bytes(image_bytes, food_categories)

def get_clip_embedding_from_bytes(image_bytes: bytes) -> list[float]:
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    inputs = processor(images=[image], return_tensors="pt").to(device)
    with torch.no_grad():
        feats = model.get_image_features(**inputs)  # [1, D]
    vec = feats[0].cpu().numpy().astype(np.float32)
    vec = vec / (np.linalg.norm(vec) + 1e-12)      # cosine용 정규화
    return vec.tolist()

def normalize_to_onboarding_category(label: str) -> tuple[str, str]:
    """주어진 한글 카테고리/키워드를 온보딩 카테고리(id, label)로 매핑.
    매칭 실패 시 ('other', '기타') 반환.
    """
    if not label:
        return ("other", "기타")
    t = str(label).lower()
    rules = [
        (['한식','korean'], ('korean','한식')),
        (['일식','japanese','초밥','스시','라멘'], ('japanese','일식')),
        (['중식','chinese','짜장','짬뽕','마라'], ('chinese','중식')),
        (['이탈','파스타','피자','italian'], ('italian','이탈리안')),
        (['멕시','taco','burrito','mexican'], ('mexican','멕시칸')),
        (['인도','커리','난','indian'], ('indian','인도')),
        (['아메리칸','미국','버거','치킨','american'], ('american','아메리칸')),
        (['태국','thai','팟타이'], ('thai','태국')),
        (['지중해','그리스','mediterranean'], ('mediterranean','지중해')),
        (['프렌치','프랑스','french'], ('french','프렌치')),
        (['베트남','쌀국수','banh','vietnam'], ('vietnamese','베트남')),
        (['스페인','타파스','paella','spanish'], ('spanish','스페인')),
    ]
    for keywords, result in rules:
        if any(k in t for k in keywords):
            return result
    # 베이커리/디저트/카페 등은 임시로 아메리칸으로 묶음
    if any(k in t for k in ['베이커리','디저트','카페','bakery','dessert','cafe']):
        return ('american','아메리칸')
    return ("other", "기타")