"""
Image Perceptual & Content Hashing for Duplicate Detection
"""

import hashlib
from typing import Tuple
from PIL import Image
import numpy as np

def compute_image_hashes(img: Image.Image) -> Tuple[str, str]:
    """
    Computes both:
    1. Perceptual Difference Hash (dHash - 64-bit hex) - robust to re-compression / resizing.
    2. SHA-256 binary digest of the raw pixel raster.
    """
    # 1. dHash (Difference Hash)
    # Resize to 9x8, convert to grayscale
    resized = img.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
    pixels = np.asarray(resized, dtype=np.int32)
    
    # Compare adjacent pixels horizontally
    diff = pixels[:, 1:] > pixels[:, :-1]
    
    # Convert bool array into 64-bit hex string
    bit_string = "".join(["1" if b else "0" for b in diff.flatten()])
    dhash_hex = f"{int(bit_string, 2):016x}"
    
    # 2. SHA-256 of pixel bytes
    sha256_hash = hashlib.sha256(img.tobytes()).hexdigest()
    
    return dhash_hex, sha256_hash

def compute_hamming_distance(hash1: str, hash2: str) -> int:
    """Returns the Hamming distance between two hex dHash strings (0 = identical)."""
    try:
        val1 = int(hash1, 16)
        val2 = int(hash2, 16)
        xor = val1 ^ val2
        return bin(xor).count("1")
    except Exception:
        return 64
