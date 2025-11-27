"""
Embedding functionality for restaurant and menu recommendation system.

This module provides:
1. Database schema updates to add meaningful_name and inferred_menu columns to restaurants
2. LangChain integration with GPT-4o-mini for restaurant name analysis
3. HuggingFace BM-K/KoSimCSE-roberta embedding generation for menus
4. Vector storage in PostgreSQL database

Author: Claude Code
Date: 2024-10-29
"""

import os
import json
import logging
import argparse
import time
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from multiprocessing import Pool, cpu_count
from functools import partial

import psycopg2
from psycopg2.extras import RealDictCursor
from transformers import AutoTokenizer, AutoModel
import torch
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
load_dotenv()

# Disable tokenizers parallelism to avoid fork warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress httpx logs from OpenAI API calls
logging.getLogger("httpx").setLevel(logging.WARNING)

# Helper functions for multiprocessing
def update_menu_embedding_worker(menu_embedding_pair, config):
    """Worker function for updating menu embeddings in parallel"""
    menu_id, embedding = menu_embedding_pair
    
    # Retry logic for database connections
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            connection = psycopg2.connect(
                host=config.db_host,
                port=config.db_port,
                database=config.db_name,
                user=config.db_user,
                password=config.db_password,
                connect_timeout=10
            )
            
            with connection.cursor() as cursor:
                query = "UPDATE db_menus SET embedding_vector = %s::REAL[] WHERE id = %s"
                cursor.execute(query, (embedding, menu_id))
                connection.commit()
                
            connection.close()
            return True
            
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Attempt {attempt + 1} failed for menu {menu_id}: {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"Failed to update menu {menu_id} after {max_retries} attempts: {e}")
                return False

def update_restaurant_embedding_worker(restaurant_embedding_pair, config):
    """Worker function for updating restaurant embeddings in parallel"""
    restaurant_id, embedding = restaurant_embedding_pair
    
    # Retry logic for database connections
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            connection = psycopg2.connect(
                host=config.db_host,
                port=config.db_port,
                database=config.db_name,
                user=config.db_user,
                password=config.db_password,
                connect_timeout=10
            )
            
            with connection.cursor() as cursor:
                query = "UPDATE db_restaurants SET embedding_vector = %s::REAL[] WHERE id = %s"
                cursor.execute(query, (embedding, restaurant_id))
                connection.commit()
                
            connection.close()
            return True
            
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Attempt {attempt + 1} failed for restaurant {restaurant_id}: {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"Failed to update restaurant {restaurant_id} after {max_retries} attempts: {e}")
                return False

@dataclass
class EmbeddingConfig:
    """Configuration for embedding operations"""
    # Database configuration
    db_host: str = os.getenv('DB_HOST', 'localhost')
    db_port: str = os.getenv('DB_PORT', '5432')
    db_name: str = os.getenv('DB_NAME', 'foodigram')
    db_user: str = os.getenv('DB_USER', 'postgres')
    db_password: str = os.getenv('DB_PASSWORD', 'postgres')
    
    # OpenAI configuration
    openai_api_key: str = os.getenv('OPENAI_API_KEY', '')
    openai_model: str = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    
    # HuggingFace model configuration
    embedding_model_name: str = os.getenv('EMBEDDING_MODEL_NAME', 'BM-K/KoSimCSE-roberta')
    max_length: int = int(os.getenv('EMBEDDING_MAX_LENGTH', '512'))
    batch_size: int = int(os.getenv('EMBEDDING_BATCH_SIZE', '32'))
    device: str = "cuda" if torch.cuda.is_available() else "cpu"


