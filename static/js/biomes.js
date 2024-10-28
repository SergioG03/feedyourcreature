const biomes = {
    light: {
        backgroundColor: '#f0f0f0',
        backgroundImage: '/static/images/forestday.jpg',
        playerColor: '#000000',
        speed: 5
    },
    dark: {
        backgroundColor: '#202020',
        backgroundImage: '/static/images/forestnight.jpg',
        playerColor: '#ffffff',
        speed: 4
    }
};

function getBiomeProperties(biomeName) {
    return biomes[biomeName] || biomes.light;
}