"""
ChromaDB 벡터 인덱스 빌더

이 모듈은 ChromaDB를 사용하여 벡터 인덱스를 구축하고 관리합니다.
"""

import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import os
import math
from collections import Counter

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

class ChromaVectorIndexBuilder:
    """ChromaDB 벡터 인덱스 빌더"""
    
    def __init__(self, embedding_service, persist_directory: str = "./chroma_db"):
        self.embedding_service = embedding_service
        self.persist_directory = persist_directory
        self.logger = logging.getLogger(__name__)
        
        # ChromaDB 클라이언트 초기화
        self.client = None
        self.menu_collection = None
        self.place_collection = None
        self._initialize_chroma()
    
    def _initialize_chroma(self):
        """ChromaDB 초기화"""
        if not CHROMADB_AVAILABLE:
            self.logger.warning("ChromaDB가 설치되지 않았습니다. 더미 인덱스를 사용합니다.")
            return
        
        try:
            # ChromaDB 클라이언트 생성
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # 컬렉션 생성 또는 가져오기
            self.menu_collection = self.client.get_or_create_collection(
                name="menu_collection",
                metadata={"description": "메뉴 추천을 위한 벡터 컬렉션"}
            )
            
            self.place_collection = self.client.get_or_create_collection(
                name="place_collection", 
                metadata={"description": "가게 추천을 위한 벡터 컬렉션"}
            )
            
            self.logger.info("ChromaDB 초기화 완료")
            
        except Exception as e:
            self.logger.error(f"ChromaDB 초기화 실패: {e}")
            raise
    
    def build_menu_index(self, menu_documents: List[Any]):
        """메뉴 인덱스 구축"""
        if not menu_documents:
            return
        
        if not CHROMADB_AVAILABLE or not self.menu_collection:
            self.logger.warning("ChromaDB를 사용할 수 없습니다. 더미 인덱스를 사용합니다.")
            return
        
        try:
            total_docs = len(menu_documents)
            batch_size = 5000  # 배치 크기 설정
            total_batches = (total_docs + batch_size - 1) // batch_size
            
            self.logger.info(f"📝 메뉴 문서 임베딩 생성 중: {total_docs:,}개 (배치 크기: {batch_size:,}개)")
            
            for batch_idx in range(0, total_docs, batch_size):
                batch_docs = menu_documents[batch_idx:batch_idx + batch_size]
                batch_num = batch_idx // batch_size + 1
                
                self.logger.info(f"   배치 {batch_num}/{total_batches} 처리 중... ({len(batch_docs):,}개)")
                
                # 배치별 문서 텍스트 추출
                texts = [doc.document_text for doc in batch_docs]
                ids = [doc.id for doc in batch_docs]
                
                # 메타데이터 준비
                metadatas = []
                for doc in batch_docs:
                    metadata = {
                        "place_id": doc.place_id,
                        "menu_name": doc.menu_name,
                        "place_name": doc.place_name,
                        "price": doc.price,
                        "category": doc.category,
                        "location": doc.location,
                        "rating": doc.rating,
                        "review_count": doc.review_count,
                        "keywords": json.dumps(doc.keywords, ensure_ascii=False),
                        "voted_keywords": json.dumps(doc.voted_keywords, ensure_ascii=False),
                        "has_image": doc.has_image,
                        "image_urls": json.dumps(doc.image_urls, ensure_ascii=False),
                        "coordinates": json.dumps(doc.coordinates, ensure_ascii=False)
                    }
                    metadatas.append(metadata)
                
                # 임베딩 생성
                embeddings_file = f"menu_embeddings_batch_{batch_num}_{len(texts)}.npy"
                
                if os.path.exists(embeddings_file):
                    self.logger.info(f"📁 기존 임베딩 파일 로드: {embeddings_file}")
                    embeddings = np.load(embeddings_file)
                else:
                    self.logger.info(f"🔄 배치 {batch_num} 임베딩 생성 중...")
                    embeddings = self.embedding_service.embed_texts(texts)
                    self.logger.info(f"💾 임베딩 파일 저장: {embeddings_file}")
                    np.save(embeddings_file, embeddings)
                
                # ChromaDB에 추가
                self.logger.info(f"💾 ChromaDB 메뉴 컬렉션에 배치 {batch_num} 추가 중...")
                self.menu_collection.add(
                    embeddings=embeddings.tolist(),
                    documents=texts,
                    metadatas=metadatas,
                    ids=ids
                )
                
                # 진행률 표시
                progress_percent = ((batch_idx + batch_size) / total_docs) * 100
                processed_count = min(batch_idx + batch_size, total_docs)
                print(f"   배치 {batch_num} 완료 - 진행률: {progress_percent:.1f}% ({processed_count:,}/{total_docs:,}개)")
            
            self.logger.info(f"✅ 메뉴 인덱스 구축 완료: {total_docs:,}개 문서")
            
        except Exception as e:
            self.logger.error(f"메뉴 인덱스 구축 실패: {e}")
            raise
    
    def build_place_index(self, place_documents: List[Any]):
        """가게 인덱스 구축"""
        if not place_documents:
            return
        
        if not CHROMADB_AVAILABLE or not self.place_collection:
            self.logger.warning("ChromaDB를 사용할 수 없습니다. 더미 인덱스를 사용합니다.")
            return
        
        try:
            total_docs = len(place_documents)
            batch_size = 1000  # 배치 크기 설정
            total_batches = (total_docs + batch_size - 1) // batch_size
            
            self.logger.info(f"📝 가게 문서 임베딩 생성 중: {total_docs:,}개 (배치 크기: {batch_size:,}개)")
            
            for batch_idx in range(0, total_docs, batch_size):
                batch_docs = place_documents[batch_idx:batch_idx + batch_size]
                batch_num = batch_idx // batch_size + 1
                
                self.logger.info(f"   배치 {batch_num}/{total_batches} 처리 중... ({len(batch_docs):,}개)")
                
                # 배치별 문서 텍스트 추출
                texts = [doc.document_text for doc in batch_docs]
                ids = [doc.id for doc in batch_docs]
                
                # 메타데이터 준비
                metadatas = []
                for doc in batch_docs:
                    metadata = {
                        "name": doc.name,
                        "category": doc.category,
                        "location": doc.location,
                        "rating": doc.rating,
                        "review_count": doc.review_count,
                        "avg_price": doc.avg_price,
                        "keywords": json.dumps(doc.keywords, ensure_ascii=False),
                        "voted_keywords": json.dumps(doc.voted_keywords, ensure_ascii=False),
                        "features": json.dumps(doc.features, ensure_ascii=False),
                        "coordinates": json.dumps(doc.coordinates, ensure_ascii=False)
                    }
                    metadatas.append(metadata)
                
                # 임베딩 생성
                embeddings_file = f"place_embeddings_batch_{batch_num}_{len(texts)}.npy"
                
                if os.path.exists(embeddings_file):
                    self.logger.info(f"📁 기존 임베딩 파일 로드: {embeddings_file}")
                    embeddings = np.load(embeddings_file)
                else:
                    self.logger.info(f"🔄 배치 {batch_num} 임베딩 생성 중...")
                    embeddings = self.embedding_service.embed_texts(texts)
                    self.logger.info(f"💾 임베딩 파일 저장: {embeddings_file}")
                    np.save(embeddings_file, embeddings)
                
                # ChromaDB에 추가
                self.logger.info(f"💾 ChromaDB 가게 컬렉션에 배치 {batch_num} 추가 중...")
                self.place_collection.add(
                    embeddings=embeddings.tolist(),
                    documents=texts,
                    metadatas=metadatas,
                    ids=ids
                )
                
                # 진행률 표시
                progress_percent = ((batch_idx + batch_size) / total_docs) * 100
                processed_count = min(batch_idx + batch_size, total_docs)
                self.logger.info(f"   배치 {batch_num} 완료 - 진행률: {progress_percent:.1f}% ({processed_count:,}/{total_docs:,}개)")
            
            self.logger.info(f"✅ 가게 인덱스 구축 완료: {total_docs:,}개 문서")
            
        except Exception as e:
            self.logger.error(f"가게 인덱스 구축 실패: {e}")
            raise
    
    def build_indices(self, menu_documents: List[Any], place_documents: List[Any]):
        """인덱스 구축"""
        try:
            self.logger.info(f"🚀 전체 인덱스 구축 시작")
            self.logger.info(f"   - 메뉴 문서: {len(menu_documents):,}개")
            self.logger.info(f"   - 가게 문서: {len(place_documents):,}개")
            
            # 기존 컬렉션 삭제 (새로 구축할 경우)
            if CHROMADB_AVAILABLE and self.client:
                try:
                    self.logger.info("🗑️ 기존 컬렉션 삭제 중...")
                    self.client.delete_collection("menu_collection")
                    self.client.delete_collection("place_collection")
                    self.logger.info("✅ 기존 컬렉션 삭제 완료")
                except:
                    pass  # 컬렉션이 없어도 무시
            
            # 컬렉션 재생성
            self.logger.info("🔄 새로운 컬렉션 생성 중...")
            self._initialize_chroma()
            self.logger.info("✅ 새로운 컬렉션 생성 완료")
            
            # 메뉴 인덱스 구축
            if menu_documents:
                self.logger.info("📊 1단계: 메뉴 인덱스 구축 시작")
                self.build_menu_index(menu_documents)
                self.logger.info("✅ 1단계: 메뉴 인덱스 구축 완료")
            else:
                self.logger.warning("⚠️ 메뉴 문서가 없어 메뉴 인덱스를 건너뜁니다.")
            
            # 가게 인덱스 구축
            # if place_documents:
            #     self.logger.info("📊 2단계: 가게 인덱스 구축 시작")
            #     self.build_place_index(place_documents)
            #     self.logger.info("✅ 2단계: 가게 인덱스 구축 완료")
            # else:
            #     self.logger.warning("⚠️ 가게 문서가 없어 가게 인덱스를 건너뜁니다.")
            
            self.logger.info("🎉 전체 인덱스 구축 완료!")
            
        except Exception as e:
            self.logger.error(f"인덱스 구축 실패: {e}")
            raise
    
    def search_menu(self, query_text: str, n_results: int = 50, 
                   where: Optional[Dict] = None) -> List[Dict]:
        """메뉴 검색"""
        if not CHROMADB_AVAILABLE or not self.menu_collection:
            self.logger.warning("ChromaDB를 사용할 수 없습니다.")
            return []
        
        try:
            # 쿼리 임베딩 생성
            query_embedding = self.embedding_service.embed_single_text(query_text)
            
            # 검색 실행
            results = self.menu_collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=n_results,
                where=where,
                include=["metadatas", "documents", "distances"]
            )
            
            # 결과 변환
            search_results = []
            if results["ids"] and results["ids"][0]:
                for i, doc_id in enumerate(results["ids"][0]):
                    metadata = results["metadatas"][0][i]
                    distance = results["distances"][0][i]
                    
                    # 거리를 유사도 점수로 변환 (0-1 범위)
                    similarity_score = 1.0 - distance
                    
                    search_results.append({
                        "id": doc_id,
                        "metadata": metadata,
                        "document": results["documents"][0][i],
                        "similarity_score": similarity_score,
                        "distance": distance
                    })
            
            return search_results
            
        except Exception as e:
            self.logger.error(f"메뉴 검색 실패: {e}")
            return []
    
    def search_place(self, query_text: str, n_results: int = 50,
                    where: Optional[Dict] = None) -> List[Dict]:
        """가게 검색"""
        if not CHROMADB_AVAILABLE or not self.place_collection:
            self.logger.warning("ChromaDB를 사용할 수 없습니다.")
            return []
        
        try:
            # 쿼리 임베딩 생성
            query_embedding = self.embedding_service.embed_single_text(query_text)
            
            # 검색 실행
            results = self.place_collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=n_results,
                where=where,
                include=["metadatas", "documents", "distances"]
            )
            
            # 결과 변환
            search_results = []
            if results["ids"] and results["ids"][0]:
                for i, doc_id in enumerate(results["ids"][0]):
                    metadata = results["metadatas"][0][i]
                    distance = results["distances"][0][i]
                    
                    # 거리를 유사도 점수로 변환 (0-1 범위)
                    similarity_score = 1.0 - distance
                    
                    search_results.append({
                        "id": doc_id,
                        "metadata": metadata,
                        "document": results["documents"][0][i],
                        "similarity_score": similarity_score,
                        "distance": distance
                    })
            
            return search_results
            
        except Exception as e:
            self.logger.error(f"가게 검색 실패: {e}")
            return []
    
    # 사용자 갤러리 이미지 임베딩을 저장/검색하는 전용 컬렉션을 반환
    def get_user_images_collection(self):
        self._initialize_chroma()
        return self.client.get_or_create_collection(
            name="user_images",
            metadata={"hnsw:space": "cosine"},
        )
    # user_images 컬렉션에 단일 이미지 임베딩을 upsert(insert or update)
    def add_user_image_embedding(self, *, user_id: int, image_id: str, embedding: list[float], image_url: str, category: str | None = None):
        col = self.get_user_images_collection()
        meta = {"user_id": user_id, "image_url": image_url}
        if category:
            meta["category"] = category
        col.upsert(
            ids=[f"userimg:{image_id}"],
            embeddings=[embedding],
            metadatas=[meta],
            documents=[image_url],   # 선택
        )        

    def get_user_category_exploration_preference(self, user_id: int, min_images: int = 10) -> Optional[float]:
        """유저의 갤러리 카테고리 분포로 탐험성 점수(0~5) 계산.

        - 이미지가 충분치 않으면 None 반환(기존 온보딩/DB 값을 사용하도록).
        - 계산식: 카테고리 분포의 엔트로피를 정규화(0~1) 후 0~5 스케일로 매핑.
        """
        if not CHROMADB_AVAILABLE or not self.client:
            return None

        try:
            col = self.get_user_images_collection()
            res = col.get(where={"user_id": user_id}, include=["metadatas"])
            metas = (res or {}).get("metadatas") or []
            cats = [m.get("category") for m in metas if m and m.get("category")]
            if len(cats) < min_images:
                return None

            cnt = Counter(cats)
            total = sum(cnt.values())
            if total == 0:
                return None
            ps = [c / total for c in cnt.values()]
            H = -sum(p * math.log(p + 1e-12) for p in ps)
            Hmax = math.log(len(ps)) if ps else 0.0
            Hnorm = 0.0 if Hmax == 0.0 else H / Hmax  # 0~1
            return round(5.0 * Hnorm, 2)
        except Exception as e:
            self.logger.error(f"탐험성 계산 실패: {e}")
            return None


    def get_collection_info(self) -> Dict[str, Any]:
        """컬렉션 정보 조회"""
        if not CHROMADB_AVAILABLE or not self.client:
            return {"error": "ChromaDB를 사용할 수 없습니다."}
        
        try:
            info = {
                "menu_collection": {
                    "count": self.menu_collection.count() if self.menu_collection else 0,
                    "name": self.menu_collection.name if self.menu_collection else None
                },
                "place_collection": {
                    "count": self.place_collection.count() if self.place_collection else 0,
                    "name": self.place_collection.name if self.place_collection else None
                }
            }
            return info
            
        except Exception as e:
            self.logger.error(f"컬렉션 정보 조회 실패: {e}")
            return {"error": str(e)}
    
    def reset_collections(self):
        """컬렉션 초기화"""
        if not CHROMADB_AVAILABLE or not self.client:
            self.logger.warning("ChromaDB를 사용할 수 없습니다.")
            return
        
        try:
            # 기존 컬렉션 삭제
            try:
                self.client.delete_collection("menu_collection")
                self.client.delete_collection("place_collection")
            except:
                pass  # 컬렉션이 없어도 무시
            
            # 컬렉션 재생성
            self._initialize_chroma()
            
            self.logger.info("컬렉션 초기화 완료")
            
        except Exception as e:
            self.logger.error(f"컬렉션 초기화 실패: {e}")
            raise
    
    def get_existing_menu_data(self):
        """기존 메뉴 데이터 조회"""
        if not CHROMADB_AVAILABLE or not self.menu_collection:
            self.logger.warning("ChromaDB 메뉴 컬렉션을 사용할 수 없습니다.")
            return None
        
        try:
            # 모든 메뉴 데이터 조회
            results = self.menu_collection.get(include=["metadatas", "embeddings", "documents"])
            self.logger.info(f"기존 메뉴 데이터 조회 완료: {len(results['ids'])}개")
            return results
            
        except Exception as e:
            self.logger.error(f"기존 메뉴 데이터 조회 실패: {e}")
            return None
    
    def create_image_urls_mapping(self, restaurant_data_file_path: str):
        """원본 JSON 데이터에서 이미지 URL 매핑 생성"""
        import json
        
        try:
            # JSON 파일 로드
            with open(restaurant_data_file_path, 'r', encoding='utf-8') as f:
                restaurant_data = json.load(f)
            
            image_urls_mapping = {}
            
            for restaurant in restaurant_data:
                place_id = restaurant.get("id", "")
                
                # detail_info 안의 menus 배열 확인
                detail_info = restaurant.get("detail_info", {})
                menus = detail_info.get("menus", [])
                
                if menus is None:
                    menus = []
                
                for menu in menus:
                    menu_id = menu.get("id", "")
                    image_urls = menu.get("images", [])
                    
                    if menu_id and image_urls:
                        image_urls_mapping[menu_id] = image_urls
                        self.logger.debug(f"메뉴 {menu_id} 이미지 URL 추가: {len(image_urls)}개")
            
            self.logger.info(f"이미지 URL 매핑 생성 완료: {len(image_urls_mapping)}개 메뉴")
            return image_urls_mapping
            
        except Exception as e:
            self.logger.error(f"이미지 URL 매핑 생성 실패: {e}")
            return {}
    
    def batch_update_menu_metadata(self, image_urls_mapping: dict, batch_size: int = 100):
        """메뉴 메타데이터 배치 업데이트"""
        if not CHROMADB_AVAILABLE or not self.menu_collection:
            self.logger.warning("ChromaDB 메뉴 컬렉션을 사용할 수 없습니다.")
            return False
        
        try:
            # 기존 데이터 조회
            existing_data = self.get_existing_menu_data()
            if not existing_data:
                return False
            
            # 메타데이터 업데이트
            updated_metadatas = []
            for i, metadata in enumerate(existing_data["metadatas"]):
                doc_id = existing_data["ids"][i]
                image_urls = image_urls_mapping.get(doc_id, [])
                
                # 기존 메타데이터에 이미지 URL 추가
                updated_metadata = metadata.copy()
                updated_metadata["image_urls"] = json.dumps(image_urls, ensure_ascii=False)
                updated_metadatas.append(updated_metadata)
            
            # 배치 단위로 업데이트
            total_docs = len(existing_data["ids"])
            updated_count = 0
            
            for i in range(0, total_docs, batch_size):
                batch_ids = existing_data["ids"][i:i+batch_size]
                batch_metadatas = updated_metadatas[i:i+batch_size]
                
                self.menu_collection.update(
                    ids=batch_ids,
                    metadatas=batch_metadatas
                )
                
                updated_count += len(batch_ids)
                progress_percent = (updated_count / total_docs) * 100
                self.logger.info(f"메타데이터 업데이트 진행률: {progress_percent:.1f}% ({updated_count}/{total_docs})")
            
            self.logger.info(f"메뉴 메타데이터 업데이트 완료: {updated_count}개")
            return True
            
        except Exception as e:
            self.logger.error(f"메뉴 메타데이터 업데이트 실패: {e}")
            return False