class DatabaseManager:
    """Handles database operations for embedding functionality"""
    
    def __init__(self, config: EmbeddingConfig):
        self.config = config
        self.connection = None
        
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = psycopg2.connect(
                host=self.config.db_host,
                port=self.config.db_port,
                database=self.config.db_name,
                user=self.config.db_user,
                password=self.config.db_password,
                cursor_factory=RealDictCursor
            )
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
            
    def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")
            
    def execute_query(self, query: str, params: Optional[Tuple] = None, fetch: bool = False):
        """Execute SQL query"""
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(query, params)
                if fetch:
                    return cursor.fetchall()
                self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            logger.error(f"Query execution failed: {e}")
            raise
            
        
    def get_restaurants(self) -> List[Dict]:
        """Fetch all restaurants from database"""
        query = "SELECT id, name, meaningful_name, inferred_menu, category_normalized, embedding_vector FROM db_restaurants"
        return self.execute_query(query, fetch=True)
        
    def get_menus(self) -> List[Dict]:
        """Fetch all menus with restaurant information"""
        query = """
        SELECT 
            m.id,
            m.name as menu_name,
            m.name_clean,
            m.restaurant_id,
            r.name as restaurant_name,
            r.meaningful_name,
            r.inferred_menu,
            m.embedding_vector
        FROM db_menus m
        JOIN db_restaurants r ON r.id = m.restaurant_id
        """
        return self.execute_query(query, fetch=True)
        
    def update_restaurant_analysis(self, restaurant_id: str, meaningful_name: bool, inferred_menu: str):
        """Update restaurant with meaningful_name and inferred_menu analysis"""
        query = """
        UPDATE db_restaurants 
        SET meaningful_name = %s, inferred_menu = %s
        WHERE id = %s
        """
        self.execute_query(query, (meaningful_name, inferred_menu, restaurant_id))
    
    def batch_update_restaurant_analysis(self, batch_results: List[Tuple[bool, str, str]]):
        """Batch update restaurants with meaningful_name and inferred_menu analysis"""
        try:
            with self.connection.cursor() as cursor:
                query = """
                UPDATE db_restaurants 
                SET meaningful_name = %s, inferred_menu = %s
                WHERE id = %s
                """
                # Debug: check first few entries
                if batch_results:
                    logger.info(f"Sample batch entry: {batch_results[0]}")
                
                cursor.executemany(query, batch_results)
                self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            logger.error(f"Batch update failed: {e}")
            # Debug: show problematic data
            if batch_results:
                logger.error(f"First batch entry causing error: {batch_results[0]}")
            raise
        
    def update_menu_embedding(self, menu_id: str, embedding_vector: List[float]):
        """Update menu with embedding vector"""
        try:
            # Convert to proper PostgreSQL array format
            query = """
            UPDATE db_menus 
            SET embedding_vector = %s::REAL[]
            WHERE id = %s
            """
            self.execute_query(query, (embedding_vector, menu_id))
        except Exception as e:
            logger.error(f"Failed to update menu {menu_id} with embedding: {e}")
            raise
    
    def update_restaurant_embedding(self, restaurant_id: str, embedding_vector: List[float]):
        """Update restaurant with embedding vector"""
        try:
            # Convert to proper PostgreSQL array format
            query = """
            UPDATE db_restaurants 
            SET embedding_vector = %s::REAL[]
            WHERE id = %s
            """
            self.execute_query(query, (embedding_vector, restaurant_id))
        except Exception as e:
            logger.error(f"Failed to update restaurant {restaurant_id} with embedding: {e}")
            raise


class RestaurantNameAnalyzer:
    """Analyzes restaurant names using GPT-4o-mini to determine menu relevance"""
    
    def __init__(self, config: EmbeddingConfig):
        self.config = config
        self.llm = ChatOpenAI(
            model=config.openai_model,
            api_key=config.openai_api_key,
            temperature=0.1
        )
        
    def analyze_restaurant_name(self, restaurant_name: str) -> Tuple[bool, str]:
        """
        Analyze if restaurant name contains meaningful menu information
        
        Returns:
            Tuple[bool, str]: (meaningful_name, inferred_menu)
        """
        system_prompt = """You are a Korean restaurant name analyzer. Your task is to determine if a restaurant name contains specific menu information and extract it.

Guidelines:
1. If the restaurant name includes specific cuisine or food name, it's "meaningful"
2. If the restaurant name includes food name, extract that specific food name
3. If two or more food names are present, split them with commas

Examples:
- "기사식당" -> meaningful=False, inferred_menu=""
- "김밥천국" -> meaningful=True, inferred_menu="김밥"
- "일식전문점 스시마이우" -> meaningful=True, inferred_menu="스시"
- "카페베네" -> meaningful=True, inferred_menu=""
- "족발보쌈 전문점" -> meaningful=True, inferred_menu="족발,보쌈"

Respond in JSON format: {"meaningful": true/false, "inferred_menu": "extracted menu or empty string"}
"""
        
        human_prompt = f"Analyze this restaurant name: '{restaurant_name}'"
        
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ]
            
            response = self.llm.invoke(messages)
            # logger.debug(f"LLM response for '{restaurant_name}': {response.content}")
            
            result = json.loads(response.content)
            meaningful = result.get('meaningful', False)
            inferred_menu = result.get('inferred_menu', '')
            
            # logger.debug(f"Parsed result for '{restaurant_name}': meaningful={meaningful}, inferred_menu='{inferred_menu}'")
            return meaningful, inferred_menu
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for restaurant '{restaurant_name}': {e}. Response: {response.content}")
            return False, ''
        except Exception as e:
            logger.error(f"Failed to analyze restaurant name '{restaurant_name}': {e}")
            return False, ''


