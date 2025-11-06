#!/usr/bin/env python3
"""
client.py - Restaurant recommendation system

This script provides restaurant and menu recommendations based on:
- User location (using PostGIS for spatial queries)
- User profile (cuisine preferences)
- Menu categorization using LangChain
"""

import os
import sys
import json
import time
from typing import Dict, List, Any, Optional, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
import math
import numpy as np
from sklearn.cluster import HDBSCAN, SpectralClustering, KMeans
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from transformers import AutoTokenizer, AutoModel
import torch
import warnings

# Suppress sklearn convergence warnings for cleaner output
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

# Load environment variables - look for .env files in multiple locations
# 1. Current directory
# 2. Same directory as this script  
# 3. Parent directory (psql/)
# 4. Parent's parent directory (server/)
script_dir = os.path.dirname(os.path.abspath(__file__))
env_locations = [
    '.env',  # Current working directory
    os.path.join(script_dir, '.env'),  # recommend/
    os.path.join(script_dir, '..', '.env'),  # psql/
    os.path.join(script_dir, '..', 'settings', '.env'),  # psql/settings/
    os.path.join(script_dir, '..', '..', '.env'),  # server/
]

for env_path in env_locations:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

# Database connection parameters
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'foodigram'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

# OpenAI API key
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Embedding model configuration
EMBEDDING_MODEL_NAME = os.getenv('EMBEDDING_MODEL_NAME', 'BM-K/KoSimCSE-roberta')
EMBEDDING_MAX_LENGTH = int(os.getenv('EMBEDDING_MAX_LENGTH', '512'))
EMBEDDING_BATCH_SIZE = int(os.getenv('EMBEDDING_BATCH_SIZE', '32'))

# Clustering configuration
CLUSTERING_METHOD = os.getenv('CLUSTERING_METHOD', 'spectral')

# HDBSCAN clustering parameters
HDBSCAN_MIN_CLUSTER_SIZE = int(os.getenv('HDBSCAN_MIN_CLUSTER_SIZE', '3'))
HDBSCAN_MIN_SAMPLES = int(os.getenv('HDBSCAN_MIN_SAMPLES', '1'))
HDBSCAN_CLUSTER_SELECTION_EPSILON = float(os.getenv('HDBSCAN_CLUSTER_SELECTION_EPSILON', '0.3'))

# Spectral clustering parameters
SPECTRAL_MAX_CLUSTERS = int(os.getenv('SPECTRAL_MAX_CLUSTERS', '5'))
SPECTRAL_CLUSTER_DIVISOR = int(os.getenv('SPECTRAL_CLUSTER_DIVISOR', '4'))
SPECTRAL_N_NEIGHBORS = int(os.getenv('SPECTRAL_N_NEIGHBORS', '10'))

# KMeans clustering parameters
KMEANS_MAX_CLUSTERS = int(os.getenv('KMEANS_MAX_CLUSTERS', '12'))
KMEANS_CLUSTER_DIVISOR = int(os.getenv('KMEANS_CLUSTER_DIVISOR', '8'))
KMEANS_N_INIT = int(os.getenv('KMEANS_N_INIT', '20'))
KMEANS_MAX_ITER = int(os.getenv('KMEANS_MAX_ITER', '500'))

# Similarity clustering fallback
SIMILARITY_THRESHOLD_DEFAULT = float(os.getenv('SIMILARITY_THRESHOLD_DEFAULT', '0.7'))
SIMILARITY_THRESHOLD_AGGRESSIVE = float(os.getenv('SIMILARITY_THRESHOLD_AGGRESSIVE', '0.4'))

# LLM configuration
LLM_TEMPERATURE = float(os.getenv('LLM_TEMPERATURE', '0.1'))
LLM_MAX_TOKENS = int(os.getenv('LLM_MAX_TOKENS', '500'))
LLM_BATCH_SIZE = int(os.getenv('LLM_BATCH_SIZE', '20'))

# Category aliases mapping from specifications.md
CATEGORY_ALIASES = {
    'korean': '한식',
    'japanese': '일식', 
    'snackfood': '분식',
    'chinese': '중식',
    'western': '양식',
    'global': '세계음식',
    'fastfood': '패스트푸드',
    'meat': '육류/고기요리',
    'seafood': '해산물',
    'bakery/dessert': '베이커리/디저트',
    'coffee/beverage': '커피/음료',
    'brunch/sandwich': '브런치/샌드위치',
    'healthy/salad': '다이어트/샐러드',
    'bar/pub': '주점',
    'convenience': '간편식',
    'miscellaneous': '기타',
    # 추가 영어별칭 매핑
    'mexican': '세계음식',  # 멕시코/남미음식이 세계음식 그룹에 속함
    'thai': '세계음식',  # 태국음식이 세계음식 그룹에 속함
    'italian': '세계음식',  # 이탈리아음식이 세계음식 그룹에 속함
    'indian': '세계음식',  # 인도음식이 세계음식 그룹에 속함
    'vietnamese': '세계음식',  # 베트남음식이 세계음식 그룹에 속함
    'spanish': '세계음식',  # 스페인음식이 세계음식 그룹에 속함
    'turkish': '세계음식',  # 터키음식이 세계음식 그룹에 속함
    'american': '양식',  # 미국식 음식은 일반적으로 양식으로 분류
    'usa': '양식',
    'united states': '양식'
}

class UserProfile:
    """User profile with preferences"""
    def __init__(self, 
                 location: Tuple[float, float],  # (longitude, latitude)
                 location_info: str = None,  # Human-readable location description
                 cuisine_preferences: List[str] = None,
                 max_distance_km: float = None):  # Maximum search distance in km
        self.location = location
        self.location_info = location_info
        self.cuisine_preferences = cuisine_preferences or []
        self.max_distance_km = max_distance_km

