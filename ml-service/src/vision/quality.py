"""
Image Quality and Usability Assessment Module
Checks resolution, blur/sharpness, brightness extremes, and image corruption.
"""

from typing import Dict, Any, Tuple
import numpy as np
from PIL import Image, ImageStat

def evaluate_image_quality(img: Image.Image) -> Dict[str, Any]:
    """
    Evaluates an opened PIL Image for physical and visual usability.
    Returns:
        {
            "usable": bool,
            "score": float (0.0 to 1.0),
            "reason": str or None,
            "metrics": {
                "width": int,
                "height": int,
                "aspect_ratio": float,
                "blur_score": float,
                "brightness": float
            }
        }
    """
    width, height = img.size
    
    # 1. Minimum Resolution Check
    if width < 80 or height < 80:
        return {
            "usable": False,
            "score": 0.20,
            "reason": f"Resolution too low ({width}x{height}px). Minimum 80x80px required.",
            "metrics": {"width": width, "height": height, "aspect_ratio": round(width / max(height, 1), 2), "blur_score": 0.0, "brightness": 0.0}
        }

    # Convert to RGB if palette/RGBA
    if img.mode != "RGB":
        rgb_img = img.convert("RGB")
    else:
        rgb_img = img

    # 2. Brightness / Contrast Evaluation using ImageStat
    stat = ImageStat.Stat(rgb_img)
    avg_brightness = sum(stat.mean) / (3.0 * 255.0)  # 0.0 to 1.0
    std_dev = sum(stat.stddev) / (3.0 * 255.0)

    # Check completely dark / blank image
    if avg_brightness < 0.05:
        return {
            "usable": False,
            "score": 0.15,
            "reason": "Image is extremely dark / underexposed. Visual inspection is not possible.",
            "metrics": {"width": width, "height": height, "aspect_ratio": round(width / max(height, 1), 2), "blur_score": 0.0, "brightness": round(avg_brightness, 3)}
        }
    
    # Check completely overexposed / washed out image
    if avg_brightness > 0.98 and std_dev < 0.04:
        return {
            "usable": False,
            "score": 0.15,
            "reason": "Image is completely white or washed out. No visible product details found.",
            "metrics": {"width": width, "height": height, "aspect_ratio": round(width / max(height, 1), 2), "blur_score": 0.0, "brightness": round(avg_brightness, 3)}
        }

    # 3. Blur Detection (Laplacian Variance approximation using NumPy gradient)
    gray = rgb_img.convert("L")
    gray_np = np.asarray(gray, dtype=np.float32)
    
    # Fast 2D discrete Laplacian filter
    gx, gy = np.gradient(gray_np)
    grad_norm = np.sqrt(gx ** 2 + gy ** 2)
    blur_score = float(np.var(grad_norm))

    # Single-color flat image check
    if std_dev < 0.01 or blur_score < 0.5:
        return {
            "usable": False,
            "score": 0.25,
            "reason": "Image lacks visual texture or appears completely uniform/blank.",
            "metrics": {"width": width, "height": height, "aspect_ratio": round(width / max(height, 1), 2), "blur_score": round(blur_score, 2), "brightness": round(avg_brightness, 3)}
        }

    # Severe blur detection (threshold calibrated for downscaled photos)
    is_blurry = blur_score < 4.0
    
    # Calculate composite quality score between 0.0 and 1.0
    quality_score = min(1.0, max(0.3, 0.5 + (min(blur_score, 100.0) / 200.0) + (std_dev * 0.4)))
    
    if is_blurry:
        return {
            "usable": False,
            "score": round(quality_score * 0.5, 2),
            "reason": "Image quality is insufficient for reliable visual analysis (excessive blur).",
            "metrics": {"width": width, "height": height, "aspect_ratio": round(width / max(height, 1), 2), "blur_score": round(blur_score, 2), "brightness": round(avg_brightness, 3)}
        }

    return {
        "usable": True,
        "score": round(quality_score, 2),
        "reason": None,
        "metrics": {
            "width": width,
            "height": height,
            "aspect_ratio": round(width / max(height, 1), 2),
            "blur_score": round(blur_score, 2),
            "brightness": round(avg_brightness, 3)
        }
    }
