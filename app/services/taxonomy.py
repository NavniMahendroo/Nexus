import re
from typing import Optional

TAXONOMY_KEYWORDS = {
    "water": ["water", "drink", "h2o", "hydration", "well", "thirst", "bottle", "aqueduct"],
    "medical": ["medical", "doctor", "nurse", "medicine", "pill", "wound", "injured", "injury", "sick", "hospital", "clinic", "health", "first aid", "bandage", "treatment"],
    "shelter": ["shelter", "house", "tent", "roof", "sleep", "bed", "housing", "blanket", "building", "home", "accommodation"],
    "food": ["food", "eat", "meal", "rice", "bread", "grocery", "groceries", "nutrition", "starving", "starve", "hunger", "hungry", "kitchen", "ration", "canned"]
}

def normalize_category(raw_category: str, description: Optional[str] = None) -> str:
    """
    Normalize free-text category input into a fixed taxonomy ('water', 'medical', 'shelter', 'food', or 'other').
    Uses keyword matching in the raw_category first, and falls back to searching in the description.
    """
    text_to_search = (raw_category or "").lower()
    
    # Check raw_category first
    for category, keywords in TAXONOMY_KEYWORDS.items():
        for keyword in keywords:
            if re.search(r'\b' + re.escape(keyword) + r'\b', text_to_search):
                return category

    # Check description as fallback if no category matched
    if description:
        desc_search = description.lower()
        for category, keywords in TAXONOMY_KEYWORDS.items():
            for keyword in keywords:
                if re.search(r'\b' + re.escape(keyword) + r'\b', desc_search):
                    return category

    return "other"
