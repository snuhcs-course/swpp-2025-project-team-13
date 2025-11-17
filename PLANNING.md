# Food Recommendation System — Detailed Technical TODO (for Claude)

# 1. Reinforcement Learning for Coefficient Calibration

## 1.1. Define the RL Environment

* **State Representation**

  * User embedding (combined taste, scrap history, image vectors)
  * Menu embeddings
  * Temporal features (time bucket, day of week bucket)
  * Query context embedding (if present)
  * Exploration level (λ): convert to softmax temperature
  * Penalty summary (allergy, disliked ingredients)

* **Action Space**

  * Option A (recommended): output a **weight vector (w1..w7)** for scoring function
  * Option B: directly output a **ranked list** (more complex)

* **Reward Function** `r`

  * scrap/bookmark: `+1.0`
  * expand/open detail page: `+0.5`
  * swipe to hide: `-1.0`
  * no interaction (bounce): `-0.5`
  * negative allergy reaction: `-2.0`
  * time decay factor: apply exponential decay over 7 days

---

## 1.2. Implement Reward Logging Infrastructure

### DB Schema: `user_interactions`

* `id` (pk)
* `user_id`
* `menu_id`
* `interaction_type` (scrap, click, hide, expand, open)
* `reward_value`
* `timestamp`
* `context_query_id` (nullable)

### Additional Tables

* `rl_weight_history`

  * stores weight vectors per user per update cycle

---

## 1.3. RL Algorithm

### Option A — Contextual Bandit (LinUCB)

* Maintain parameter vector θ per user
* Compute: `score = θᵀ * features`
* Update using online ridge regression

### Option B — Thompson Sampling

* Maintain Beta or Gaussian posterior for each weight
* Sample and update after each reward

### Option C — Policy Gradient (advanced)

* Define policy network `π(s) → w`
* Train with REINFORCE using reward estimates

---

## 1.4. RL Update Schedule

* **Real-time mini-updates**: after each scrap event
* **Nightly batch training**: for stable distribution updates
* **Cold Start Handling**

  * Use population-average weights until 10+ interactions

---

# 2. Unifying and Interconnecting User Data

## 2.1. Create Unified Embedding Representations

### Menu Embedding Pipeline

* `KoSimCSE(text)` → 512-d
* `CLIP(image)` → 512-d
* Category embedding (existing) → 300-d
* Ingredient/keyword embedding → averaged 300-d
* **Final menu vector** = concatenate + feed through 2-layer dense → output 512 dims

### User Embedding Pipeline

* Weighted sum of:

  * uploaded image embeddings
  * scrap target embeddings
  * taste preference vector (scaled)
  * categorical cuisine preferences
  * context embedding (if present)
* Apply normalization + dropout-based noise stability

---

## 2.2. Build a User-Food Knowledge Graph

### Nodes

* Menus
* Categories
* Ingredients
* User-uploaded images
* Taste attributes (spicy, sweet, salty…)
* Contextual tags

### Edges

* `liked_by`
* `similar_to`
* `belongs_to_category`
* `shares_ingredient_with`
* `has_taste_alignment`

### Storage

* PostgreSQL JSONB OR
* Neo4j (long-term scalable)

---

## 2.3. Integrate Temporal

### Temporal Features

* Bucket timestamps into:

  * breakfast (6–10)
  * lunch (11–15)
  * dinner (17–22)
  * late-night (22–3)
* Weekly cycle:

  * friday night/weekend preference shifts

---

## 2.4. Update User Model Schema

### Extend `users` table

* `user_embedding: float[512]`
* `taste_vector: float[5]`
* `allergy_list: text[]`
* `category_preference_vector: float[]`
* `temporal_profile_vector: float[32]`
* `exploration_level: int`
* `rl_weight_vector: float[7]`

---

# 3. Daily Context NLP Integration

## 3.1. Accept Natural Language Queries

### Example inputs:

* "매운건 말고 뜨끈한 국물"
* "가볍게 먹을 수 있는 일본식 면"
* "야근하고 힘든데 든든한 국밥"

---

## 3.2. Extract Structured Intent with gpt-4o-mini

### Extracted JSON fields:

```json
{
  "preferred_tastes": ["hot", "umami"],
  "avoid_tastes": ["spicy"],
  "categories": ["soup", "japanese"],
  "texture": ["light", "warm"],
  "constraints": {
    "distance": "near",
    "price": "cheap"
  }
}
```

### Implementation Notes

* Use a strict JSON schema to guarantee predictable structure
* Maintain fallback defaults if GPT fails

---

## 3.3. Generate Context Embedding

* `context_embedding = embedding_model(query_text)`
* Normalize and fuse with user embedding:

```
final_query_user_embedding =
    0.7 * user_embedding +
    0.3 * context_embedding
```

---

## 3.4. Merge Context Signals Into Recommendation

* Boost categories matching extracted intents
* Penalize contradictory tastes or ingredients
* Modify distance weight if "nearby" is explicitly requested

---

# 4. Recommendation Explanations (OpenAI gpt-4o-mini)

## 4.1. Construct Reason Feature Vector

For each candidate menu, calculate:

* `semantic_similarity`
* `image_similarity`
* `category_match_score`
* `taste_alignment`
* `query_alignment`
* `temporal_fit_score`
* `distance_score`
* `popularity_score`
* `penalties`

Store in `menu_reason_features` table.

---

## 4.2. Feed Reason Features to GPT

### Prompt Template

```
You are generating a friendly Korean explanation for why a food menu is recommended.

Features:
{text}
User Query:
{query}
Taste Profile:
{taste_info}

Write ONE short sentence in Korean.
```

### Example Output

> "뜨끈한 국물과 감칠맛이 좋아 추천해요."

---

# 5. Scoring Pipeline Redesign

## 5.1. New Final Score Formula

```
Final Score =
  w1 * text_similarity +
  w2 * popularity +
  w3 * distance +
  w4 * price +
  w5 * freshness +
  w6 * query_similarity +
  w7 * taste_alignment
  - penalty
```

Weights `w1..w7` are RL-driven.

---

## 5.2. Add Query Similarity Metric

* Compute cosine similarity between context embedding and menu embedding.

---

# 6. Backend & API TODO

## 6.1. New Endpoints

* `/recommendations?context=...`
* `/user/interactions` (log rewards)
* `/explanations/{menu_id}`
* `/user/update_embeddings`
* `/rl/update`

---

## 6.2. Batch Processes

* nightly embedding refresh
* nightly RL coefficient updates
* garbage collection for old interactions

---

# 7. Evaluation & A/B Testing

## 7.1. Metrics

* CTR
* Scrap rate
* Session length
* Time-to-first-interaction
* User retention

## 7.2. A/B Tests

* RL vs static weighting
* With vs without context-aware query
* Embedding fusion strategies

---

# 8. Deployment Roadmap

## Phase 1 — Infrastructure

* user_interactions table
* reward logging
* RL basic loop
* unified embeddings

## Phase 2 — Context Integration

* query intake UI
* NLP parsing pipeline
* context embedding

## Phase 3 — Explanations

* reason_feature storage
* GPT generation

## Phase 4 — Optimization

* caching layer
* weight stabilization

---

This .md file is now a comprehensive reference for implementing your next-generation recommendation engine.
