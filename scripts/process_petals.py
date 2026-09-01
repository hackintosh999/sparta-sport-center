import os
from PIL import Image, ImageEnhance
import numpy as np

src_path = r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787075492319.png"
out_path = r"C:\Users\User\Downloads\sparta-sports-center\public\banner-assets\lotus-petals-transparent.png"

# Load image
img = Image.open(src_path).convert("RGBA")
arr = np.array(img, dtype=np.float32)

r = arr[:, :, 0]
g = arr[:, :, 1]
b = arr[:, :, 2]

# Measure whiteness
min_rgb = np.minimum(np.minimum(r, g), b)

# Alpha calculation: pure white (255) -> 0, petals -> opacity based on density
# Mathematical un-multiply:
alpha = 255.0 - min_rgb

# Enhance contrast and curve of alpha
alpha_norm = alpha / 255.0
# Gentle power curve to make petals dense and rich while keeping white 100% transparent
alpha_boosted = np.power(alpha_norm, 0.65) * 255.0 * 1.25
alpha_final = np.clip(alpha_boosted, 0, 255)

# Set pixels with min_rgb >= 252 to exact 0
alpha_final[min_rgb >= 253] = 0

# Recover true petal color without white wash
safe_alpha = np.maximum(alpha_final / 255.0, 0.001)

# Color correction: warm golden cream
r_out = np.clip(r * 1.04, 0, 255)
g_out = np.clip(g * 0.98, 0, 255)
b_out = np.clip(b * 0.90, 0, 255)

result_arr = np.dstack((r_out, g_out, b_out, alpha_final)).astype(np.uint8)
result_img = Image.fromarray(result_arr, mode="RGBA")

# Slightly boost saturation and contrast of the petals for luxury look
enhancer_color = ImageEnhance.Color(result_img)
result_img = enhancer_color.enhance(1.2)
enhancer_contrast = ImageEnhance.Contrast(result_img)
result_img = enhancer_contrast.enhance(1.15)

os.makedirs(os.path.dirname(out_path), exist_ok=True)
result_img.save(out_path, format="PNG")
print(f"[OK] Successfully created high-res transparent 3D lotus petals at: {out_path}")