class ChromaRecommendationEngine:
    """ChromaDB 기반 추천 엔진"""
    
    def __init__(self, vector_index_builder: ChromaVectorIndexBuilder):
        self.vector_index_builder = vector_index_builder
        self.logger = logging.getLogger(__name__)
    
    def search_menu(self, user_profile_text: str, query_text: str = "", 
                   k: int = 50, filters: Optional[Dict] = None) -> List[Tuple[Dict, float]]:
        """메뉴 검색"""
        try:
            # 사용자 프로필과 쿼리 텍스트 결합
            search_text = f"{user_profile_text} {query_text}".strip()
            
            # ChromaDB 검색
            results = self.vector_index_builder.search_menu(search_text, n_results=k, where=filters)
            
            # 결과 변환
            search_results = []
            for result in results:
                # 메타데이터에서 필요한 정보 추출
                metadata = result["metadata"]
                menu_doc = {
                    "id": result["id"],
                    "place_id": metadata.get("place_id", ""),
                    "menu_name": metadata.get("menu_name", ""),
                    "place_name": metadata.get("place_name", ""),
                    "price": metadata.get("price", 0),
                    "category": metadata.get("category", ""),
                    "location": metadata.get("location", ""),
                    "rating": metadata.get("rating", 0),
                    "review_count": metadata.get("review_count", 0),
                    "keywords": json.loads(metadata.get("keywords", "[]")),
                    "voted_keywords": json.loads(metadata.get("voted_keywords", "[]")),
                    "has_image": metadata.get("has_image", False),
                    "image_urls": json.loads(metadata.get("image_urls", "[]")),  # 이미지 URL 추가
                    "coordinates": json.loads(metadata.get("coordinates", "[0,0]")),
                    "document_text": result["document"]
                }
                
                search_results.append((menu_doc, result["similarity_score"]))
            
            return search_results
            
        except Exception as e:
            self.logger.error(f"메뉴 검색 실패: {e}")
            return []
    
    def search_place(self, user_profile_text: str, query_text: str = "", 
                    k: int = 50, filters: Optional[Dict] = None) -> List[Tuple[Dict, float]]:
        """가게 검색"""
        try:
            # 사용자 프로필과 쿼리 텍스트 결합
            search_text = f"{user_profile_text} {query_text}".strip()
            
            # ChromaDB 검색
            results = self.vector_index_builder.search_place(search_text, n_results=k, where=filters)
            
            # 결과 변환
            search_results = []
            for result in results:
                # 메타데이터에서 필요한 정보 추출
                metadata = result["metadata"]
                place_doc = {
                    "id": result["id"],
                    "name": metadata.get("name", ""),
                    "category": metadata.get("category", ""),
                    "location": metadata.get("location", ""),
                    "rating": metadata.get("rating", 0),
                    "review_count": metadata.get("review_count", 0),
                    "avg_price": metadata.get("avg_price", 0),
                    "keywords": json.loads(metadata.get("keywords", "[]")),
                    "voted_keywords": json.loads(metadata.get("voted_keywords", "[]")),
                    "features": json.loads(metadata.get("features", "[]")),
                    "coordinates": json.loads(metadata.get("coordinates", "[0,0]")),
                    "document_text": result["document"]
                }
                
                search_results.append((place_doc, result["similarity_score"]))
            
            return search_results
            
        except Exception as e:
            self.logger.error(f"가게 검색 실패: {e}")
            return []

