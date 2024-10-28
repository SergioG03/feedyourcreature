
import os
from PIL import Image, ImageDraw

def create_forest_background(is_day=True, width=800, height=600):
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    if is_day:
        # Create day forest gradient (blue sky to green ground)
        for y in range(height):
            r = int(135 * (1 - y/height))  # Sky blue to dark green
            g = int(206 * (1 - y/height) + 120 * (y/height))
            b = int(235 * (1 - y/height))
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    else:
        # Create night forest gradient (dark blue to darker green)
        for y in range(height):
            r = int(20 * (1 - y/height))  # Dark blue to darker green
            g = int(20 * (1 - y/height) + 40 * (y/height))
            b = int(50 * (1 - y/height))
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    return img

# Create images directory if it doesn't exist
os.makedirs('static/images', exist_ok=True)

# Create and save day forest
day_forest = create_forest_background(True)
day_forest.save('static/images/forestday.jpg', quality=95)

# Create and save night forest
night_forest = create_forest_background(False)
night_forest.save('static/images/forestnight.jpg', quality=95)
