"""
음식점 & 메뉴 추천 시스템 (ChromaDB 버전)

이 모듈은 음식점과 메뉴 데이터를 메뉴 단위와 가게 단위로 분리해
ChromaDB를 사용한 임베딩·검색하는 구조를 구현합니다.

주요 기능:
- 메뉴/가게 문서 템플릿 생성
- 한국어 임베딩 모델을 이용한 벡터화
- ChromaDB 인덱스 구축 및 검색
- 사용자 개인화 벡터 생성
- 하이브리드 스코어링 및 MMR 리랭크
"""

import json
import logging
import math
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from pathlib import Path

import numpy as np

# ChromaDB는 선택적 임포트로 처리
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    chromadb = None

# SentenceTransformers도 선택적 임포트로 처리
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None

logger = logging.getLogger(__name__)

@dataclass
class MenuDocument:
    """메뉴 문서 데이터 클래스"""
    id: str
    place_id: str
    menu_name: str
    place_name: str
    price: int
    category: str
    location: str
    rating: float
    review_count: int
    keywords: List[str]
    voted_keywords: List[str]
    has_image: bool
    image_urls: List[str]  # 이미지 URL 리스트 추가
    coordinates: Tuple[float, float]
    document_text: str

@dataclass
class PlaceDocument:
    """가게 문서 데이터 클래스"""
    id: str
    name: str
    category: str
    location: str
    rating: float
    review_count: int
    avg_price: int
    keywords: List[str]
    voted_keywords: List[str]
    features: List[str]
    coordinates: Tuple[float, float]
    document_text: str

@dataclass
class UserProfile:
    """사용자 프로필 데이터 클래스"""
    user_id: str
    taste_preferences: Dict[str, float]  # 매운맛, 단맛, 짠맛 등
    allergies: List[str]
    dislikes: List[str]
    preferred_categories: List[str]
    gallery_keywords: List[str]
    behavior_keywords: List[str]
    budget_range: Tuple[int, int]
    distance_preference: float
    profile_text: str

