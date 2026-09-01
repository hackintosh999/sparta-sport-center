from PIL import Image, ImageFilter
import numpy as np

src_path = r"C:\Users\User\.gemini\antigravity\brain\117ffb21-6064-4b40-ba72-d00f83a0121e\.user_uploaded\media_1787075492319.png"
out_path = r"C:\Users\User\Downloads\sparta-sports-center\public\banner-assets\lotus-petals-transparent.png"

# Load source transparent petals
img = Image.open(src_path).convert("RGBA")

# Create a 1240x1754 blank RGBA canvas
poster_canvas = Image.new("RGBA", (1240, 1754), (0, 0, 0, 0))

# 1. ТОЛЬКО РАЗМЫТЫЕ МАКРО-ЛЕПЕСТКИ (БОКЕ НА ПЕРЕДНЕМ ПЛАНЕ, БЕЗ ЦЕЛЬНЫХ ЦВЕТКОВ)
# Берем отдельные крупные лепестки и накладываем кинематографичный Lens Bokeh Blur
# Кластер 1: Верхний правый угол (крупный лепесток в расфокусе у края кадра)
tr_crop = img.crop((650, 20, 1024, 380))
tr_crop = tr_crop.resize((520, 380), Image.Resampling.LANCZOS)
tr_crop = tr_crop.filter(ImageFilter.GaussianBlur(radius=10))
poster_canvas.paste(tr_crop, (1240 - 450, -40), tr_crop)

# Кластер 2: Слева в воздухе (легкие полупрозрачные лепестки в сильном расфокусе f/1.2)
left_crop = img.crop((0, 60, 420, 460))
left_crop = left_crop.resize((420, 380), Image.Resampling.LANCZOS)
left_crop = left_crop.filter(ImageFilter.GaussianBlur(radius=14))
poster_canvas.paste(left_crop, (-20, 880), left_crop)

# 2. МЯГКАЯ МАСКА ДЛЯ ЗАЩИТЫ БАЛЕРИНЫ И ТЕКСТА
canvas_arr = np.array(poster_canvas)
y_coords, x_coords = np.ogrid[:1754, :1240]

# Полная защита балерины в центре
dist_ballerina = ((x_coords - 720)**2 / (360**2)) + ((y_coords - 730)**2 / (440**2))
ballerina_mask = np.clip((dist_ballerina - 0.75) / 0.35, 0, 1)

# Полная защита контактов и адресов
contacts_dist = ((np.maximum(0, x_coords - 720))**2 / (280**2)) + ((np.maximum(0, y_coords - 1240))**2 / (280**2))
contacts_mask = np.clip(1.0 - np.exp(-contacts_dist * 4.0), 0, 1)

addresses_dist = ((np.maximum(0, 480 - x_coords))**2 / (240**2)) + ((np.maximum(0, y_coords - 1320))**2 / (240**2))
addresses_mask = np.clip(1.0 - np.exp(-addresses_dist * 4.0), 0, 1)

benefits_mask = np.ones((1754, 1240), dtype=np.float32)
benefits_mask[480:830, :530] = 0.0

final_mask = np.minimum(np.minimum(contacts_mask, addresses_mask), np.minimum(benefits_mask, ballerina_mask))

# Применяем маску и делаем лепестки мягкими и эфирными
canvas_arr[:, :, 3] = (canvas_arr[:, :, 3] * final_mask * 0.85).astype(np.uint8)

final_img = Image.fromarray(canvas_arr, mode="RGBA")
final_img.save(out_path, format="PNG")
print(f"[OK] Successfully created pure macro-bokeh out-of-focus petals at: {out_path}")
