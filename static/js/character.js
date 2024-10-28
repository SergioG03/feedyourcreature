class Character {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 5;
        this.color = 'red';  // Default color/type
        this.images = {};
        this.loadImages();
    }
    
    loadImages() {
        const colors = ['red', 'blue', 'green', 'purple'];
        colors.forEach(color => {
            this.images[color] = loadImage(`/static/images/creatures/creature_${color}.png`);
        });
    }
    
    update() {
        if (keyIsDown(LEFT_ARROW)) this.x -= this.speed;
        if (keyIsDown(RIGHT_ARROW)) this.x += this.speed;
        if (keyIsDown(UP_ARROW)) this.y -= this.speed;
        if (keyIsDown(DOWN_ARROW)) this.y += this.speed;
        
        // Keep character within bounds
        this.x = constrain(this.x, 0, width);
        this.y = constrain(this.y, 0, height);
    }
    
    display() {
        if (this.images[this.color]) {
            imageMode(CENTER);
            image(this.images[this.color], this.x, this.y, 32, 32);
            imageMode(CORNER);
        }
    }

    handleKeyPress(keyCode) {
        // Add any additional key press handling if needed
    }
}
