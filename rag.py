"""
Minimal RAG for the System Dynamics Model Factory.

Indexes project documentation (Model Briefs, building blocks, methodology) and retrieves
relevant chunks to augment AI prompts. Uses OpenAI embeddings and an on-disk cache.
Enable with RAG_ENABLED=1 and OPENAI_API_KEY set.
"""

import json
import os
import re
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np

# Default docs to index (relative to project root)
_PROJECT_ROOT = Path(__file__).resolve().parent
_DEFAULT_DOCS = [
    "AeroDyn_Lethal_AI_Model_Brief.md",
    "BUILDING_BLOCKS_ARCHETYPES.md",
    "MODEL_FACTORY_CEO_BRIEF.md",
    "SYSTEM_DYNAMICS_METHODOLOGY.md",
    "MODEL_BRIEF_TEMPLATE.md",
    "DESIGN_AND_TRADEOFFS.md",
]
_CACHE_DIR = _PROJECT_ROOT / ".rag_cache"
_META_FILE = _CACHE_DIR / "meta.json"
_EMBEDDINGS_FILE = _CACHE_DIR / "embeddings.npy"
_EMBEDDING_MODEL = "text-embedding-3-small"
_MAX_CHUNK_CHARS = 600


def _chunk_markdown(content: str, source: str) -> List[Tuple[str, str]]:
    """Split markdown into (text, source) chunks by sections and paragraphs."""
    chunks: List[Tuple[str, str]] = []
    # Split by ## or ### headers but keep header with following content
    sections = re.split(r"\n(?=##+\s)", content)
    for section in sections:
        section = section.strip()
        if not section:
            continue
        if len(section) <= _MAX_CHUNK_CHARS:
            chunks.append((section, source))
            continue
        # Split long sections by double newline (paragraphs)
        paras = re.split(r"\n\s*\n", section)
        current = []
        current_len = 0
        for p in paras:
            p = p.strip()
            if not p:
                continue
            if current_len + len(p) + 2 <= _MAX_CHUNK_CHARS:
                current.append(p)
                current_len += len(p) + 2
            else:
                if current:
                    chunks.append(("\n\n".join(current), source))
                current = [p]
                current_len = len(p) + 2
        if current:
            chunks.append(("\n\n".join(current), source))
    return chunks


def _load_docs(doc_names: Optional[List[str]] = None) -> List[Tuple[str, str]]:
    """Load and chunk all configured docs. Returns list of (chunk_text, source)."""
    doc_names = doc_names or _DEFAULT_DOCS
    all_chunks: List[Tuple[str, str]] = []
    for name in doc_names:
        path = _PROJECT_ROOT / name
        if not path.is_file():
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
            all_chunks.extend(_chunk_markdown(content, name))
        except Exception:
            continue
    return all_chunks


def _get_embedding_client():
    """Return OpenAI client for embeddings, or None."""
    try:
        from openai import OpenAI
    except Exception:
        return None
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not key:
        return None
    return OpenAI(api_key=key)


def _embed(client, texts: List[str]) -> np.ndarray:
    """Embed a list of texts; returns (n, dim) array."""
    if not texts:
        return np.zeros((0, 1536), dtype=np.float32)
    # OpenAI API accepts a list of inputs
    resp = client.embeddings.create(input=texts, model=_EMBEDDING_MODEL)
    vecs = [d.embedding for d in resp.data]
    # Preserve order (API may return in different order by index)
    by_idx = {d.index: d.embedding for d in resp.data}
    ordered = [by_idx[i] for i in range(len(texts))]
    return np.array(ordered, dtype=np.float32)


def _build_index(force_rebuild: bool = False) -> Tuple[List[dict], np.ndarray]:
    """
    Build or load cached index. Returns (meta list with keys text, source), embeddings (n, dim).
    """
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    doc_paths = [_PROJECT_ROOT / n for n in _DEFAULT_DOCS]
    latest_doc = max((p.stat().st_mtime for p in doc_paths if p.is_file()), default=0)
    cache_ok = _META_FILE.is_file() and _EMBEDDINGS_FILE.is_file()
    if cache_ok and not force_rebuild:
        try:
            cache_mtime = _META_FILE.stat().st_mtime
            if cache_mtime > latest_doc:
                meta = json.loads(_META_FILE.read_text(encoding="utf-8"))
                emb = np.load(_EMBEDDINGS_FILE)
                if len(meta) == len(emb):
                    return meta, emb
        except Exception:
            pass

    chunks = _load_docs()
    if not chunks:
        return [], np.zeros((0, 1536), dtype=np.float32)

    client = _get_embedding_client()
    if client is None:
        meta = [{"text": t, "source": s} for t, s in chunks]
        # Dummy embeddings so we can cache structure; retrieve will return no context
        emb = np.zeros((len(chunks), 1536), dtype=np.float32)
        return meta, emb

    texts = [t for t, _ in chunks]
    emb = _embed(client, texts)
    meta = [{"text": t, "source": s} for t, s in chunks]
    _META_FILE.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    np.save(_EMBEDDINGS_FILE, emb)
    return meta, emb


# Module-level cache of index (lazy load)
_index_meta: Optional[List[dict]] = None
_index_emb: Optional[np.ndarray] = None


def _ensure_index():
    global _index_meta, _index_emb
    if _index_meta is None:
        _index_meta, _index_emb = _build_index()


def retrieve(query: str, top_k: int = 4) -> str:
    """
    Retrieve top-k most relevant chunks for the query. Returns a single string
    suitable for prepending to an AI prompt, or empty if RAG is disabled / no results.
    """
    if not query or not query.strip():
        return ""
    enabled = os.environ.get("RAG_ENABLED", "").strip().lower() in ("1", "true", "yes")
    if not enabled:
        return ""

    _ensure_index()
    if not _index_meta or _index_emb is None or len(_index_meta) == 0:
        return ""

    client = _get_embedding_client()
    if client is None:
        return ""

    q_emb = _embed(client, [query.strip()])
    if q_emb.shape[0] == 0:
        return ""
    q_vec = q_emb[0]
    # Cosine similarity (vectors are already normalized by OpenAI)
    norms = np.linalg.norm(_index_emb, axis=1, keepdims=True)
    norms[norms == 0] = 1
    sim = (q_vec @ (_index_emb / norms).T).flatten()
    top_indices = np.argsort(sim)[::-1][:top_k]
    parts = []
    for i in top_indices:
        if i < len(_index_meta):
            m = _index_meta[i]
            parts.append(f"[{m.get('source', '')}]\n{m.get('text', '')}")
    if not parts:
        return ""
    return "Relevant project documentation (use for context only):\n\n" + "\n\n---\n\n".join(parts)


def get_rag_context_for_prompt(query_or_instruction: str, top_k: int = 4) -> str:
    """
    Convenience: same as retrieve() but returns string to prepend to user message.
    If RAG returns nothing, returns empty string.
    """
    return retrieve(query_or_instruction, top_k=top_k)
