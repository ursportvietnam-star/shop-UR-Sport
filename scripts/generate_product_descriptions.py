"""
Generate product descriptions by retrieving related passages from Chroma and
calling a local AI server.

Default provider: Ollama at http://localhost:11434/api/generate

Usage:
    .venv\\Scripts\\python.exe scripts\\ingest_embeddings.py
    .venv\\Scripts\\python.exe scripts\\generate_product_descriptions.py --product-id at-1

Output: writes outputs/{product_id}.md
"""

import argparse
import json
import os
import sys

import chromadb
import requests
from sentence_transformers import SentenceTransformer

AI_PROVIDER = os.environ.get("AI_PROVIDER", "ollama").lower()
TG_WEBUI_API_URL = os.environ.get("TG_WEBUI_API", "http://localhost:5000/api/v1/generate")
OLLAMA_API_URL = os.environ.get("OLLAMA_API", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:latest")
OLLAMA_NUM_CTX = int(os.environ.get("OLLAMA_NUM_CTX", "2048"))
OLLAMA_NUM_GPU = int(os.environ.get("OLLAMA_NUM_GPU", "0"))

SEED_FILE = os.path.join(os.path.dirname(__file__), "products_seed.json")
PERSIST_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "outputs")
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
STRATEGY_FILES = [
    "SEO-STRATEGY-2026.md",
    "PRODUCT_SKILL.md",
    "IMPLEMENTATION-GUIDE.md",
    "AI-CITATIONS-GUIDE.md",
]

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

PROMPT_TEMPLATE = """Dựa trên dữ liệu sản phẩm, ngữ cảnh liên quan và bộ tài liệu chiến lược của UR Sport, hãy viết mô tả sản phẩm tiếng Việt tự nhiên, dễ bán hàng và tối ưu SEO.

Bộ quy tắc chiến lược phải tuân thủ:
{strategy_notes}

Sản phẩm:
Tên: {name}
Mô tả hiện tại: {desc}
Giá nếu có: {price}
Rating nếu có: {rating}
Số review nếu có: {reviews_count}
Dữ liệu kiểm định/chứng cứ được phép dùng: {evidence}
URL sản phẩm: https://www.ursport.vn/product/{slug}

Ngữ cảnh liên quan:
{passages}

Yêu cầu:
- Viết bằng tiếng Việt chuẩn, không trộn tiếng Anh nếu không cần.
- Nội dung tập trung vào lợi ích thật, nỗi đau thật, không viết kiểu chung chung.
- Không tự bịa chứng nhận, số liệu test, giá, tồn kho, SKU, GTIN, hình ảnh hoặc chính sách nếu dữ liệu không có.
- Các số liệu trong tài liệu chiến lược như FITI, 95%, 50 lần giặt, khô 3x nhanh hơn chỉ là ví dụ mẫu. Không được dùng trong bài trừ khi nằm trong "Dữ liệu kiểm định/chứng cứ được phép dùng".
- Nếu không có chứng cứ kiểm định, hãy dùng câu thận trọng như "giữ form tốt khi giặt đúng cách" thay vì nêu phần trăm hoặc tên tổ chức.
- Mở bài ngắn 2-3 câu, nói rõ sản phẩm giải quyết vấn đề gì.
- Dùng heading Markdown đúng dạng ##.
- Có các mục: Vì sao nên chọn, Chất liệu, Hướng dẫn chọn size, Hướng dẫn bảo quản.
- Có FAQ 3-5 câu hỏi đáp.
- Kết thúc bằng JSON-LD Product schema hợp lệ trong block ```json, chỉ dùng dữ liệu được cung cấp.
- Schema phải dùng brand UR Sport và domain https://www.ursport.vn.
"""


