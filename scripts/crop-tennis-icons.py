from PIL import Image
import numpy as np

def clean_and_crop(path):
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    alpha = arr[:, :, 3]
    
    # Clean noise where alpha < 15
    arr[alpha < 15, 3] = 0
    
    # Find bounding box where alpha >= 20
    non_zero = np.argwhere(arr[:, :, 3] >= 20)
    if non_zero.size > 0:
        y_min, x_min = non_zero.min(axis=0)
        y_max, x_max = non_zero.max(axis=0) + 1
        
        # Add 4px safety margin
        y_min = max(0, y_min - 4)
        x_min = max(0, x_min - 4)
        y_max = min(arr.shape[0], y_max + 4)
        x_max = min(arr.shape[1], x_max + 4)
        
        cropped_arr = arr[y_min:y_max, x_min:x_max]
        result = Image.fromarray(cropped_arr, "RGBA")
        result.save(path, "PNG")
        print(f"Tightly cropped {path} -> new size: {result.size}")

for f in [
    'public/banner-assets/tennis-icon-gift.png',
    'public/banner-assets/tennis-icon-ice.png',
    'public/banner-assets/tennis-icon-license.png',
    'public/banner-assets/tennis-icon-tax.png'
]:
    clean_and_crop(f)
