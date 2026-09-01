from PIL import Image
import numpy as np

src_path = r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787081766841.png"
img = Image.open(src_path).convert("RGBA")
print("Image size:", img.size)

# Extract bounding box of black artwork
arr = np.array(img)
r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
is_black = (r < 100) & (g < 100) & (b < 100)

# Crop the top crest (Ballerina + Lotus)
# In this 1024x1024 (or similar) image:
# The top crest is between y ~ 150 to ~ 570, x ~ 350 to ~ 670
# The text LOTOS is below y ~ 580

# Let's crop just the emblem (Ballerina on Lotus)
# Let's find vertical bounds of the emblem
y_indices, x_indices = np.where(is_black)
print("X range:", x_indices.min(), x_indices.max())
print("Y range:", y_indices.min(), y_indices.max())

# Let's save a clean transparent gold version of the crest
# Color: #F7D584 (247, 213, 132)
crest_mask = is_black.copy()
# Zero out the text below y = 570
crest_mask[570:, :] = False

crest_y, crest_x = np.where(crest_mask)
min_y, max_y = crest_y.min(), crest_y.max()
min_x, max_x = crest_x.min(), crest_x.max()

print("Crest box:", min_x, min_y, max_x, max_y)

# Create transparent gold PNG for the crest
crest_arr = np.zeros((max_y - min_y + 20, max_x - min_x + 20, 4), dtype=np.uint8)
cropped_mask = crest_mask[min_y:max_y+1, min_x:max_x+1]

# Fill with gold #F7D584
crest_arr[10:10+cropped_mask.shape[0], 10:10+cropped_mask.shape[1], 0] = np.where(cropped_mask, 247, 0)
crest_arr[10:10+cropped_mask.shape[0], 10:10+cropped_mask.shape[1], 1] = np.where(cropped_mask, 213, 0)
crest_arr[10:10+cropped_mask.shape[0], 10:10+cropped_mask.shape[1], 2] = np.where(cropped_mask, 132, 0)
crest_arr[10:10+cropped_mask.shape[0], 10:10+cropped_mask.shape[1], 3] = np.where(cropped_mask, 255, 0)

crest_img = Image.fromarray(crest_arr, "RGBA")
crest_img.save("public/banner-assets/lotus-ballet-crest-gold.png")
print("Saved public/banner-assets/lotus-ballet-crest-gold.png successfully!")
