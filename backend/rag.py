import json
import os
import chromadb

# Initialize ChromaDB client
base_dir = os.path.dirname(os.path.abspath(__file__))
chroma_path = os.path.join(base_dir, ".chromadb")
client = chromadb.PersistentClient(path=chroma_path)

# Name of our schema collection
COLLECTION_NAME = "queryviz_schema"

def build_schema_index():
    """Reads schema_context.json and indexes it into ChromaDB if not already indexed."""
    schema_path = os.path.join(base_dir, "data", "schema_context.json")
    
    if not os.path.exists(schema_path):
        print("Warning: schema_context.json not found. Run setup_db.py first.")
        return

    # Get or create collection
    collection = client.get_or_create_collection(name=COLLECTION_NAME)
    
    # Check if we already have documents
    if collection.count() > 0:
        print(f"Collection '{COLLECTION_NAME}' already has {collection.count()} documents. Skipping rebuild.")
        return
        
    print("Building schema index in ChromaDB...")
    with open(schema_path, "r") as f:
        schema_context = json.load(f)
        
    documents = []
    ids = []
    metadatas = []
    
    for col_name, info in schema_context.items():
        desc = info.get("description", "")
        col_type = info.get("type", "")
        samples = info.get("sample_values", [])
        
        # Ensure we have precisely 3 samples for formatting, or gracefully handle less
        s0 = samples[0] if len(samples) > 0 else ""
        s1 = samples[1] if len(samples) > 1 else ""
        s2 = samples[2] if len(samples) > 2 else ""
        
        # Format required by spec
        text = f"{col_name}: {desc}. Type: {col_type}. Examples: {s0}, {s1}, {s2}"
        
        documents.append(text)
        ids.append(col_name)
        # Store structured data in metadata for easy retrieval formatting
        metadatas.append({
            "col_name": col_name,
            "description": desc,
            "type": col_type,
            "sample_values": ", ".join(map(str, samples))
        })
        
    if documents:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        print(f"Successfully indexed {len(documents)} columns into ChromaDB.")

def get_relevant_columns(user_query: str, top_k: int = 8) -> str:
    """Queries the schema index for the given user query and returns a formatted string."""
    try:
        collection = client.get_collection(name=COLLECTION_NAME)
    except ValueError:
        # Fallback if collection doesn't exist yet
        return "Error: Schema index not built yet."
        
    # Query ChromaDB collection
    results = collection.query(
        query_texts=[user_query],
        n_results=top_k
    )
    
    if not results or not results["metadatas"] or not results["metadatas"][0]:
        return "No relevant columns found."
        
    response_lines = ["Relevant columns for this query:"]
    
    # Extract metadatas for the first (and only) query text
    top_matches = results["metadatas"][0]
    
    for match in top_matches:
        col_name = match.get("col_name", "")
        desc = match.get("description", "")
        col_type = match.get("type", "")
        samples = match.get("sample_values", "")
        
        # Format required by spec
        line = f" - {col_name}: {desc} (type: {col_type}, examples: [{samples}])"
        response_lines.append(line)
        
    return "\n".join(response_lines)

# Run indexing automatically at import time
build_schema_index()
