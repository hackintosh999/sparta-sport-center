from PIL import Image
import numpy as np

src_path = r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787081766841.png"
img = Image.open(src_path).convert("L")
arr = np.array(img)
print("Corners brightness:", arr[0,0], arr[0, 1023], arr[1023, 0], arr[1023, 1023])

# Check center region (x from 100 to 900, y from 100 to 600)
# Threshold: dark pixels < 100
is_dark = (arr < 100)

# Filter out outer 20px border if any
is_dark[:20, :] = False
is_dark[-20:, :] = False
is_dark[:, :20] = False
is_dark[:, -20:] = False

# Above y = 570
is_dark_crest = is_dark.copy()
is_dark_crest[570:, :] = False

y_idx, x_idx = np.where(is_dark_crest)
print("Cropped crest box:", x_idx.min(), y_idx.min(), x_idx.max(), y_idx.max())

# Also extract Lotus flower only (bottom petals of the crest, y ~ 430 to 570)
# And the full Ballerina + Lotus emblem

# Save Ballerina + Lotus Crest
crest_gray = arr[y_idx.min()-10:y_idx.max()+11, x_idx.min()-10:x_idx.max()+11]
crest_alpha = np.clip((255 - crest_gray).astype(float) * 1.2, 0, 255).astype(np.uint8)

crest_gold = np.zeros((crest_gray.shape[0], crest_gray.shape[1], 4), dtype=np.uint8)
crest_gold[:, :, 0] = 247 # R
crest_gold[:, :, 1] = 213 # G
crest_gold[:, :, 2] = 132 # B
crest_gold[:, :, 3] = crest_alpha

Image.fromarray(crest_gold, "RGBA").save("public/banner-assets/lotus-ballet-crest-gold.png")

# Also save lotus-only emblem
lotus_mask = is_dark_crest.copy()
lotus_mask[:425, :] = False
ly, lx = np.where(lotus_mask)
print("Lotus only box:", lx.min(), ly.min(), lx.max(), ly.max())
lotus_gray = arr[ly.min()-10:ly.max()+11, lx.min()-10:lx.max()+11]
lotus_alpha = np.clip((255 - lotus_gray).astype(float) * 1.2, 0, 255).astype(np.uint8)
lotus_gold = np.zeros((lotus_gray.shape[0], lotus_gray.shape[1], 4), dtype=np.uint8)
lotus_gold[:, :, 0] = 247
lotus_gold[:, :, 1] = 213
lotus_gold[:, :, 2] = 132
lotus_gold[:, :, 3] = lotus_alpha
Image.fromarray(lotus_gold, "RGBA").save("public/banner-assets/lotus-icon-only-gold.png")

print("Generated both public/banner-assets/lotus-ballet-crest-gold.png and lotus-icon-only-gold.png successfully!")
