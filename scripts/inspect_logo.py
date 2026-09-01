from PIL import Image
import numpy as np

src_path = r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787081766841.png"
img = Image.open(src_path)
print("Format:", img.format, "Mode:", img.mode, "Size:", img.size)

img_rgba = img.convert("RGBA")
arr = np.array(img_rgba)

# Look at non-transparent or dark pixels
# What are the colors?
print("Middle pixel (512, 512):", arr[512, 512])
print("Top left (10, 10):", arr[10, 10])
print("Center top (512, 300):", arr[300, 512])

# In this image, the artwork is black text/graphics on transparent/white background.
# Let's inspect unique alpha or RGB values
r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
is_graphic = (a > 50) & (r < 100) & (g < 100) & (b < 100)
# If background is white (a=255, r=255, g=255, b=255), is_graphic will be where r < 100
# If background is transparent (a=0), is_graphic will be where a > 50

# Let's check where the true emblem is located
y_idx, x_idx = np.where(is_graphic)
print("Min/Max X:", x_idx.min(), x_idx.max())
print("Min/Max Y:", y_idx.min(), y_idx.max())

# Let's slice the image into regions:
# 1. Ballerina + Lotus emblem (y < 560)
mask_emblem = is_graphic & (np.arange(arr.shape[0])[:, None] < 560)
ey, ex = np.where(mask_emblem)
print(f"Emblem bounds: X=[{ex.min()}, {ex.max()}], Y=[{ey.min()}, {ey.max()}]")

# Crop emblem with padding
crop_emblem = arr[ey.min():ey.max()+1, ex.min():ex.max()+1]
# Make gold: where graphic, RGB=(247, 213, 132), A = 255 - grayscale or original A
gold_emblem = np.zeros_like(crop_emblem)
gold_emblem[:, :, 0] = 247
gold_emblem[:, :, 1] = 213
gold_emblem[:, :, 2] = 132
# If white background:
gray_crop = 0.299 * crop_emblem[:, :, 0] + 0.587 * crop_emblem[:, :, 1] + 0.114 * crop_emblem[:, :, 2]
gold_emblem[:, :, 3] = np.clip((255 - gray_crop) * (crop_emblem[:, :, 3]/255.0), 0, 255).astype(np.uint8)

Image.fromarray(gold_emblem).save("public/banner-assets/lotus-ballet-crest-gold.png")
print("Saved clean gold emblem:", gold_emblem.shape)
