#!/usr/bin/env python3
"""
Query ChromaDB directly from file system.
Called by Next.js API route - no server needed.
"""

import sys
import json
import os
from pathlib import Path

# Flush output immediately for better logging
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

try:
    import chromadb
    from chromadb.config import Settings
    from chromadb.utils import embedding_functions
except ImportError:
    print(json.dumps({"error": "ChromaDB not installed"}), flush=True)
    sys.exit(1)

def query_chromadb(query: str, n_results: int = 3, chroma_path: str = None):
    """Query ChromaDB and return results as JSON."""
    
    # Find ChromaDB path
    if not chroma_path:
        base_path = Path(__file__).parent.parent
        possible_paths = [
            base_path / "data" / "2025-08-26_16-22-29" / "chroma",
            base_path.parent / "data" / "2025-08-26_16-22-29" / "chroma",
        ]
        
        for p in possible_paths:
            if p.exists():
                chroma_path = str(p)
                break
    
    if not chroma_path or not os.path.exists(chroma_path):
        return {"error": "ChromaDB path not found", "results": []}
    
    try:
        # Initialize ChromaDB client
        client = chromadb.PersistentClient(
            path=chroma_path,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get collections - handle schema mismatch gracefully
        try:
            collections = client.list_collections()
        except Exception as schema_error:
            error_msg = str(schema_error)
            if "no such column" in error_msg.lower() or "topic" in error_msg.lower():
                return {
                    "error": "Database schema mismatch - created with older ChromaDB version. Please recreate the database or use a compatible version.",
                    "results": []
                }
            raise
        
        if not collections:
            return {"error": "No collections found", "results": []}
        
        # Get first collection
        collection = collections[0]
        collection_name = collection.name
        
        # Use BGE-large embedding function (1024-dim) to match collection
        # IMPORTANT: Must use the same embedding function for queries as was used to create the collection
        # Note: First run will download the model (~1.3GB), which can take time
        print("Loading embedding model (this may take time on first run)...", file=sys.stderr, flush=True)
        
        try:
            embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="BAAI/bge-large-en-v1.5"
            )
        except Exception as e:
            return {"error": f"Failed to load embedding model: {str(e)}", "results": []}
        
        # Get collection with the same embedding function used to create it
        # This ensures query embeddings match the stored document embeddings
        try:
            collection_obj = client.get_collection(
                name=collection_name,
                embedding_function=embedding_function
            )
        except Exception as e:
            return {"error": f"Failed to get collection: {str(e)}", "results": []}
        
        # Query
        results = collection_obj.query(
            query_texts=[query],
            n_results=min(n_results, 10)
        )
        
        # Format results
        documents = results.get("documents", [])
        if documents and documents[0]:
            formatted = [
                {"content": doc, "index": i}
                for i, doc in enumerate(documents[0], 1)
            ]
            return {
                "success": True,
                "collection": collection_name,
                "count": len(documents[0]),
                "results": formatted
            }
        else:
            return {"success": True, "results": []}
            
    except Exception as e:
        return {"error": str(e), "results": []}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query provided"}), flush=True)
        sys.exit(1)
    
    query = sys.argv[1]
    n_results = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    
    try:
        result = query_chromadb(query, n_results)
        print(json.dumps(result), flush=True)
    except KeyboardInterrupt:
        print(json.dumps({"error": "Query interrupted"}), flush=True)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Unexpected error: {str(e)}"}), flush=True)
        sys.exit(1)

