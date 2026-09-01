from PIL import Image
import numpy as np

src_path = r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787081766841.png"
img = Image.open(src_path).convert("RGBA")
arr = np.array(img)

# True emblem bounds
# Y from 203 to 559, X from 392 to 675
crop = arr[200:562, 390:678]

# Convert to crisp antialiased gold #F7D584 (247, 213, 132)
gold = np.zeros_like(crop)
gold[:, :, 0] = 247
gold[:, :, 1] = 213
gold[:, :, 2] = 132
# Alpha from original alpha and darkness
alpha = crop[:, :, 3].astype(float)
gold[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)

Image.fromarray(gold).save("public/banner-assets/lotus-ballet-crest-gold.png")

# Also create lotus flower icon only (y from 435 to 559 in original -> 235 to 362 in crop)
lotus_crop = arr[435:562, 390:630]
gold_lotus = np.zeros_like(lotus_crop)
gold_lotus[:, :, 0] = 247
gold_lotus[:, :, 1] = 213
gold_lotus[:, :, 2] = 132
gold_lotus[:, :, 3] = np.clip(lotus_crop[:, :, 3].astype(float), 0, 255).astype(np.uint8)
Image.fromarray(gold_lotus).save("public/banner-assets/lotus-flower-crest-gold.png")

print("Created public/banner-assets/lotus-ballet-crest-gold.png (288x362)")
print("Created public/banner-assets/lotus-flower-crest-gold.png (240x127)")
