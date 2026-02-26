#!/usr/bin/env python3
"""
Recreate ChromaDB database with current schema.
This fixes the schema mismatch issue.
"""

import sys
import json
import os
from pathlib import Path

try:
    import chromadb
    from chromadb.config import Settings
    from chromadb.utils import embedding_functions
except ImportError:
    print("ERROR: ChromaDB not installed. Run: pip install chromadb")
    sys.exit(1)

def read_content_file(file_path: Path) -> str:
    """Read content from a file."""
    if file_path.exists():
        return file_path.read_text(encoding='utf-8')
    return ""

def recreate_database():
    """Recreate ChromaDB database with current schema."""
    
    # Paths
    base_path = Path(__file__).parent.parent
    chroma_path = base_path / "data" / "2025-08-26_16-22-29" / "chroma"
    content_file = base_path / "data" / "relevant_content.txt"
    curriculum_file = base_path / "data" / "curriculum.txt"
    
    print("🔄 Recreating ChromaDB database...")
    print(f"📁 Database path: {chroma_path}")
    
    # Backup old database if it exists
    if chroma_path.exists():
        backup_path = base_path / "data" / "2025-08-26_16-22-29" / "chroma_backup"
        if backup_path.exists():
            import shutil
            shutil.rmtree(backup_path)
        print(f"💾 Backing up old database to: {backup_path}")
        import shutil
        shutil.move(str(chroma_path), str(backup_path))
    
    # Create new database
    chroma_path.mkdir(parents=True, exist_ok=True)
    
    # Initialize ChromaDB client
    client = chromadb.PersistentClient(
        path=str(chroma_path),
        settings=Settings(anonymized_telemetry=False)
    )
    
    # Use BGE-large embedding function (1024-dim) to match previous setup
    embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="BAAI/bge-large-en-v1.5"
    )
    
    print("📚 Creating collection...")
    collection = client.get_or_create_collection(
        name="luxembourgish_learning",
        embedding_function=embedding_function,
        metadata={"description": "Luxembourgish learning materials and curriculum"}
    )
    
    # Read content files
    print("📖 Reading content files...")
    content_text = read_content_file(content_file)
    curriculum_text = read_content_file(curriculum_file)
    
    # Split content into chunks
    # Split by double newlines or section markers
    content_chunks = []
    
    if content_text:
        # Split by sections (lines starting with "**" or "###" or "- kapitel:")
        sections = []
        current_section = []
        
        for line in content_text.split('\n'):
            if line.strip().startswith('- kapitel:') or line.strip().startswith('**') or line.strip().startswith('###'):
                if current_section:
                    sections.append('\n'.join(current_section))
                current_section = [line]
            else:
                current_section.append(line)
        
        if current_section:
            sections.append('\n'.join(current_section))
        
        # Add non-empty sections
        for i, section in enumerate(sections):
            if section.strip():
                content_chunks.append({
                    "id": f"content_{i+1}",
                    "text": section.strip(),
                    "source": "relevant_content.txt"
                })
    
    if curriculum_text:
        # Split curriculum by lines or sections
        curriculum_lines = [line.strip() for line in curriculum_text.split('\n') if line.strip()]
        for i, line in enumerate(curriculum_lines):
            if len(line) > 20:  # Only add substantial lines
                content_chunks.append({
                    "id": f"curriculum_{i+1}",
                    "text": line,
                    "source": "curriculum.txt"
                })
    
    if not content_chunks:
        print("⚠️  No content found to index!")
        return False
    
    print(f"📝 Found {len(content_chunks)} content chunks to index")
    
    # Add documents to collection
    print("💾 Adding documents to ChromaDB...")
    
    # Batch add documents (ChromaDB can handle large batches)
    batch_size = 50
    for i in range(0, len(content_chunks), batch_size):
        batch = content_chunks[i:i+batch_size]
        collection.add(
            ids=[item["id"] for item in batch],
            documents=[item["text"] for item in batch],
            metadatas=[{"source": item["source"]} for item in batch]
        )
        print(f"  ✅ Added batch {i//batch_size + 1}/{(len(content_chunks)-1)//batch_size + 1}")
    
    # Verify
    count = collection.count()
    print(f"\n✅ Database recreated successfully!")
    print(f"📊 Total documents: {count}")
    
    # Test query
    print("\n🧪 Testing query...")
    results = collection.query(
        query_texts=["greetings in Luxembourgish"],
        n_results=3
    )
    
    if results["documents"] and results["documents"][0]:
        print(f"✅ Query test successful! Found {len(results['documents'][0])} results")
        print(f"   Sample: {results['documents'][0][0][:100]}...")
    else:
        print("⚠️  Query test returned no results")
    
    return True

if __name__ == "__main__":
    try:
        success = recreate_database()
        if success:
            print("\n🎉 ChromaDB database recreated successfully!")
            print("   You can now use RAG queries in your Next.js app.")
            sys.exit(0)
        else:
            print("\n❌ Failed to recreate database")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

