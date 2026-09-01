import os
from PIL import Image
import numpy as np

def remove_white_bg(input_path, output_path, tolerance=240, feather=15):
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    
    # RGB channels
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    # Calculate brightness / whiteness
    # Since background is pure white #FFFFFF (255, 255, 255)
    whiteness = np.minimum(np.minimum(r, g), b)
    
    # Create smooth alpha mask
    # If whiteness >= tolerance + feather -> alpha = 0
    # If whiteness <= tolerance - feather -> alpha = 255
    # In between -> linear interpolation
    alpha = np.clip((255 - whiteness) / (255 - tolerance) * 255, 0, 255)
    
    # For dark or colored pixels, ensure alpha is 255
    # Also despill white fringe: unmultiply white background
    alpha_norm = alpha / 255.0
    
    # Color de-fringing
    for c in range(3):
        # unblend from white: (pixel - (1-alpha)*255) / alpha
        channel = arr[:, :, c]
        # protect against divide by zero
        safe_alpha = np.maximum(alpha_norm, 0.001)
        unblended = (channel - (1.0 - alpha_norm) * 255.0) / safe_alpha
        arr[:, :, c] = np.clip(unblended, 0, 255)
        
    arr[:, :, 3] = alpha
    
    result = Image.fromarray(arr.astype(np.uint8), mode="RGBA")
    
    # Trim transparent borders
    bbox = result.getbbox()
    if bbox:
        result = result.crop(bbox)
        
    result.save(output_path, "PNG")
    print(f"Saved: {output_path} (size: {result.size})")

items = [
    (r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787320844432.png", r"public\banner-assets\tennis-icon-gift.png"),
    (r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787320844444.png", r"public\banner-assets\tennis-icon-ice.png"),
    (r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787320844505.png", r"public\banner-assets\tennis-icon-license.png"),
    (r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787320844410.png", r"public\banner-assets\tennis-icon-tax.png"),
]

for src, dst in items:
    if os.path.exists(src):
        remove_white_bg(src, dst)
    else:
        print(f"Error: {src} does not exist!")
