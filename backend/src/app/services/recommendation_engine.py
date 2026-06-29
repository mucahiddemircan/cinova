import os
os.environ["HF_HUB_OFFLINE"] = "1"

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import logging

class RecommendationEngine:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RecommendationEngine, cls).__new__(cls)
            cls._instance._load_model()
        return cls._instance

    def _load_model(self):
        try:
            logging.info("Loading ML Model: all-MiniLM-L6-v2...")
            # This process will download the model (~80MB) on first run
            self._model = SentenceTransformer('all-MiniLM-L6-v2')
            logging.info("ML Model loaded successfully.")
        except Exception as e:
            logging.error(f"Failed to load ML Model: {e}")
            self._model = None

    def get_embedding(self, text: str):
        """Converts a single text to a vector."""
        if self._model is None or not text:
            return None
        return self._model.encode(text)

    def get_embeddings(self, texts: list[str]):
        """Converts multiple texts to vectors in parallel."""
        if self._model is None or not texts:
            return []
        return self._model.encode(texts)

    def calculate_user_profile_vector(self, descriptions: list[str]):
        """Generates user profile vector by averaging liked movie summaries."""
        if not descriptions:
            return None
        
        embeddings = self.get_embeddings(descriptions)
        if len(embeddings) == 0:
            return None
            
        return np.mean(embeddings, axis=0)

    def rerank(self, user_profile_vector, candidates: list[dict], top_n: int = 15):
        """Reranks candidate list based on cosine similarity with the user profile vector."""
        if self._model is None or user_profile_vector is None or not candidates:
            return candidates[:top_n]

        # Extract summaries (overview or description fields are checked)
        descriptions = [c.get("overview") or c.get("description") or "" for c in candidates]
        
        candidate_embeddings = self.get_embeddings(descriptions)
        
        # Convert user profile to 2D matrix (required for cosine_similarity)
        user_profile_vector_2d = user_profile_vector.reshape(1, -1)
        
        # Calculate cosine similarity scores
        similarities = cosine_similarity(user_profile_vector_2d, candidate_embeddings)[0]
        
        for i, candidate in enumerate(candidates):
            candidate["_ml_score"] = float(similarities[i])
        
        ranked_candidates = sorted(candidates, key=lambda x: x.get("_ml_score", 0), reverse=True)
        
        # Clean up _ml_score field (to send clean data to frontend)
        for rc in ranked_candidates:
            rc.pop("_ml_score", None)
            
        return ranked_candidates[:top_n]

engine = RecommendationEngine()

