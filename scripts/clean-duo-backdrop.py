from PIL import Image, ImageDraw, ImageFilter
import numpy as np

src_path = 'public/banner-assets/sparta-duo-concept-master.jpg'
im = Image.open(src_path).convert('RGB')
w, h = im.size

# Clean the header line under the crest (Y: 200..250, X: 300..712)
crop_sky = im.crop((300, 150, 712, 195)).filter(ImageFilter.GaussianBlur(10))
im.paste(crop_sky, (300, 205))

# Clean the raster "СТАНЬ ЧАСТЬЮ КОМАНДЫ!" (Y: 270..360, X: 470..950)
crop_stadium = im.crop((470, 150, 950, 240)).filter(ImageFilter.GaussianBlur(12))
im.paste(crop_stadium, (470, 275))

# Clean the raster "БОЛЬШОЙ ТЕННИС ОТКРЫВАЕТ НАБОР" (Y: 1060..1380, X: 400..980)
crop_vortex = im.crop((400, 950, 980, 1050)).resize((580, 320)).filter(ImageFilter.GaussianBlur(15))
im.paste(crop_vortex, (400, 1070))

# Clean the bottom cards and footer (Y: 1390..2048) with smooth dark navy vignette
grad = Image.new('RGBA', (w, 660), (0, 0, 0, 0))
draw = ImageDraw.Draw(grad)
for y in range(660):
    alpha = int(min(255, (y / 280.0) ** 1.5 * 255))
    draw.line([(0, y), (w, y)], fill=(4, 18, 26, alpha))

im.paste(grad.convert('RGB'), (0, 1388), mask=grad.split()[3])

out_path = 'public/banner-assets/sparta-duo-clean-bg.jpg'
im.save(out_path, 'JPEG', quality=98)
print('✅ Clean backdrop successfully saved to:', out_path)
