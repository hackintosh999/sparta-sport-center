from PIL import Image
import numpy as np

src_path = r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787081766841.png"
img = Image.open(src_path).convert("L")
arr = np.array(img)

# Find where darkness < 128
is_dark = arr < 128

# Let's inspect where dark pixels are located above row 570
dark_above = is_dark.copy()
dark_above[570:, :] = False

y_idx, x_idx = np.where(dark_above)
print("True crest box:", x_idx.min(), y_idx.min(), x_idx.max(), y_idx.max())

# Let's crop just the emblem
# Let's also extract the lotus flower only (bottom of the crest: y from ~430 to 570)
# And the full ballerina + lotus crest

# Crop emblem
emblem_mask = dark_above[y_idx.min():y_idx.max()+1, x_idx.min():x_idx.max()+1]
h, w = emblem_mask.shape
print(f"Emblem dimensions: {w}x{h}")

# Create clean smooth RGBA gold image
# Use antialiasing from original grayscale
cropped_gray = arr[y_idx.min():y_idx.max()+1, x_idx.min():x_idx.max()+1]
alpha = 255 - cropped_gray

out_arr = np.zeros((h, w, 4), dtype=np.uint8)
out_arr[:, :, 0] = 247 # R
out_arr[:, :, 1] = 213 # G
out_arr[:, :, 2] = 132 # B
out_arr[:, :, 3] = alpha

out_img = Image.fromarray(out_arr, "RGBA")
out_img.save("public/banner-assets/lotus-ballet-crest-gold.png")
print("Saved clean antialiased gold crest!")
