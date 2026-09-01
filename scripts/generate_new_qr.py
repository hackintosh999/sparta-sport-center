import subprocess
import sys

try:
    import qrcode
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "qrcode", "pillow"])
    import qrcode
from PIL import Image

url = "https://vk.ru/lotos_dance74"
out_path = r"public/banner-assets/vk-qr-real.png"

# Generate QR code
qr = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_M,
    box_size=16,
    border=1,
)
qr.add_data(url)
qr.make(fit=True)

# Deep pine graphite: (21, 34, 25)
# Warm champagne white: (255, 253, 249)
img = qr.make_image(fill_color=(21, 34, 25), back_color=(255, 253, 249)).convert("RGBA")

# Resize to high-resolution square (e.g. 500x500)
img = img.resize((500, 500), Image.Resampling.NEAREST)
img.save(out_path, format="PNG")
print("QR Code for https://vk.ru/lotos_dance74 generated successfully!")