def test_chroma_functionality():
    """ChromaDB 기능 테스트"""
    print("=== ChromaDB 기능 테스트 ===")
    
    if not CHROMADB_AVAILABLE:
        print("❌ ChromaDB가 설치되지 않았습니다.")
        return False
    
    try:
        # 임베딩 서비스 초기화
        from recommendation_system import EmbeddingService
        embedding_service = EmbeddingService()
        
        # ChromaDB 벡터 인덱스 빌더 초기화
        vector_builder = ChromaVectorIndexBuilder(embedding_service, "./test_chroma_db")
        
        # 컬렉션 정보 조회
        info = vector_builder.get_collection_info()
        print(f"컬렉션 정보: {info}")
        
        # 테스트 문서 생성
        class MockDocument:
            def __init__(self, doc_id, text, metadata):
                self.id = doc_id
                self.document_text = text
                self.place_id = metadata.get("place_id", "")
                self.menu_name = metadata.get("menu_name", "")
                self.place_name = metadata.get("place_name", "")
                self.price = metadata.get("price", 0)
                self.category = metadata.get("category", "")
                self.location = metadata.get("location", "")
                self.rating = metadata.get("rating", 0)
                self.review_count = metadata.get("review_count", 0)
                self.keywords = metadata.get("keywords", [])
                self.voted_keywords = metadata.get("voted_keywords", [])
                self.has_image = metadata.get("has_image", False)
                self.coordinates = metadata.get("coordinates", [0, 0])
        
        # 샘플 메뉴 문서
        test_menu_docs = [
            MockDocument(
                "test_menu_1",
                "단팥빵 — 쟝블랑제리 낙성대본점 (서울/관악구/봉천동, 베이커리). 대표 키워드: 단팥빵, 크림치즈. 평균별점 4.44/5, 리뷰 25804건. 가격 2,400원. 특징: 빵이 맛있어요, 가성비가 좋아요.",
                {
                    "place_id": "12800337",
                    "menu_name": "단팥빵",
                    "place_name": "쟝블랑제리 낙성대본점",
                    "price": 2400,
                    "category": "베이커리",
                    "location": "서울/관악구/봉천동",
                    "rating": 4.44,
                    "review_count": 25804,
                    "keywords": ["단팥빵", "크림치즈"],
                    "voted_keywords": ["빵이 맛있어요", "가성비가 좋아요"],
                    "has_image": True,
                    "coordinates": [126.9619864, 37.477136]
                }
            )
        ]
        
        # 메뉴 인덱스 구축
        vector_builder.build_menu_index(test_menu_docs)
        
        # 검색 테스트
        search_results = vector_builder.search_menu("단팥빵 맛있는 베이커리", n_results=5)
        print(f"검색 결과: {len(search_results)}개")
        
        if search_results:
            result = search_results[0]
            print(f"첫 번째 결과: {result['metadata']['menu_name']} (유사도: {result['similarity_score']:.3f})")
        
        # 추천 엔진 테스트
        recommendation_engine = ChromaRecommendationEngine(vector_builder)
        menu_results = recommendation_engine.search_menu("단맛 선호 베이커리", "단팥빵", k=5)
        print(f"추천 엔진 결과: {len(menu_results)}개")
        
        if menu_results:
            menu_doc, score = menu_results[0]
            print(f"첫 번째 추천: {menu_doc['menu_name']} (점수: {score:.3f})")
        
        print("✅ ChromaDB 기능 테스트 완료!")
        return True
        
    except Exception as e:
        print(f"❌ ChromaDB 테스트 실패: {e}")
        return False

if __name__ == "__main__":
    test_chroma_functionality()