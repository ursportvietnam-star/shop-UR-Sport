"""
Ingest product seed data into a local Chroma collection with SentenceTransformers embeddings.
Usage (PowerShell):
    .venv\Scripts\Activate.ps1
    pip install -r scripts\requirements.txt
    python scripts\ingest_embeddings.py

This creates a Chroma DB at ./chroma_db/ and stores product passages.
"""
import json
from sentence_transformers import SentenceTransformer
import chromadb
import os

SEED_FILE = os.path.join(os.path.dirname(__file__), "products_seed.json")
PERSIST_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_db")

def load_products():
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def split_into_passages(product):
    # Simple: name + description + features as one passage. Could be split further.
    parts = []
    text = f"{product['name']}\n\n{product.get('description','')}"
    if product.get('features'):
        text += "\n\nFeatures: " + ", ".join(product['features'])
    parts.append(text)
    return parts


def main():
    products = load_products()
    print(f"Loaded {len(products)} products from seed")

    model = SentenceTransformer("all-MiniLM-L6-v2")
    print("SentenceTransformer loaded")

    client = chromadb.PersistentClient(path=PERSIST_DIR)
    collection_name = "products"
    try:
        collection = client.create_collection(name=collection_name)
        print(f"Created collection {collection_name}")
    except Exception:
        collection = client.get_collection(name=collection_name)
        print(f"Using existing collection {collection_name}")

    ids = []
    documents = []
    metadatas = []

    for p in products:
        passages = split_into_passages(p)
        for idx, passage in enumerate(passages):
            doc_id = f"{p['id']}_p{idx}"
            ids.append(doc_id)
            documents.append(passage)
            metadatas.append({"product_id": p['id'], "slug": p.get('slug'), "name": p.get('name')})

    print(f"Encoding {len(documents)} passages...")
    vectors = model.encode(documents, show_progress_bar=True)

    # If collection already contains same ids, remove them first
    try:
        existing = collection.get(ids=ids)
        if existing and existing.get('ids'):
            print("Removing existing embeddings for same ids")
            collection.delete(ids=ids)
    except Exception:
        pass

    collection.add(ids=ids, documents=documents, metadatas=metadatas, embeddings=vectors.tolist())
    print(f"Inserted {len(ids)} documents into collection '{collection_name}' and persisted to {PERSIST_DIR}")

if __name__ == '__main__':
    main()
