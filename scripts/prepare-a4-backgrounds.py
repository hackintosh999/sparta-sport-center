import os
from PIL import Image

def process_a4_background(input_path, output_path, target_w=1240, target_h=1754, top_bias=0.0):
    img = Image.open(input_path)
    w, h = img.size
    target_ratio = target_w / target_h # 1240 / 1754 = 0.706955
    src_ratio = w / h # 506 / 1024 = 0.49414

    # Because src is taller than target (0.494 < 0.707), we need to crop height OR expand width.
    # If we crop height:
    new_h = int(w / target_ratio) # 506 / 0.706955 = 715 px
    # Calculate crop box (top bias keeps header / head visible)
    y_offset = int((h - new_h) * top_bias)
    box = (0, y_offset, w, y_offset + new_h)
    cropped = img.crop(box)
    
    # Resize with High Quality Lanczos to exact target_w, target_h
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    resized.save(output_path, quality=95)
    print(f"Saved {output_path}: {resized.size}")

# Process Tennis
process_a4_background(
    'public/banner-assets/sparta-tennis-girl-clean-bg.jpg',
    'public/banner-assets/sparta-tennis-a4-clean-bg.jpg',
    target_w=1240,
    target_h=1754,
    top_bias=0.15 # Keep girl centered nicely
)

# Process Football
process_a4_background(
    'public/banner-assets/sparta-football-clean-bg.jpg',
    'public/banner-assets/sparta-football-a4-clean-bg.jpg',
    target_w=1240,
    target_h=1754,
    top_bias=0.10 # Keep boy and soccer ball centered nicely
)