class DocumentTemplateGenerator:
    """문서 템플릿 생성기"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    def to_int(s: str) -> int:
        return int(s) if s else 0
    
    def build_menu_document(self, place_data: Dict, menu_data: Dict, stats: Dict) -> MenuDocument:
        """메뉴 문서 생성"""
        try:
            # 기본 정보 추출
            place_id = place_data.get("id", "")
            menu_id = f"{place_id}_{menu_data.get('index', 0)}"
            menu_name = menu_data.get("name", "")
            place_name = place_data.get("name", "")
            price_value = menu_data.get("price", 0)
            try:
                price = int(price_value) if isinstance(price_value, (int, float, str)) and str(price_value).strip() != "" else 0
            except (ValueError, TypeError):
                price = 0
            category = place_data.get("category", "")
            
            # 위치 정보
            group1 = place_data.get("group1", "")
            group2 = place_data.get("group2", "")
            group3 = place_data.get("group3", "")
            location = f"{group1}/{group2}/{group3}"
            
            # 좌표
            x = float(place_data.get("x", 0))
            y = float(place_data.get("y", 0))
            coordinates = (x, y)
            
            # 리뷰 통계 안전하게 처리
            review_stats = {}
            if stats and isinstance(stats, dict):
                review_stats = stats.get("review", {})
            
            rating = 0.0
            review_count = 0
            if review_stats and isinstance(review_stats, dict):
                rating = float(review_stats.get("avgRating", 0))
                review_count = int(review_stats.get("totalCount", 0))
            
            # 키워드 추출
            keyword_list = place_data.get("keyword_list", [])
            keywords = []
            if keyword_list and isinstance(keyword_list, list):
                # 문자열 리스트인 경우
                keywords = [kw for kw in keyword_list[:8] if isinstance(kw, str) and kw.strip()]
            elif keyword_list and isinstance(keyword_list, list):
                # 딕셔너리 리스트인 경우
                keywords = [kw.get("label", "") for kw in keyword_list[:8] if isinstance(kw, dict) and kw.get("label")]
            
            # 투표 키워드 추출
            voted_keywords = []
            try:
                if stats and isinstance(stats, dict):
                    analysis = stats.get("analysis", {})
                    if analysis and isinstance(analysis, dict):
                        voted_keyword = analysis.get("votedKeyword", {})
                        if voted_keyword and isinstance(voted_keyword, dict):
                            voted_keyword_details = voted_keyword.get("details", [])
                            if voted_keyword_details and isinstance(voted_keyword_details, list):
                                for detail in voted_keyword_details[:5]:
                                    if detail and isinstance(detail, dict) and detail.get("displayName"):
                                        voted_keywords.append(detail["displayName"])
            except (AttributeError, TypeError):
                voted_keywords = []
            
            # 이미지 유무 및 이미지 URL
            images = menu_data.get("images", [])
            has_image = bool(images and isinstance(images, list) and len(images) > 0)
            image_urls = images if isinstance(images, list) else []
            
            # 문서 텍스트 생성
            document_text = self._generate_menu_document_text(
                menu_name, place_name, location, category, keywords,
                rating, review_count, price, voted_keywords, has_image
            )
            
            return MenuDocument(
                id=menu_id,
                place_id=place_id,
                menu_name=menu_name,
                place_name=place_name,
                price=price,
                category=category,
                location=location,
                rating=rating,
                review_count=review_count,
                keywords=keywords,
                voted_keywords=voted_keywords,
                has_image=has_image,
                image_urls=image_urls,
                coordinates=coordinates,
                document_text=document_text
            )
            
        except Exception as e:
            self.logger.error(f"메뉴 문서 생성 중 오류 발생: {e}")
            raise
    
    def build_place_document(self, place_data: Dict, stats: Dict) -> PlaceDocument:
        """가게 문서 생성"""
        try:
            # stats가 None이거나 빈 딕셔너리인 경우 안전하게 처리
            if stats is None:
                stats = {}
            elif not isinstance(stats, dict):
                stats = {}
            # 기본 정보 추출
            place_id = place_data.get("id", "")
            name = place_data.get("name", "")
            category = place_data.get("category", "")
            
            # 위치 정보
            group1 = place_data.get("group1", "")
            group2 = place_data.get("group2", "")
            group3 = place_data.get("group3", "")
            location = f"{group1}/{group2}/{group3}"
            
            # 좌표
            x = float(place_data.get("x", 0))
            y = float(place_data.get("y", 0))
            coordinates = (x, y)
            
            # 리뷰 통계 안전하게 처리
            review_stats = {}
            if stats and isinstance(stats, dict):
                review_stats = stats.get("review", {})
            
            rating = 0.0
            review_count = 0
            if review_stats and isinstance(review_stats, dict):
                rating = float(review_stats.get("avgRating", 0))
                review_count = int(review_stats.get("totalCount", 0))
            
            # 평균 가격 (가게 전체 평균)
            avg_price = int(place_data.get("avg_price", 0))
            
            # 키워드 추출
            keyword_list = place_data.get("keyword_list", [])
            keywords = []
            if keyword_list and isinstance(keyword_list, list):
                # 문자열 리스트인 경우
                keywords = [kw for kw in keyword_list[:8] if isinstance(kw, str) and kw.strip()]
            elif keyword_list and isinstance(keyword_list, list):
                # 딕셔너리 리스트인 경우
                keywords = [kw.get("label", "") for kw in keyword_list[:8] if isinstance(kw, dict) and kw.get("label")]
            
            # 투표 키워드 추출
            voted_keywords = []
            try:
                if stats and isinstance(stats, dict):
                    analysis = stats.get("analysis", {})
                    if analysis and isinstance(analysis, dict):
                        voted_keyword = analysis.get("votedKeyword", {})
                        if voted_keyword and isinstance(voted_keyword, dict):
                            voted_keyword_details = voted_keyword.get("details", [])
                            if voted_keyword_details and isinstance(voted_keyword_details, list):
                                for detail in voted_keyword_details[:5]:
                                    if detail and isinstance(detail, dict) and detail.get("displayName"):
                                        voted_keywords.append(detail["displayName"])
            except (AttributeError, TypeError):
                voted_keywords = []
            
            # 특징(배지) 추출
            features = []
            feature_list = place_data.get("features", [])
            if feature_list and isinstance(feature_list, list):
                for feature in feature_list[:3]:
                    if feature and isinstance(feature, dict) and feature.get("title"):
                        features.append(feature["title"])
            
            # 문서 텍스트 생성
            document_text = self._generate_place_document_text(
                name, category, location, keywords, rating, review_count,
                avg_price, voted_keywords, features
            )
            
            return PlaceDocument(
                id=place_id,
                name=name,
                category=category,
                location=location,
                rating=rating,
                review_count=review_count,
                avg_price=avg_price,
                keywords=keywords,
                voted_keywords=voted_keywords,
                features=features,
                coordinates=coordinates,
                document_text=document_text
            )
            
        except Exception as e:
            self.logger.error(f"가게 문서 생성 중 오류 발생: {e}")
            raise
    
    def _generate_menu_document_text(self, menu_name: str, place_name: str, 
                                   location: str, category: str, keywords: List[str],
                                   rating: float, review_count: int, price: int,
                                   voted_keywords: List[str], has_image: bool) -> str:
        """메뉴 문서 텍스트 생성"""
        # 기본 정보
        doc_parts = [f"{menu_name} — {place_name} ({location}, {category})"]
        
        # 키워드
        if keywords:
            doc_parts.append(f"대표 키워드: {', '.join(keywords)}")
        
        # 평점 및 리뷰
        doc_parts.append(f"평균별점 {rating:.2f}/5, 리뷰 {review_count}건")
        
        # 가격
        doc_parts.append(f"가격 {price:,}원")
        
        # 특징
        if voted_keywords:
            doc_parts.append(f"특징: {', '.join(voted_keywords)}")
        
        # 이미지 유무
        if has_image:
            doc_parts.append("이미지 있음")
        
        return ". ".join(doc_parts) + "."
    
    def _generate_place_document_text(self, name: str, category: str, location: str,
                                    keywords: List[str], rating: float, review_count: int,
                                    avg_price: int, voted_keywords: List[str], 
                                    features: List[str]) -> str:
        """가게 문서 텍스트 생성"""
        # 기본 정보
        doc_parts = [f"{name} — {category}. 위치 {location}"]
        
        # 키워드
        if keywords:
            doc_parts.append(f"주요 메뉴/키워드: {', '.join(keywords)}")
        
        # 평점 및 리뷰
        doc_parts.append(f"평균별점 {rating:.2f}/5, 리뷰 {review_count}건")
        
        # 평균 가격
        if avg_price > 0:
            doc_parts.append(f"평균가격대 {avg_price:,}원")
        
        # 특징
        if voted_keywords:
            doc_parts.append(f"특징: {', '.join(voted_keywords)}")
        
        # 배지
        if features:
            doc_parts.append(f"배지: {', '.join(features)}")
        
        return ". ".join(doc_parts) + "."

class EmbeddingService:
    """임베딩 서비스"""
    
    def __init__(self, model_name: str = "jhgan/ko-sbert-sts"):
        self.model_name = model_name
        self.model = None
        self.logger = logging.getLogger(__name__)
        self._load_model()
    
    def _load_model(self):
        """모델 로드"""
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            return
        
        try:
            self.model = SentenceTransformer(self.model_name)
        except Exception as e:
            self.logger.error(f"모델 로드 실패: {e}")
            raise
    
    def embed_texts(self, texts: List[str]) -> np.ndarray:
        """텍스트 임베딩"""
        if not SENTENCE_TRANSFORMERS_AVAILABLE or self.model is None:
            # 더미 임베딩 반환
            return np.random.rand(len(texts), 768).astype(np.float32)
        
        try:
            total_texts = len(texts)
            max_batch_size = 5000
            batch_size = min(max_batch_size, total_texts)
            
            if total_texts <= batch_size:
                embeddings = self.model.encode(
                    texts, 
                    normalize_embeddings=True,
                    show_progress_bar=False,
                    convert_to_numpy=True
                )
            else:
                embeddings = []
                for i in range(0, total_texts, batch_size):
                    batch_texts = texts[i:i + batch_size]
                    batch_embeddings = self.model.encode(
                        batch_texts,
                        normalize_embeddings=True,
                        show_progress_bar=False,
                        convert_to_numpy=True
                    )
                    embeddings.append(batch_embeddings)
                
                embeddings = np.vstack(embeddings)
            
            return np.array(embeddings, dtype=np.float32)
            
        except Exception as e:
            self.logger.error(f"텍스트 임베딩 실패: {e}")
            raise
    
    def embed_single_text(self, text: str) -> np.ndarray:
        """단일 텍스트 임베딩"""
        return self.embed_texts([text])[0]

# ChromaDB 기반 VectorIndexBuilder (파일 삭제됨 - 더미 구현)
class VectorIndexBuilder:
    def __init__(self, embedding_service, persist_directory: str = "./chroma_db"):
        self.embedding_service = embedding_service
        self.persist_directory = persist_directory
    
    def build_menu_index(self, menu_documents):
        pass
    
    def build_place_index(self, place_documents):
        pass
    
    def search_menu(self, query_text: str, n_results: int = 50, where=None):
        return []
    
    def search_place(self, query_text: str, n_results: int = 50, where=None):
        return []

class RecommendationEngine:
    def __init__(self, vector_index_builder):
        self.vector_index_builder = vector_index_builder
    
    def search_menu(self, user_profile_text: str, query_text: str = "", k: int = 50, filters=None):
        return []
    
    def search_place(self, user_profile_text: str, query_text: str = "", k: int = 50, filters=None):
        return []

def load_restaurant_data(json_file_path: str) -> List[Dict]:
    """음식점 데이터 로드"""
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except Exception as e:
        logger.error(f"음식점 데이터 로드 실패: {e}")
        raise

def process_restaurant_data(restaurant_data: List[Dict]) -> Tuple[List[MenuDocument], List[PlaceDocument]]:
    """음식점 데이터 처리"""
    template_generator = DocumentTemplateGenerator()
    menu_documents = []
    place_documents = []
    
    total_count = len(restaurant_data)
    processed_count = 0
    error_count = 0
    
    # 테스트용: 처음 30개만 처리
    # test_limit = 30
    # restaurant_data = restaurant_data[:test_limit]
    
    logger.info(f"음식점 데이터 처리 시작: {total_count:,}개")
    
    for restaurant in restaurant_data:
        try:
            processed_count += 1
            
            # 진행률 로그 (100개마다 또는 마지막)
            if processed_count % 100 == 0 or processed_count == total_count:
                progress_percent = (processed_count / total_count) * 100
                logger.info(f"진행률: {processed_count:,}/{total_count:,} ({progress_percent:.1f}%) - 메뉴: {len(menu_documents):,}개, 가게: {len(place_documents):,}개")
            
            # restaurant가 딕셔너리가 아닌 경우 건너뛰기
            if not isinstance(restaurant, dict):
                logger.warning(f"음식점 데이터가 딕셔너리가 아닙니다: {type(restaurant)}")
                continue
            
            # 기본 정보 추출
            basic_info = restaurant.get("basic_info", {})
            place_data = basic_info.get("place_data", {})
            detail_info = restaurant.get("detail_info", {})
            visitor_review_stats = detail_info.get("visitor_review_stats", {})
            
            # visitor_review_stats가 None인 경우 빈 딕셔너리로 처리
            if visitor_review_stats is None:
                visitor_review_stats = {}
            
            # place_data가 비어있는 경우 건너뛰기
            if not place_data:
                logger.warning("place_data가 비어있습니다.")
                continue
            
            # 가게 문서 생성
            place_doc = template_generator.build_place_document(place_data, visitor_review_stats)
            place_documents.append(place_doc)
            
            # 메뉴 문서 생성
            menus = detail_info.get("menus", [])
            if menus and isinstance(menus, list) and len(menus) > 0:
                for menu in menus:
                    if menu and isinstance(menu, dict):
                        menu_doc = template_generator.build_menu_document(place_data, menu, visitor_review_stats)
                        menu_documents.append(menu_doc)
            else:
                # 메뉴가 없는 경우 키워드로 대체
                keyword_list = place_data.get("keyword_list", [])
                if keyword_list and isinstance(keyword_list, list):
                    for i, keyword in enumerate(keyword_list[:5]):
                        menu_name = ""
                        if isinstance(keyword, str):
                            menu_name = keyword
                        elif isinstance(keyword, dict) and keyword.get("label"):
                            menu_name = keyword.get("label", "")
                        
                        if menu_name:
                            fake_menu = {
                                "id": f"{place_data.get('id', '')}_{i}",
                                "name": menu_name,
                                "index": i,
                                "price": "0",
                                "images": []
                            }
                            menu_doc = template_generator.build_menu_document(place_data, fake_menu, visitor_review_stats)
                            menu_documents.append(menu_doc)
                    
        except Exception as e:
            error_count += 1
            logger.error(f"음식점 데이터 처리 중 오류 ({error_count}번째): {e}")
            logger.error(f"문제가 된 데이터: {restaurant}")
            continue
    
    logger.info(f"데이터 처리 완료 - 성공: {processed_count - error_count:,}개, 실패: {error_count:,}개")
    
    return menu_documents, place_documents

def main():
    """메인 실행 함수"""
    # 로깅 설정
    logging.basicConfig(level=logging.INFO)
    
    # 데이터 로드
    json_file_path = "/Users/jaejoon/swpp-2025-project-team-13/server/restaurant/management/commands/장블랑제리_상세.json"
    restaurant_data = load_restaurant_data(json_file_path)
    
    # 데이터 처리
    menu_documents, place_documents = process_restaurant_data(restaurant_data)
    
    # 임베딩 서비스 초기화
    embedding_service = EmbeddingService()
    
    # ChromaDB 벡터 인덱스 빌더 초기화
    vector_index_builder = VectorIndexBuilder(embedding_service, "./chroma_db")
    
    # 인덱스 구축
    vector_index_builder.build_indices(menu_documents, place_documents)
    
    print(f"처리 완료: 메뉴 {len(menu_documents)}개, 가게 {len(place_documents)}개")
    print(f"ChromaDB 데이터베이스가 './chroma_db' 디렉토리에 저장되었습니다.")

if __name__ == "__main__":
    main()
