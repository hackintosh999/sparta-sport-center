from PIL import Image
import numpy as np

src_path = r"public/banner-assets/vk-qr-real.png"
out_path = r"public/banner-assets/vk-qr-real.png"

img = Image.open(src_path).convert("RGBA")
arr = np.array(img)

# Deep pine graphite color: #152219 (RGB: 21, 34, 25)
# Warm champagne white: #FFFDF9 (RGB: 255, 253, 249)

r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
gray = 0.299 * r + 0.587 * g + 0.114 * b

is_dark = (gray < 128) & (a > 100)
is_light = ~is_dark

new_arr = np.zeros_like(arr)

# Dark pixels -> Deep pine graphite #152219
new_arr[is_dark, 0] = 21
new_arr[is_dark, 1] = 34
new_arr[is_dark, 2] = 25
new_arr[is_dark, 3] = 255

# Light pixels -> Warm champagne white #FFFDF9
new_arr[is_light, 0] = 255
new_arr[is_light, 1] = 253
new_arr[is_light, 2] = 249
new_arr[is_light, 3] = 255

tinted_img = Image.fromarray(new_arr, "RGBA")
tinted_img.save(out_path, format="PNG")
print("QR code tinted successfully!")