def load_products():
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_strategy_notes(max_chars_per_file=2500):
    existing_files = [name for name in STRATEGY_FILES if os.path.exists(os.path.join(PROJECT_ROOT, name))]
    source_line = ", ".join(existing_files) if existing_files else "Không tìm thấy file chiến lược"
    return f"""
Nguồn quy tắc đã tham chiếu: {source_line}

Áp dụng quy tắc an toàn sau, không copy ví dụ trong tài liệu:
- Viết cho nam 18-35 tuổi, giọng UR Sport: rõ, tự tin, thực tế, không hoa mỹ.
- Tiêu đề và nội dung phải nêu lợi ích chính, không chỉ liệt kê tính năng.
- Mỗi đoạn H2 phải tự đủ nghĩa để AI Search/ChatGPT có thể hiểu và trích dẫn.
- Ưu tiên dữ liệu thật từ sản phẩm. Nếu không có chứng cứ kiểm định thì không nêu tên tổ chức, phần trăm, số lần giặt, tốc độ khô.
- Không dùng các ví dụ mẫu như FITI, Quick Dry, Cotton Compact, micro-fiber, 95%, 50 lần giặt, 3x nhanh hơn nếu sản phẩm không cung cấp chính xác các dữ liệu đó.
- Không tự tạo SKU, GTIN, MPN, hình ảnh, màu sắc, tồn kho hoặc chính sách.
- Schema chỉ dùng các trường có thật: name, description, brand, url, price, aggregateRating nếu có.
""".strip()


def get_product_by_id(products, product_id):
    for product in products:
        if product["id"] == product_id:
            return product
    return None


def get_passages_for_query(query, k=3):
    model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
    query_vector = model.encode([query])[0].tolist()
    client = chromadb.PersistentClient(path=PERSIST_DIR)
    collection = client.get_collection(name="products")
    results = collection.query(query_embeddings=[query_vector], n_results=k)

    passages = []
    for docs in results.get("documents", []):
        passages.extend(docs)
    return "\n\n".join(passages[:k])


def call_generation_api(prompt, max_tokens):
    if AI_PROVIDER == "ollama":
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "num_ctx": OLLAMA_NUM_CTX,
                "num_gpu": OLLAMA_NUM_GPU,
            },
        }
        api_url = OLLAMA_API_URL
    else:
        payload = {"prompt": prompt, "max_new_tokens": max_tokens}
        api_url = TG_WEBUI_API_URL

    response = requests.post(api_url, json=payload, timeout=900)
    if not response.ok:
        raise RuntimeError(f"{api_url} returned HTTP {response.status_code}: {response.text[:1000]}")
    return response.json()


def extract_generated_text(response):
    if not isinstance(response, dict):
        return str(response)
    if "response" in response:
        return response["response"]
    if "results" in response and isinstance(response["results"], list):
        return response["results"][0].get("text", "")
    if "text" in response:
        return response["text"]
    if "generated_text" in response:
        return response["generated_text"]
    return json.dumps(response, ensure_ascii=False, indent=2)


def save_output(product_id, text):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, f"{product_id}.md")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text.strip() + "\n")
    print(f"Wrote output to {output_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--product-id", required=True)
    parser.add_argument("--k", type=int, default=3)
    parser.add_argument("--max-tokens", type=int, default=1200)
    args = parser.parse_args()

    products = load_products()
    product = get_product_by_id(products, args.product_id)
    if not product:
        print("Product id not found in seed file")
        return

    query = product.get("name", "") + " " + " ".join(product.get("features", []))
    print("Retrieving passages for query:", query)
    passages = get_passages_for_query(query, k=args.k)

    prompt = PROMPT_TEMPLATE.format(
        strategy_notes=load_strategy_notes(),
        name=product["name"],
        desc=product.get("description", ""),
        price=product.get("price", "Không có"),
        rating=product.get("rating", "Không có"),
        reviews_count=product.get("reviewsCount", "Không có"),
        evidence=product.get("evidence", "Không có"),
        slug=product.get("slug", product["id"]),
        passages=passages,
    )
    print(f"Sending prompt to {AI_PROVIDER}...")
    response = call_generation_api(prompt, max_tokens=args.max_tokens)
    save_output(product["id"], extract_generated_text(response))


if __name__ == "__main__":
    main()
