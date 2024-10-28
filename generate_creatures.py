from PIL import Image, ImageDraw
import os

def create_pixel_creature(color_scheme, size=32):
    # Create a new image with transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Basic creature shapes (8x8 grid scaled up to 32x32)
    templates = {
        'blob': [
            "  ****  ",
            " ****** ",
            "********",
            "********",
            "********",
            "********",
            " ****** ",
            "  ****  "
        ],
        'ghost': [
            "  ****  ",
            " ****** ",
            "** ** **",
            "********",
            "********",
            "********",
            "** ** **",
            " **  ** "
        ],
        'monster': [
            " **  ** ",
            "********",
            "********",
            "** ** **",
            "********",
            " ****** ",
            "  ****  ",
            "   **   "
        ]
    }
    
    # Color schemes
    colors = {
        'red': [(255, 0, 0, 255), (200, 0, 0, 255)],
        'blue': [(0, 0, 255, 255), (0, 0, 200, 255)],
        'green': [(0, 255, 0, 255), (0, 200, 0, 255)],
        'purple': [(255, 0, 255, 255), (200, 0, 200, 255)]
    }
    
    creature_type = list(templates.keys())[hash(str(color_scheme)) % len(templates)]
    template = templates[creature_type]
    color = colors[color_scheme]
    
    scale = size // 8
    for y in range(8):
        for x in range(8):
            if template[y][x] == '*':
                # Draw a rectangle for each pixel
                x1, y1 = x * scale, y * scale
                x2, y2 = x1 + scale, y1 + scale
                pixel_color = color[0] if (x + y) % 2 == 0 else color[1]
                draw.rectangle([x1, y1, x2, y2], fill=pixel_color)
    
    return img

def generate_all_creatures():
    # Create directory if it doesn't exist
    os.makedirs('static/images/creatures', exist_ok=True)
    
    # Generate creatures with different color schemes
    color_schemes = ['red', 'blue', 'green', 'purple']
    creatures = {}
    
    for color in color_schemes:
        img = create_pixel_creature(color)
        filename = f'creature_{color}.png'
        filepath = f'static/images/creatures/{filename}'
        img.save(filepath)
        creatures[color] = filename
    
    return creatures

if __name__ == "__main__":
    generate_all_creatures()