class MenuEmbeddingGenerator:
    """Generates embeddings for menu items using BM-K/KoSimCSE-roberta"""
    
    def __init__(self, config: EmbeddingConfig):
        self.config = config
        self.tokenizer = None
        self.model = None
        self.dimension = None
        
    def load_model(self):
        """Load the embedding model"""
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.config.embedding_model_name)
            self.model = AutoModel.from_pretrained(self.config.embedding_model_name)
            self.model.to(self.config.device)
            self.model.eval()
            
            # Get model dimension by running a test inference
            test_input = self.tokenizer("test", return_tensors="pt", padding=True, truncation=True)
            test_input = {k: v.to(self.config.device) for k, v in test_input.items()}
            with torch.no_grad():
                test_output = self.model(**test_input)
                self.dimension = test_output.last_hidden_state.mean(dim=1).shape[1]
            
            logger.info(f"Loaded embedding model {self.config.embedding_model_name} with dimension {self.dimension}")
            
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
            
    def create_menu_text(self, name_clean: str) -> str:
        """
        Create text for embedding based on name_clean only
        """
        return name_clean or ""
    
    def create_restaurant_text(self, category_normalized: str, inferred_menu: str) -> str:
        """
        Create text for restaurant embedding based on category_normalized>inferred_menu
        """
        if category_normalized and inferred_menu:
            return f"{category_normalized}>{inferred_menu}"
        elif category_normalized:
            return category_normalized
        elif inferred_menu:
            return inferred_menu
        else:
            return ""
            
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts"""
        embeddings = []
        
        for i in tqdm(range(0, len(texts), self.config.batch_size), desc="Generating embeddings"):
            batch_texts = texts[i:i + self.config.batch_size]
            
            # Tokenize batch
            inputs = self.tokenizer(
                batch_texts, 
                return_tensors="pt", 
                padding=True, 
                truncation=True, 
                max_length=self.config.max_length
            )
            inputs = {k: v.to(self.config.device) for k, v in inputs.items()}
            
            # Generate embeddings
            with torch.no_grad():
                outputs = self.model(**inputs)
                # Use mean pooling of last hidden state
                batch_embeddings = outputs.last_hidden_state.mean(dim=1)
                batch_embeddings = torch.nn.functional.normalize(batch_embeddings, p=2, dim=1)
                
            embeddings.extend(batch_embeddings.cpu().numpy().tolist())
            
        return embeddings


class EmbeddingPipeline:
    """Main pipeline for processing restaurant and menu embeddings"""
    
    def __init__(self, config: EmbeddingConfig = None):
        self.config = config or EmbeddingConfig()
        self.db_manager = DatabaseManager(self.config)
        self.name_analyzer = RestaurantNameAnalyzer(self.config)
        self.embedding_generator = MenuEmbeddingGenerator(self.config)
        
    def setup_database_schema(self):
        """Setup database connection and load embedding model"""
        logger.info("Setting up database connection and loading model...")
        self.db_manager.connect()
        
        # Load embedding model
        self.embedding_generator.load_model()
        
        logger.info("Database connection and model loading completed")
        
    def analyze_restaurant_names(self, force_reanalysis: bool = False, batch_size: int = 100):
        """Analyze all restaurant names for meaningful menu information"""
        logger.info("Analyzing restaurant names...")
        
        restaurants = self.db_manager.get_restaurants()
        
        # Filter restaurants that need analysis
        restaurants_to_analyze = []
        for restaurant in restaurants:
            if force_reanalysis or restaurant['meaningful_name'] is None:
                restaurants_to_analyze.append(restaurant)
        
        if not restaurants_to_analyze:
            logger.info("No restaurants need analysis")
            return
            
        # TEMPORARY: Limit to first 100 entries for testing
        #restaurants_to_analyze = restaurants_to_analyze[:100]
        
        use_batch = True  # Switch batch processing on/off
        
        if use_batch:
            logger.info(f"Analyzing {len(restaurants_to_analyze)} restaurants in batches of {batch_size}")
            # Process in batches
            for i in tqdm(range(0, len(restaurants_to_analyze), batch_size), desc="Processing batches"):
                batch = restaurants_to_analyze[i:i + batch_size]
                
                # Analyze batch
                batch_results = []
                for restaurant in batch:
                    try:
                        meaningful, inferred_menu = self.name_analyzer.analyze_restaurant_name(restaurant['name'])
                        batch_results.append((meaningful, inferred_menu, restaurant['id']))
                    except Exception as e:
                        logger.error(f"Failed to analyze restaurant '{restaurant['name']}' (ID: {restaurant['id']}): {e}")
                        # Add default values for failed analysis
                        batch_results.append((False, '', restaurant['id']))
                
                # Update database in batch
                self.db_manager.batch_update_restaurant_analysis(batch_results)
        else:
            logger.info(f"Analyzing {len(restaurants_to_analyze)} restaurants individually")
            # Process individually
            for restaurant in tqdm(restaurants_to_analyze, desc="Analyzing restaurants"):
                try:
                    meaningful, inferred_menu = self.name_analyzer.analyze_restaurant_name(restaurant['name'])
                    self.db_manager.update_restaurant_analysis(restaurant['id'], meaningful, inferred_menu)
                    
                    # TEMPORARY: Print results to terminal
                    print(f"Restaurant: {restaurant['name']}")
                    print(f"Meaningful: {meaningful}")
                    print(f"Inferred Menu: {inferred_menu}")
                    print("-" * 50)
                    
                except Exception as e:
                    logger.error(f"Failed to analyze restaurant '{restaurant['name']}' (ID: {restaurant['id']}): {e}")
                    # Update with default values for failed analysis
                    self.db_manager.update_restaurant_analysis(restaurant['id'], False, '')
            
        logger.info("Restaurant name analysis completed")
        
    def generate_menu_embeddings(self, force_regeneration: bool = False):
        """Generate embeddings for all menu items"""
        logger.info("Generating menu embeddings...")
        
        menus = self.db_manager.get_menus()
        
        # Filter menus that don't have embeddings yet (unless force_regeneration is True)
        if force_regeneration:
            menus_to_process = menus
        else:
            menus_to_process = [m for m in menus if not m['embedding_vector']]
        
        if not menus_to_process:
            logger.info("All menus already have embeddings")
            return
            
        # Create texts for embedding
        texts = []
        for menu in menus_to_process:
            text = self.embedding_generator.create_menu_text(menu['name_clean'])
            texts.append(text)
            
        # Generate embeddings
        embeddings = self.embedding_generator.generate_embeddings(texts)
        
        # Update database using multiprocessing
        logger.info("Updating menu embeddings in database...")
        menu_embedding_pairs = [(menu['id'], embedding) for menu, embedding in zip(menus_to_process, embeddings)]
        
        # Use multiprocessing for database updates
        num_workers = min(cpu_count(), 4)  # Limit to 4 workers to avoid overwhelming DB
        update_func = partial(update_menu_embedding_worker, config=self.config)
        
        with Pool(processes=num_workers) as pool:
            results = list(tqdm(
                pool.imap(update_func, menu_embedding_pairs),
                desc="Updating menu embeddings",
                total=len(menu_embedding_pairs)
            ))
        
        successful_updates = sum(results)
        logger.info(f"Successfully updated {successful_updates}/{len(menus_to_process)} menu embeddings")
        
    def generate_restaurant_embeddings(self, force_regeneration: bool = False):
        """Generate embeddings for all restaurants"""
        logger.info("Generating restaurant embeddings...")
        
        restaurants = self.db_manager.get_restaurants()
        
        # Filter restaurants that don't have embeddings yet (unless force_regeneration is True)
        if force_regeneration:
            restaurants_to_process = restaurants
        else:
            restaurants_to_process = [r for r in restaurants if not r['embedding_vector']]
        
        if not restaurants_to_process:
            logger.info("All restaurants already have embeddings")
            return
            
        # Create texts for embedding
        texts = []
        for restaurant in restaurants_to_process:
            text = self.embedding_generator.create_restaurant_text(
                restaurant['category_normalized'] or '',
                restaurant['inferred_menu'] or ''
            )
            texts.append(text)
            
        # Generate embeddings
        embeddings = self.embedding_generator.generate_embeddings(texts)
        
        # Update database using multiprocessing
        logger.info("Updating restaurant embeddings in database...")
        restaurant_embedding_pairs = [(restaurant['id'], embedding) for restaurant, embedding in zip(restaurants_to_process, embeddings)]
        
        # Use multiprocessing for database updates
        num_workers = min(cpu_count(), 4)  # Limit to 4 workers to avoid overwhelming DB
        update_func = partial(update_restaurant_embedding_worker, config=self.config)
        
        with Pool(processes=num_workers) as pool:
            results = list(tqdm(
                pool.imap(update_func, restaurant_embedding_pairs),
                desc="Updating restaurant embeddings",
                total=len(restaurant_embedding_pairs)
            ))
        
        successful_updates = sum(results)
        logger.info(f"Successfully updated {successful_updates}/{len(restaurants_to_process)} restaurant embeddings")
        
    def run_full_pipeline(self, force_meaningful_reanalysis: bool = False, force_menu_embeddings: bool = False, force_restaurant_embeddings: bool = False):
        """Run the complete embedding pipeline"""
        try:
            logger.info("Starting embedding pipeline...")
            
            # Setup database schema
            self.setup_database_schema()
            
            # Analyze restaurant names
            self.analyze_restaurant_names(force_reanalysis=force_meaningful_reanalysis)
            
            # Generate menu embeddings
            self.generate_menu_embeddings(force_regeneration=force_menu_embeddings)
            
            # Generate restaurant embeddings
            self.generate_restaurant_embeddings(force_regeneration=force_restaurant_embeddings)
            
            logger.info("Embedding pipeline completed successfully")
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            raise
        finally:
            self.db_manager.disconnect()
    
    def run_meaningful_analysis_only(self):
        """Run only the meaningful name analysis"""
        try:
            logger.info("Starting meaningful name analysis...")
            
            # Setup database connection
            self.db_manager.connect()
            
            # Analyze restaurant names (force reanalysis)
            self.analyze_restaurant_names(force_reanalysis=True)
            
            logger.info("Meaningful name analysis completed successfully")
            
        except Exception as e:
            logger.error(f"Meaningful analysis failed: {e}")
            raise
        finally:
            self.db_manager.disconnect()


def main():
    """Main function to run the embedding pipeline"""
    parser = argparse.ArgumentParser(description="Restaurant and menu embedding pipeline")
    parser.add_argument("--meaningful", action="store_true", 
                       help="Force re-evaluation of meaningful restaurant names only")
    parser.add_argument("--force-meaningful", action="store_true",
                       help="Force re-evaluation of meaningful names in full pipeline")
    parser.add_argument("--menu-embedding", action="store_true",
                       help="Force re-generation of menu embeddings despite existing values")
    parser.add_argument("--restaurant-embedding", action="store_true",
                       help="Force re-generation of restaurant embeddings despite existing values")
    
    args = parser.parse_args()
    
    config = EmbeddingConfig()
    pipeline = EmbeddingPipeline(config)
    
    if args.meaningful:
        pipeline.run_meaningful_analysis_only()
    else:
        pipeline.run_full_pipeline(
            force_meaningful_reanalysis=args.force_meaningful,
            force_menu_embeddings=args.menu_embedding,
            force_restaurant_embeddings=args.restaurant_embedding
        )


if __name__ == "__main__":
    main()