class RestaurantRecommender:
    """Main recommendation system"""
    
    def __init__(self, model_name: str = "gpt-4o-mini", verbose: bool = True):
        self.verbose = verbose
        self.conn = self._get_db_connection()
        self.llm = self._setup_langchain(model_name)
        self.embedding_model = None
        self.embedding_tokenizer = None
        self.category_embeddings = None
        self._load_embedding_model()
    
    def resolve_category_aliases(self, categories: List[str]) -> List[str]:
        """
        Resolve category aliases to Korean category names.
        Supports both English aliases and Korean names.
        
        Args:
            categories: List of category names (can be aliases or Korean names)
            
        Returns:
            List of resolved Korean category names
        """
        if not categories:
            return []
        
        resolved_categories = []
        for category in categories:
            # Convert to lowercase for case-insensitive matching
            category_lower = category.lower().strip()
            
            # Check if it's an alias
            if category_lower in CATEGORY_ALIASES:
                resolved_categories.append(CATEGORY_ALIASES[category_lower])
            else:
                # Assume it's already a Korean category name
                resolved_categories.append(category.strip())
        
        return resolved_categories
    
    def _load_embedding_model(self):
        """Load the embedding model for semantic similarity"""
        try:
            self.embedding_tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
            self.embedding_model = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)
            device = "cuda" if torch.cuda.is_available() else "cpu"
            self.embedding_model.to(device)
            self.embedding_model.eval()
            if self.verbose:
                print(f"Loaded embedding model: {EMBEDDING_MODEL_NAME} on {device}")
            
            self._precompute_category_embeddings()
        except Exception as e:
            if self.verbose:
                print(f"Warning: Failed to load embedding model: {e}")
            self.embedding_model = None
            self.embedding_tokenizer = None
    
    def _precompute_category_embeddings(self):
        """Precompute embeddings for all possible category_normalized options"""
        if not self.embedding_model or not self.embedding_tokenizer:
            return
        
        try:
            with self.conn.cursor() as cursor:
                cursor.execute("SELECT DISTINCT category_normalized FROM db_restaurants WHERE category_normalized IS NOT NULL")
                categories = [row[0] for row in cursor.fetchall()]
            
            if not categories:
                print("No categories found in database")
                return
            
            if self.verbose:
                print(f"Precomputing embeddings for {len(categories)} categories...")
            
            device = next(self.embedding_model.parameters()).device
            embeddings = []
            
            for category in categories:
                inputs = self.embedding_tokenizer(category, return_tensors="pt", padding=True, truncation=True, max_length=EMBEDDING_MAX_LENGTH)
                inputs = {k: v.to(device) for k, v in inputs.items()}
                
                with torch.no_grad():
                    outputs = self.embedding_model(**inputs)
                    embedding = outputs.last_hidden_state.mean(dim=1)
                    embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)
                    embeddings.append(embedding.cpu().numpy().flatten())
            
            self.category_embeddings = {
                'categories': categories,
                'embeddings': np.array(embeddings)
            }
            if self.verbose:
                print(f"Precomputed {len(categories)} category embeddings")
        except Exception as e:
            if self.verbose:
                print(f"Warning: Failed to precompute category embeddings: {e}")
            self.category_embeddings = None
    
    def _get_embedding(self, text: str) -> np.ndarray:
        """Get embedding for a single text"""
        if not self.embedding_model or not self.embedding_tokenizer:
            return None
        
        try:
            device = next(self.embedding_model.parameters()).device
            inputs = self.embedding_tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=EMBEDDING_MAX_LENGTH)
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = self.embedding_model(**inputs)
                embedding = outputs.last_hidden_state.mean(dim=1)
                embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)
                return embedding.cpu().numpy().flatten()
        except Exception as e:
            if self.verbose:
                print(f"Error getting embedding for '{text}': {e}")
            return None
    
    def _simple_similarity_clustering(self, vectors: np.ndarray, threshold: float = None, target_clusters: int = None) -> np.ndarray:
        """Fallback clustering method using cosine similarity threshold"""
        if threshold is None:
            threshold = SIMILARITY_THRESHOLD_DEFAULT
            
        if self.verbose:
            print(f"Using simple similarity clustering with threshold {threshold}")
        
        n_items = len(vectors)
        cluster_labels = np.full(n_items, -1)  # Initialize all as noise
        current_cluster = 0
        
        for i in range(n_items):
            if cluster_labels[i] != -1:  # Already clustered
                continue
            
            # Start new cluster
            cluster_labels[i] = current_cluster
            cluster_size = 1
            
            # Find similar items
            for j in range(i + 1, n_items):
                if cluster_labels[j] != -1:  # Already clustered
                    continue
                
                # Calculate cosine similarity
                similarity = cosine_similarity([vectors[i]], [vectors[j]])[0][0]
                if similarity >= threshold:
                    cluster_labels[j] = current_cluster
                    cluster_size += 1
            
            # Only keep clusters with more than 1 item
            if cluster_size > 1:
                current_cluster += 1
            else:
                cluster_labels[i] = -1  # Mark as noise
        
        if self.verbose:
            print(f"Simple clustering created {current_cluster} clusters")
        return cluster_labels
    
    def _salvage_partial_json(self, json_str: str, batch_start: int, batch_end: int) -> Dict:
        """
        Try to salvage a partial or malformed JSON response
        """
        try:
            # First, try to find and fix common JSON issues
            cleaned = json_str.strip()
            
            # Remove any trailing incomplete entries
            if cleaned.endswith(','):
                cleaned = cleaned[:-1]
            
            # Try to close incomplete JSON objects
            if not cleaned.endswith('}'):
                # Count opening and closing braces
                open_braces = cleaned.count('{')
                close_braces = cleaned.count('}')
                
                # Add missing closing braces
                if open_braces > close_braces:
                    cleaned += '}' * (open_braces - close_braces)
            
            # Try to parse the cleaned version
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                pass
            
            # Try to extract valid complete category entries using regex
            import re
            # Pattern to match complete category entries: "CategoryName": ["hex1", "hex2"]
            pattern = r'"([^"]+)":\s*\[([^\]]*)\]'
            matches = re.findall(pattern, json_str)
            
            if matches:
                salvaged = {}
                for category_name, indices_str in matches:
                    try:
                        # Parse the indices (handle both hex strings and decimal)
                        indices_str = indices_str.strip()
                        if indices_str:
                            # Split by comma and clean up each index
                            raw_indices = [x.strip().strip('"\'') for x in indices_str.split(',')]
                            valid_indices = []
                            
                            for raw_index in raw_indices:
                                if raw_index:
                                    try:
                                        # Try hex first, then decimal
                                        if raw_index.isdigit():
                                            decimal_index = int(raw_index)
                                        else:
                                            decimal_index = int(raw_index, 16)
                                        
                                        # Filter indices to be within the current batch range
                                        if batch_start <= decimal_index < batch_end:
                                            valid_indices.append(decimal_index)
                                    except ValueError:
                                        continue
                            
                            if valid_indices:
                                salvaged[category_name] = valid_indices
                    except (ValueError, AttributeError):
                        continue
                
                if salvaged:
                    if self.verbose:
                        print(f"Salvaged {len(salvaged)} categories from malformed JSON")
                    return salvaged
            
        except Exception as e:
            if self.verbose:
                print(f"Error in JSON salvage: {e}")
        
        return {}
    
    def _get_db_connection(self):
        """Create and return a database connection"""
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            return conn
        except Exception as e:
            if self.verbose:
                print(f"Error connecting to database: {e}")
            sys.exit(1)
    
    def _setup_langchain(self, model_name: str = None):
        """Setup LangChain with OpenAI"""
        if not OPENAI_API_KEY:
            if self.verbose:
                print("Warning: OPENAI_API_KEY not set. Menu categorization will be skipped.")
            return None
        
        # Use environment variable if no model specified
        if model_name is None:
            model_name = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
        
        return ChatOpenAI(
            openai_api_key=OPENAI_API_KEY,
            model_name=model_name,
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS
        )
    
    def find_nearby_restaurants(self, user_profile: UserProfile, 
                              max_distance_km: float = None,
                              categories: List[str] = None,
                              max_restaurants: int = 30) -> List[Dict]:
        """Find restaurants within range and matching categories
        
        Args:
            user_profile: User profile with location and preferences  
            max_distance_km: Override for maximum search radius (uses UserProfile.max_distance_km if None)
            categories: List of category names (supports aliases like 'korean', 'japanese', etc.)
            max_restaurants: Maximum number of restaurants to return (default 30, closest first)
        """
        
        # Use UserProfile's max_distance_km if no override provided
        search_distance = max_distance_km if max_distance_km is not None else user_profile.max_distance_km
        
        # Warning for unrestricted queries
        if search_distance is None and not categories:
            response = input("Warning: No distance or category restrictions. This may cause high latency. Continue? (y/n): ")
            if response.lower() != 'y':
                return []
        
        longitude, latitude = user_profile.location
        
        # Resolve category aliases to Korean names
        resolved_categories = self.resolve_category_aliases(categories) if categories else None
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cursor:
            # Build query dynamically
            where_conditions = []
            where_params = []
            
            # Distance filter
            # geom is stored as text (WKB hex string), need to decode and convert to geometry
            if search_distance:
                where_conditions.append("ST_DWithin(decode(geom, 'hex')::geometry::geography, ST_SetSRID(ST_Point(%s, %s), 4326)::geography, %s)")
                where_params.extend([longitude, latitude, search_distance * 1000])  # Convert km to meters
            
            # Category filter - use category_normalized column for better matching
            if resolved_categories:
                placeholders = ','.join(['%s'] * len(resolved_categories))
                where_conditions.append(f"category_normalized = ANY(ARRAY[{placeholders}])")
                where_params.extend(resolved_categories)
            
            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
            
            # Combine all parameters: SELECT clause params + WHERE clause params + LIMIT param
            query_params = [longitude, latitude] + where_params + [max_restaurants]
            
            query = f"""
            SELECT *,
                   ST_X(decode(geom, 'hex')::geometry) as x,
                   ST_Y(decode(geom, 'hex')::geometry) as y,
                   ST_Distance(decode(geom, 'hex')::geometry::geography, ST_SetSRID(ST_Point(%s, %s), 4326)::geography) as distance_meters
            FROM db_restaurants
            WHERE {where_clause}
            ORDER BY distance_meters
            LIMIT %s;
            """
            
            # Time the database query execution
            query_start_time = time.time()
            
            # Log the query for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Executing query: {query}")
            logger.info(f"Query params: {query_params}")
            
            try:
                cursor.execute(query, query_params)
                restaurants = cursor.fetchall()
            except Exception as e:
                # Rollback transaction on error to avoid "current transaction is aborted" error
                self.conn.rollback()
                logger.error(f"Database query error: {e}")
                raise
            query_end_time = time.time()
            
            query_time = query_end_time - query_start_time
            if self.verbose:
                print(f"   🔍 Restaurant database query: {query_time:.3f}s")
            
            logger.info(f"Query returned {len(restaurants)} restaurants")
            
            return [dict(restaurant) for restaurant in restaurants]
    
    def get_restaurant_menus(self, restaurant_ids: List[str]) -> Dict[str, List[Dict]]:
        """Get menus for given restaurants"""
        if not restaurant_ids:
            return {}
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cursor:
            placeholders = ','.join(['%s::uuid'] * len(restaurant_ids))
            query = f"""
            SELECT m.*, 
                   r.name as restaurant_name,
                   r.category,
                   r.category_normalized,
                   r.avg_rating as rating,
                   r.review_count,
                   ST_X(decode(r.geom, 'hex')::geometry) as x,
                   ST_Y(decode(r.geom, 'hex')::geometry) as y
            FROM db_menus m
            JOIN db_restaurants r ON r.id = m.restaurant_id
            WHERE m.restaurant_id = ANY(ARRAY[{placeholders}])
            ORDER BY m.restaurant_id, m.index_in_rest;
            """
            
            try:
                cursor.execute(query, restaurant_ids)
                menus = cursor.fetchall()
            except Exception as e:
                # Rollback transaction on error to avoid "current transaction is aborted" error
                self.conn.rollback()
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Database query error: {e}")
                raise
            
            # Group by restaurant
            restaurant_menus = {}
            for menu in menus:
                restaurant_id = menu['restaurant_id']
                if restaurant_id not in restaurant_menus:
                    restaurant_menus[restaurant_id] = []
                restaurant_menus[restaurant_id].append(dict(menu))
            
            return restaurant_menus
    
    
    def categorize_menus_langchain(self, menus: List[Dict]) -> Dict[str, List[Dict]]:
        """Categorize menus using LangChain with improved batching and prompting"""
        if not self.llm or not menus:
            return {"일반": menus}
        
        # Create menu dictionary with hexadecimal indices
        menu_items = []
        for i, menu in enumerate(menus):
            if menu.get('name'):
                hex_index = hex(i)[2:]  # Remove '0x' prefix
                menu_items.append(f"{hex_index}: {menu['name']}")
        
        if not menu_items:
            return {"일반": menus}
        
        # Process in batches to handle more menus
        batch_size = LLM_BATCH_SIZE
        all_categorized_menus = {}
        all_used_indices = set()
        
        # Track AI timing
        ai_total_time = 0.0
        successful_batches = 0
        failed_batches = 0
        
        for batch_start in range(0, len(menu_items), batch_size):
            batch_end = min(batch_start + batch_size, len(menu_items))
            batch_items = menu_items[batch_start:batch_end]
            
            # Create improved prompt for categorization
            prompt_template = """
            Categorize these Korean food menu items by their index numbers.
            Be comprehensive and categorize every item.

            Menu items:
            {menu_list}
            
            Create meaningful name for each category.
            
            Category name requirements:
            - Provide ONLY the category name in Korean, no explanations
            - The name must be either main ingredients, cooking methods, taste profiles, cuisine types, or their combination
            - Do not use vague names like "기타", "음식"
            - Keep it concise (no more than 4 words)
            
            The response must be in a valid, complete JSON object.
            No extra text or explanations are allowed.
            Format: {{"종류1": ["0", "3"], "종류2": ["1", "5"], "종류3": ["2", "4"]}}
            Use hexadecimal indices (without 0x prefix) to save tokens.
            
            Response requirements:
            1. Include ALL indices from {start_idx_hex} to {end_idx_hex}
            2. Use exactly 20 categories or fewer
            3. Use only valid JSON syntax with hex indices as strings
            4. End with a complete closing brace
            5. Do not truncate the response
            """
            
            try:
                prompt_template_obj = PromptTemplate(
                    input_variables=["menu_list", "start_idx_hex", "end_idx_hex"],
                    template=prompt_template
                )
                
                menu_list_str = "\n".join(batch_items)
                start_idx_hex = hex(batch_start)[2:]
                end_idx_hex = hex(batch_end-1)[2:]
                formatted_prompt = prompt_template_obj.format(
                    menu_list=menu_list_str,
                    start_idx_hex=start_idx_hex,
                    end_idx_hex=end_idx_hex
                )
                
                # Time the AI call
                ai_start_time = time.time()
                result = self.llm.invoke(formatted_prompt)
                ai_end_time = time.time()
                
                batch_ai_time = ai_end_time - ai_start_time
                ai_total_time += batch_ai_time
                
                # Parse result - Extract content from ChatOpenAI response
                if hasattr(result, 'content'):
                    result_clean = result.content.strip()
                else:
                    result_clean = str(result).strip()
                
                # Clean up markdown formatting
                if result_clean.startswith('```'):
                    result_clean = result_clean.replace('```json', '').replace('```', '').strip()
                
                # Try to extract JSON from the response if it's wrapped in text
                if not result_clean.startswith('{'):
                    # Look for JSON object in the response
                    start_idx = result_clean.find('{')
                    end_idx = result_clean.rfind('}') + 1
                    if start_idx != -1 and end_idx > start_idx:
                        result_clean = result_clean[start_idx:end_idx]
                
                # Try to parse JSON with robust error handling
                try:
                    categories = json.loads(result_clean)
                except json.JSONDecodeError:
                    
                    # Try to salvage partial JSON
                    categories = self._salvage_partial_json(result_clean, batch_start, batch_end)
                    
                    if not categories:
                        # If salvage failed, skip this batch (no automatic "기타" category)
                        continue
                
                # Map menus to categories using indices (convert hex to decimal)
                for category, menu_indices in categories.items():
                    # Clean the category name
                    clean_category = self._clean_category_name(category)
                    if clean_category not in all_categorized_menus:
                        all_categorized_menus[clean_category] = []
                    
                    for index in menu_indices:
                        try:
                            # Convert hex string to decimal integer
                            if isinstance(index, str):
                                decimal_index = int(index, 16)
                            elif isinstance(index, int):
                                decimal_index = index
                            else:
                                continue
                                
                            if 0 <= decimal_index < len(menus):
                                all_categorized_menus[clean_category].append(menus[decimal_index])
                                all_used_indices.add(decimal_index)
                        except (ValueError, TypeError):
                            continue
                
                successful_batches += 1
                
            except Exception as e:
                if self.verbose:
                    if self.verbose:
                        print(f"Error processing batch {batch_start}-{batch_end}: {e}")
                failed_batches += 1
                # Skip this batch (no automatic "기타" category)
        
        # Log any uncategorized items without fallback categorization
        uncategorized = [menus[i] for i in range(len(menus)) if i not in all_used_indices]
        if uncategorized:
            if self.verbose:
                print(f"      ⚠️  {len(uncategorized)} menus uncategorized by LangChain: {[m.get('name', 'Unknown') for m in uncategorized[:5]]}")
            if len(uncategorized) > 5:
                if self.verbose:
                    print(f"      ... and {len(uncategorized) - 5} more items")
        
        # Clean up empty categories
        all_categorized_menus = {k: v for k, v in all_categorized_menus.items() if v}
        
        # Ensure maximum 10 categories - keep only top categories
        if len(all_categorized_menus) > 10:
            # Sort categories by number of items (descending) and keep top 10
            sorted_categories = sorted(all_categorized_menus.items(), key=lambda x: len(x[1]), reverse=True)
            all_categorized_menus = dict(sorted_categories[:10])
        
        
        return all_categorized_menus if all_categorized_menus else {"일반": menus}
    
    def categorize_menus_embedding(self, menus: List[Dict], user_profile: UserProfile, clustering_method: str = None, use_user_weighting: bool = True) -> Dict[str, List[Dict]]:
        """Categorize menus using embedding-based clustering"""
        if not self.embedding_model or not menus:
            return {"일반": menus}
        
        if clustering_method is None:
            clustering_method = CLUSTERING_METHOD
        
        try:
            # Get menu embeddings from database or compute them
            menu_vectors = []
            valid_menus = []
            
            if self.verbose:
                print(f"   📊 Starting with {len(menus)} total menus")
            
            no_embedding_count = 0
            no_name_clean_count = 0
            embedding_failed_count = 0
            
            for menu in menus:
                if menu.get('embedding_vector'):
                    # Use precomputed embedding from database
                    menu_vectors.append(np.array(menu['embedding_vector']))
                    valid_menus.append(menu)
                elif menu.get('name_clean'):
                    # Compute embedding for menu
                    embedding = self._get_embedding(menu['name_clean'])
                    if embedding is not None:
                        menu_vectors.append(embedding)
                        valid_menus.append(menu)
                    else:
                        embedding_failed_count += 1
                else:
                    if not menu.get('name_clean'):
                        no_name_clean_count += 1
                    else:
                        no_embedding_count += 1
            
            if self.verbose:
                print(f"   ✅ Valid for clustering: {len(valid_menus)}")
            if no_name_clean_count > 0:
                if self.verbose:
                    print(f"   🗑️  No name_clean field: {no_name_clean_count}")
            if no_embedding_count > 0:
                if self.verbose:
                    print(f"   🗑️  No embedding available: {no_embedding_count}")
            if embedding_failed_count > 0:
                if self.verbose:
                    print(f"   🗑️  Embedding generation failed: {embedding_failed_count}")
            
            if not menu_vectors:
                if self.verbose:
                    print(f"   ⚠️  No valid embeddings found, returning all as '일반'")
                return {"일반": menus}
            
            menu_vectors = np.array(menu_vectors)
            
            # Apply PCA for dimensionality reduction
            original_dim = menu_vectors.shape[1]
            n_samples = len(menu_vectors)
            
            if self.verbose:
                print(f"   📊 Original vector dimensions: {original_dim}, samples: {n_samples}")
            
            # PCA can only reduce to at most n_samples - 1 components
            max_components = min(50, original_dim, n_samples - 1) if n_samples > 1 else 1
            
            if max_components > 0 and max_components < original_dim and n_samples > 1:
                pca_start_time = time.time()
                pca = PCA(n_components=max_components)
                menu_vectors = pca.fit_transform(menu_vectors)
                pca_end_time = time.time()
                
                # Normalize after PCA to maintain unit vectors
                norms = np.linalg.norm(menu_vectors, axis=1, keepdims=True)
                norms[norms == 0] = 1  # Avoid division by zero
                menu_vectors = menu_vectors / norms
                
                explained_variance = np.sum(pca.explained_variance_ratio_)
                if self.verbose:
                    print(f"   🔧 PCA compression: {original_dim}→{max_components} dims ({pca_end_time - pca_start_time:.3f}s)")
                if self.verbose:
                    print(f"   📈 Variance retained: {explained_variance:.3f}")
            else:
                if self.verbose:
                    print(f"   ⚠️  Skipping PCA: insufficient samples or dimensions")
            
            
            # Step 2: Calculate menu vector v' = v(original) * average_similarity(restaurant vector, user categories)
            if use_user_weighting and user_profile.cuisine_preferences and self.category_embeddings:
                # Get user category embeddings
                user_categories = self.resolve_category_aliases(user_profile.cuisine_preferences)
                user_category_embeddings = []
                
                for user_cat in user_categories:
                    if user_cat in self.category_embeddings['categories']:
                        idx = self.category_embeddings['categories'].index(user_cat)
                        user_category_embeddings.append(self.category_embeddings['embeddings'][idx])
                
                if user_category_embeddings:
                    user_category_embeddings = np.array(user_category_embeddings)
                    
                    # Get restaurant vectors for similarity calculation
                    restaurant_vectors = []
                    for menu in valid_menus:
                        # Try to get restaurant embedding from database
                        with self.conn.cursor() as cursor:
                            cursor.execute("SELECT embedding_vector FROM db_restaurants WHERE id = %s", (menu['restaurant_id'],))
                            result = cursor.fetchone()
                            if result and result[0]:
                                restaurant_vectors.append(np.array(result[0]))
                            else:
                                # Use menu embedding as fallback
                                restaurant_vectors.append(menu_vectors[len(restaurant_vectors)])
                    
                    restaurant_vectors = np.array(restaurant_vectors)
                    
                    # Calculate average similarity between restaurant vectors and user categories
                    similarities = cosine_similarity(restaurant_vectors, user_category_embeddings)
                    avg_similarities = np.mean(similarities, axis=1)
                    
                    # Modify menu vectors: v' = v * average_similarity
                    menu_vectors = menu_vectors * avg_similarities.reshape(-1, 1)
            
            # Step 3: Apply clustering
            
            if clustering_method.lower() == 'hdbscan':
                # More lenient HDBSCAN parameters for smaller datasets
                min_cluster_size = max(2, min(HDBSCAN_MIN_CLUSTER_SIZE, len(valid_menus) // 5))
                min_samples = max(1, min(HDBSCAN_MIN_SAMPLES, min_cluster_size - 1))
                
                clusterer = HDBSCAN(
                    min_cluster_size=min_cluster_size,
                    min_samples=min_samples,
                    metric='cosine',  # Better for high-dimensional embeddings
                    cluster_selection_epsilon=HDBSCAN_CLUSTER_SELECTION_EPSILON,
                    allow_single_cluster=False
                )
            elif clustering_method.lower() == 'kmeans':
                # KMeans clustering
                n_clusters = max(3, min(KMEANS_MAX_CLUSTERS, len(valid_menus) // KMEANS_CLUSTER_DIVISOR))
                if self.verbose:
                    print(f"   🎯 KMeans clustering: {len(valid_menus)} menus → {n_clusters} clusters (max={KMEANS_MAX_CLUSTERS}, divisor={KMEANS_CLUSTER_DIVISOR})")
                
                clusterer = KMeans(
                    n_clusters=n_clusters,
                    random_state=42,
                    n_init=KMEANS_N_INIT,
                    max_iter=KMEANS_MAX_ITER,
                    init='k-means++'
                )
            else:  # spectral clustering
                calculated_clusters = len(valid_menus) // SPECTRAL_CLUSTER_DIVISOR
                n_clusters = max(2, min(SPECTRAL_MAX_CLUSTERS, calculated_clusters))
                
                # For very aggressive clustering, force even fewer clusters
                if calculated_clusters < 2:
                    n_clusters = 2
                    
                if self.verbose:
                    print(f"   🎯 Spectral clustering: {len(valid_menus)} menus → {n_clusters} clusters")
                if self.verbose:
                    print(f"      📊 Config: max={SPECTRAL_MAX_CLUSTERS}, divisor={SPECTRAL_CLUSTER_DIVISOR}, calculated={calculated_clusters}")
                
                clusterer = SpectralClustering(
                    n_clusters=n_clusters,
                    affinity='nearest_neighbors',
                    n_neighbors=SPECTRAL_N_NEIGHBORS,
                    random_state=42,
                    assign_labels='kmeans',
                    eigen_solver='arpack',
                    n_init=10
                )
            
            # For embeddings, we often don't need standard scaling since they're already normalized
            # But let's try both approaches
            try:
                clustering_start_time = time.time()
                
                if clustering_method.lower() == 'hdbscan':
                    # Use original normalized embeddings for HDBSCAN
                    cluster_labels = clusterer.fit_predict(menu_vectors)
                elif clustering_method.lower() == 'kmeans':
                    # Use original normalized embeddings for KMeans
                    cluster_labels = clusterer.fit_predict(menu_vectors)
                else:
                    # Use standardized vectors for Spectral clustering
                    scaler = StandardScaler()
                    normalized_vectors = scaler.fit_transform(menu_vectors)
                    cluster_labels = clusterer.fit_predict(normalized_vectors)
                
                clustering_end_time = time.time()
                clustering_duration = clustering_end_time - clustering_start_time
                if self.verbose:
                    print(f"   🔧 {clustering_method.upper()} clustering completed in {clustering_duration:.3f}s")
                
                # Log clustering results
                noise_count = len([label for label in cluster_labels if label == -1])
                valid_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
                clustered_items = len([label for label in cluster_labels if label != -1])
                
                if self.verbose:
                    print(f"   📦 Created {valid_clusters} clusters with {clustered_items} items")
                if noise_count > 0:
                    if self.verbose:
                        print(f"   🗑️  Noise/outliers dropped: {noise_count}")
                
                
            except Exception as e:
                if self.verbose:
                    print(f"   ⚠️  {clustering_method.upper()} clustering failed: {e}")
                if self.verbose:
                    print(f"   🔄 Falling back to similarity clustering with larger clusters")
                
                # Use lower threshold for bigger clusters when spectral fails
                if clustering_method.lower() == 'spectral':
                    fallback_threshold = SIMILARITY_THRESHOLD_AGGRESSIVE
                    target_clusters = n_clusters  # Try to match intended cluster count
                else:
                    fallback_threshold = SIMILARITY_THRESHOLD_DEFAULT
                    target_clusters = None
                    
                cluster_labels = self._simple_similarity_clustering(menu_vectors, threshold=fallback_threshold, target_clusters=target_clusters)
            
            # Group menus by cluster
            categorized_menus = {}
            cluster_names = {}
            name_generation_times = []
            
            for i, label in enumerate(cluster_labels):
                if label == -1:  # Noise points in HDBSCAN - skip these items
                    continue
                else:
                    # Generate meaningful cluster names based on menu content
                    if label not in cluster_names:
                        cluster_menus = [valid_menus[j] for j, l in enumerate(cluster_labels) if l == label]
                        
                        name_start_time = time.time()
                        cluster_names[label] = self._generate_cluster_name(cluster_menus)
                        name_end_time = time.time()
                        name_generation_times.append(name_end_time - name_start_time)
                        
                        # Optional: uncomment to show cluster name generation timing
                        # print(f"   🏷️  Generated cluster name '{cluster_names[label]}' for {len(cluster_menus)} items ({name_end_time - name_start_time:.3f}s)")
                    category = cluster_names[label]
                
                if category not in categorized_menus:
                    categorized_menus[category] = []
                categorized_menus[category].append(valid_menus[i])
            
            # Skip menus that couldn't be processed (no automatic "기타" category)
            
            # Final summary
            final_categorized_count = sum(len(menu_list) for menu_list in categorized_menus.values())
            total_dropped = len(menus) - final_categorized_count
            
            if self.verbose:
                print(f"   📋 Final summary:")
            if self.verbose:
                print(f"      ✅ Successfully categorized: {final_categorized_count}")
            if self.verbose:
                print(f"      🗑️  Total dropped: {total_dropped}")
            if self.verbose:
                print(f"      📊 Success rate: {final_categorized_count/len(menus)*100:.1f}%")
            if name_generation_times:
                avg_name_time = sum(name_generation_times) / len(name_generation_times)
                if self.verbose:
                    print(f"      ⏱️  Avg category name generation: {avg_name_time:.3f}s")
            
            if categorized_menus:
                if self.verbose:
                    print(f"      📂 Categories created: {list(categorized_menus.keys())}")
            
            return categorized_menus if categorized_menus else {"General": menus}
            
        except Exception as e:
            if self.verbose:
                print(f"Error in embedding-based categorization: {e}")
            return {"일반": menus}
    
    def _clean_category_name(self, category_name: str) -> str:
        """Clean and validate category name, removing invalid characters"""
        import re
        
        if not category_name:
            return "음식"
        
        # Remove common invalid Unicode characters and replacement characters
        category_name = re.sub(r'[����\ufffd\ufeff]', '', category_name)
        
        # Allow Korean, English, numbers, spaces, and common punctuation
        category_name = re.sub(r'[^\uac00-\ud7ff\u0041-\u005a\u0061-\u007a\u0030-\u0039\u0020&\-/]', '', category_name)
        
        # Clean up multiple spaces
        category_name = re.sub(r'\s+', ' ', category_name).strip()
        
        # If empty after cleaning, return default
        if not category_name:
            return "음식"
        
        return category_name
    
    def _generate_cluster_name(self, cluster_menus: List[Dict]) -> str:
        """Generate meaningful name for a cluster using LangChain"""
        if not cluster_menus or not self.llm:
            return "Food Items"
        
        # Prepare menu items for LangChain
        menu_items = []
        for i, menu in enumerate(cluster_menus[:10]):  # Limit to 10 items for efficiency
            if menu.get('name'):
                menu_items.append(f"{i}: {menu['name']}")
        
        if not menu_items:
            return "음식"
        
        # Create prompt for category naming
        prompt_template = """
        Analyze these Korean food menu items and suggest ONE descriptive Korean category name that best represents this group.
        
        Menu items:
        {menu_list}
        
        Requirements:
        - Answer in UTF-8 encoding
        - Provide ONLY the category name in Korean, no explanations
        - The name must be either main ingredients, cooking methods, taste profiles, cuisine types, or their combination
        - Do not use vague names like "기타", "음식"
        - Keep it concise (no more than 4 words)
        
        Category name:"""
        
        try:
            prompt_template_obj = PromptTemplate(
                input_variables=["menu_list"],
                template=prompt_template
            )
            
            menu_list_str = "\n".join(menu_items)
            formatted_prompt = prompt_template_obj.format(menu_list=menu_list_str)
            
            result = self.llm.invoke(formatted_prompt)
            
            # Extract content from ChatOpenAI response
            if hasattr(result, 'content'):
                category_name = result.content.strip()
            else:
                category_name = str(result).strip()
            
            # Normalize encoding
            category_name = category_name.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
            
            # Clean up the result
            if category_name.startswith('Category name:'):
                category_name = category_name.replace('Category name:', '').strip()
            
            # Remove quotes if present
            category_name = category_name.strip('"\'')
            
            # Clean and validate the category name
            category_name = self._clean_category_name(category_name)
            
            # Validate the category name
            if len(category_name) > 50 or not category_name:
                return "음식"
            
            return category_name
            
        except Exception as e:
            if self.verbose:
                print(f"   ⚠️  Error generating cluster name: {e}")
            return "음식"

    def categorize_menus(self, menus: List[Dict], user_profile: UserProfile = None, method: str = "embedding", clustering_method: str = "spectral") -> Dict[str, List[Dict]]:
        """Wrapper method for menu categorization - supports both LangChain and embedding methods"""
        if method.lower() == "embedding" and user_profile:
            return self.categorize_menus_embedding(menus, user_profile, clustering_method=clustering_method)
        elif method.lower() == "embedding":
            return self.categorize_menus_embedding(menus, clustering_method=clustering_method)
        elif method.lower() == "langchain":
            return self.categorize_menus_langchain(menus)
        else:
            return {"일반": menus}

    def generate_recommendations(self, user_profile: UserProfile,
                               max_distance_km: float = None,
                               categories: List[str] = None,
                               max_menus_to_categorize: int = 30,
                               max_menus_per_category: int = 3,
                               method: str = "embedding",
                               clustering_method: str = "spectral"
                               ) -> Dict[str, Any]:
        """Generate complete recommendations
        
        Args:
            user_profile: User preferences and location
            max_distance_km: Override for maximum search radius (uses UserProfile.max_distance_km if None, defaults to 2.0)
            categories: Restaurant categories to filter by
            max_menus_to_categorize: Maximum number of menus to send to AI for categorization
            max_menus_per_category: Maximum number of menus to display per category
        """
        
        # Use UserProfile's max_distance_km if no override provided, otherwise default to 2.0
        search_distance = max_distance_km if max_distance_km is not None else (user_profile.max_distance_km or 2.0)
        
        # Start total timing
        total_start_time = time.time()
        timing_info = {}
        
        # Find nearby restaurants
        if self.verbose:
            print("Finding nearby restaurants...")
        restaurant_start_time = time.time()
        restaurants = self.find_nearby_restaurants(user_profile, search_distance, categories)
        restaurant_end_time = time.time()
        timing_info['restaurant_search_time'] = restaurant_end_time - restaurant_start_time
        
        if not restaurants:
            return {"message": "No restaurants found matching criteria"}
        
        if self.verbose:
            print(f"Found {len(restaurants)} restaurants (took {timing_info['restaurant_search_time']:.2f}s)")
        
        # Get menus for these restaurants
        menu_fetch_start_time = time.time()
        restaurant_ids = [r['id'] for r in restaurants]
        restaurant_menus = self.get_restaurant_menus(restaurant_ids)
        menu_fetch_end_time = time.time()
        timing_info['menu_fetch_time'] = menu_fetch_end_time - menu_fetch_start_time
        
        # Collect all menus
        all_menus = []
        for menus in restaurant_menus.values():
            all_menus.extend(menus)
        
        if self.verbose:
            print(f"Found {len(all_menus)} total menus (took {timing_info['menu_fetch_time']:.2f}s)")
        
        # Categorize menus using LangChain
        if self.verbose:
            print("Categorizing menus...")
        categorization_start_time = time.time()
        menus_to_categorize = min(len(all_menus), max_menus_to_categorize)
        if self.verbose:
            print(f"Processing {menus_to_categorize} menus for categorization (limit: {max_menus_to_categorize})")
        categorized_menus = self.categorize_menus(all_menus[:menus_to_categorize], user_profile, method=method, clustering_method=clustering_method)
        categorization_end_time = time.time()
        timing_info['categorization_time'] = categorization_end_time - categorization_start_time
        
        if self.verbose:
            print(f"Menu categorization completed (took {timing_info['categorization_time']:.2f}s)")
        
        # Generate final recommendations
        recommendation_build_start_time = time.time()
        recommendations = {}
        
        for category, menus in categorized_menus.items():
            if not menus:
                continue
            
            # Calculate category embedding center (centroid)
            valid_embeddings = []
            for menu in menus:
                embedding = menu.get('embedding_vector')
                if embedding and len(embedding) > 0:
                    valid_embeddings.append(np.array(embedding))
            
            category_center = None
            if valid_embeddings:
                category_center = np.mean(valid_embeddings, axis=0)
            
            # Sort menus by the new criteria:
            # 1. Menus with images come first
            # 2. Then by distance to embedding center (closest to center first)
            def menu_sort_key(menu):
                # Check if menu has images (images is a text array)
                has_images = bool(menu.get('images') and len(menu.get('images', [])) > 0)
                
                # Calculate distance to category embedding center
                embedding_distance = 999999  # Default high value
                if category_center is not None:
                    menu_embedding = menu.get('embedding_vector')
                    if menu_embedding and len(menu_embedding) > 0:
                        menu_vector = np.array(menu_embedding)
                        # Use cosine distance (1 - cosine similarity)
                        dot_product = np.dot(menu_vector, category_center)
                        norm_product = np.linalg.norm(menu_vector) * np.linalg.norm(category_center)
                        if norm_product > 0:
                            cosine_similarity = dot_product / norm_product
                            embedding_distance = 1 - cosine_similarity  # Lower is better (closer to center)
                
                # Return tuple: (not has_images, embedding_distance)
                # not has_images means: False (0) for menus with images, True (1) for menus without
                # This ensures menus with images come first, then by closeness to embedding center
                return (not has_images, embedding_distance)
            
            # Sort and limit menus
            sorted_menus = sorted(menus, key=menu_sort_key)
            menus_to_show = min(len(sorted_menus), max_menus_per_category)
            top_menus = sorted_menus[:menus_to_show]
            
            # Calculate final embedding distances for display
            menu_data = []
            for menu in top_menus:
                embedding_distance_to_center = None
                if category_center is not None:
                    menu_embedding = menu.get('embedding_vector')
                    if menu_embedding and len(menu_embedding) > 0:
                        menu_vector = np.array(menu_embedding)
                        dot_product = np.dot(menu_vector, category_center)
                        norm_product = np.linalg.norm(menu_vector) * np.linalg.norm(category_center)
                        if norm_product > 0:
                            cosine_similarity = dot_product / norm_product
                            embedding_distance_to_center = 1 - cosine_similarity
                
                menu_data.append({
                    "name": menu['name'],
                    "restaurant": menu['restaurant_name'],
                    "price": menu['price'],
                    "images": menu.get('images', []) or [],  # Include image URLs
                    "embedding_distance_to_center": embedding_distance_to_center
                })
            
            # Generate reason
            reason = self._generate_category_reason(category, user_profile)
            
            recommendations[category] = {
                "reason": reason,
                "menus": menu_data
            }
        
        recommendation_build_end_time = time.time()
        timing_info['recommendation_build_time'] = recommendation_build_end_time - recommendation_build_start_time
        
        # Calculate total time
        total_end_time = time.time()
        timing_info['total_time'] = total_end_time - total_start_time
        
        # Print timing summary
        if self.verbose:
            print(f"\n⏱️  PERFORMANCE SUMMARY:")
        if self.verbose:
            print(f"   🔍 Restaurant search: {timing_info['restaurant_search_time']:.2f}s")
        if self.verbose:
            print(f"   📋 Menu fetch: {timing_info['menu_fetch_time']:.2f}s")
        if self.verbose:
            print(f"   🤖 AI categorization: {timing_info['categorization_time']:.2f}s")
        if self.verbose:
            print(f"   📊 Recommendation build: {timing_info['recommendation_build_time']:.2f}s")
        if self.verbose:
            print(f"   ⏰ Total time: {timing_info['total_time']:.2f}s")
        
        return {
            "user_location": user_profile.location,
            "search_radius_km": search_distance,
            "total_restaurants": len(restaurants),
            "total_menus_found": len(all_menus),
            "recommendations": recommendations,
            "timing_info": timing_info
        }
    
    def _generate_category_reason(self, category: str, user_profile: UserProfile) -> str:
        """Generate explanation for category recommendation"""
        reasons = []
        
        if user_profile.cuisine_preferences:
            matching_cuisines = [c for c in user_profile.cuisine_preferences if c.lower() in category.lower()]
            if matching_cuisines:
                reasons.append(f"matches your {', '.join(matching_cuisines)} preference")
        
        if not reasons:
            return f"Popular {category.lower()} items in your area"
        
        return f"Recommended because it {' and '.join(reasons)}"
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()