import sqlite3
from urllib.parse import unquote, urlparse
from config.settings import AWS_STORAGE_BUCKET_NAME, S3_CLIENT
import torch
from PIL import Image
from io import BytesIO
import os

# =====================
# Setup (Lazy Loading)
# =====================
device = "cuda" if torch.cuda.is_available() else "cpu"
model_name = "openai/clip-vit-base-patch32"

# 모델과 프로세서는 lazy loading으로 처리
_model = None
_processor = None

def _get_model():
    global _model
    if _model is None:
        # 테스트 환경에서는 모델 로딩 건너뛰기
        if os.environ.get('DJANGO_TESTING', '') == 'true':
            return None
        try:
            from transformers import CLIPModel
            _model = CLIPModel.from_pretrained(model_name).to(device)
        except Exception as e:
            print(f"CLIP 모델 로드 실패: {e}")
            return None
    return _model

def _get_processor():
    global _processor
    if _processor is None:
        # 테스트 환경에서는 프로세서 로딩 건너뛰기
        if os.environ.get('DJANGO_TESTING', '') == 'true':
            return None
        try:
            from transformers import CLIPProcessor
            _processor = CLIPProcessor.from_pretrained(model_name, use_fast=True)
        except Exception as e:
            print(f"CLIP 프로세서 로드 실패: {e}")
            return None
    return _processor


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
    with sqlite3.connect("chroma_db/chroma.sqlite3") as conn:
        cursor = conn.cursor()

        cursor.execute("""
        SELECT string_value AS category
        FROM embedding_metadata
        WHERE key = 'category';
        """)

        categories = [category[0].strip() for category in cursor.fetchall()]
        categories = list(dict.fromkeys(categories))
        return categories


def _predict_category_from_bytes(image_bytes: bytes, categories: list[str]) -> tuple[str, float]:
    """
    Args:
        image_bytes: 이미지 바이트
    Returns:
        (predicted_category, confidence)
    """
    model = _get_model()
    processor = _get_processor()
    
    # 모델이 로드되지 않은 경우 기본값 반환
    if model is None or processor is None:
        return ("unknown", 0.0)
    
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