// Variable global para activar/desactivar la lectura de texto
let isReading = false;
let speechSynthesisInstance = window.speechSynthesis;
let utterance = new SpeechSynthesisUtterance();

// Modo Accesible: cambiar tamaños de letra y contraste
function toggleAccessibility() {
    document.body.classList.toggle('accessible-mode'); // Añade o quita la clase de modo accesible
    if (isReading) {
        readText("Modo accesible activado."); // Describir el cambio de modo
    }
}

// Leer texto: activamos o desactivamos la lectura en voz alta
function toggleReadText() {
    const readButton = document.getElementById("read-text-button");

    if (isReading) {
        // Detener la lectura
        speechSynthesisInstance.cancel();
        readButton.textContent = "Leer Texto";
        isReading = false;
    } else {
        // Iniciar la lectura del texto
        readButton.textContent = "Dejar de leer texto";
        isReading = true;
        speak("Modo lectura activado. Puedes desactivarlo cuando quieras.");
    }
}

// Función para que el texto sea leído en voz alta
function speak(text) {
    if (isReading) {
        utterance.text = text;
        utterance.lang = 'es-ES';
        speechSynthesisInstance.speak(utterance);
    }
}

// Función para leer texto si el modo de lectura está activo
function readText(text) {
    if (isReading) {
        speak(text);
    }
}

// Otras funciones del juego (login, registro, etc.)

// Función para mostrar la sección de inicio de sesión
function showLogin() {
    hideAllSections();
    document.getElementById('login').style.display = 'block';
    readText('Sección de inicio de sesión.');
}

// Función para mostrar la sección de registro
function showRegister() {
    hideAllSections();
    document.getElementById('register').style.display = 'block';
    readText('Sección de registro.');
}

// Función para mostrar la sección "About"
function showAbout() {
    hideAllSections();
    document.getElementById('about').style.display = 'block';
    readText('Sección acerca de.');
}

// Función para ocultar todas las secciones
function hideAllSections() {
    const sections = ['login', 'register', 'play-section', 'create-character', 'about', 'game'];
    sections.forEach(section => {
        document.getElementById(section).style.display = 'none';
    });
}

// Función para mostrar los personajes del usuario
function showCharacters() {
    hideAllSections();
    document.getElementById('create-character').style.display = 'block';
    loadCharacters(); // Cargar personajes al mostrar
    readText('Sección para ver o crear personajes.');
}

// Función de registro
async function register() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    // Verifica que los campos no estén vacíos
    if (!username || !password) {
        alert('Por favor, completa todos los campos.');
        readText('Por favor, completa todos los campos.');
        return;
    }

    const response = await fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
        const result = await response.json();
        alert(result.message); // Muestra mensaje de éxito
        readText(result.message);
        currentUser = result.user; // Almacena el usuario actual
        document.getElementById('welcome-user').innerText = currentUser.username; // Muestra el nombre del usuario
        document.getElementById('logout-button').style.display = 'block';
        document.getElementById('login-button').style.display = 'none'; // Oculta botón de iniciar sesión
        hideAllSections();
        document.getElementById('play-section').style.display = 'block'; // Muestra la sección de juego
    } else {
        const result = await response.json();
        alert(result.message); // Muestra mensaje de error
        readText(result.message);
    }
}

// Función de inicio de sesión
async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
        currentUser = await response.json();
        document.getElementById('welcome-user').innerText = currentUser.user.username; // Asegúrate de acceder correctamente a 'username'
        document.getElementById('logout-button').style.display = 'block';
        document.getElementById('login-button').style.display = 'none'; // Ocultar botón de iniciar sesión
        hideAllSections();
        document.getElementById('play-section').style.display = 'block';
        readText(`Bienvenido ${currentUser.user.username}`);
    } else {
        const result = await response.json();
        alert(result.message);
        readText(result.message);
    }
}

// Función de cierre de sesión
async function logout() {
    await fetch('/logout', { method: 'POST' });
    currentUser = null;
    document.getElementById('logout-button').style.display = 'none';
    document.getElementById('login-button').style.display = 'block'; // Mostrar botón de iniciar sesión
    hideAllSections();
    showLogin();
    readText('Has cerrado sesión. Regresa a la página de inicio de sesión.');
}

// Función para crear un personaje
async function createCharacter() {
    const name = document.getElementById('character-name').value;
    const image = document.getElementById('character-image').value;

    if (!name || !image) {
        alert('Por favor, ingresa un nombre y una URL de imagen.');
        readText('Por favor, ingresa un nombre y una URL de imagen.');
        return;
    }

    const response = await fetch('/characters', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, image }),
    });

    if (response.ok) {
        const characters = await response.json(); // Obtiene todos los personajes
        currentCharacter = characters[characters.length - 1]; // Asigna el último personaje creado
        localStorage.setItem('lastCharacterId', currentCharacter._id); // Almacena el ID del último personaje creado
        alert('Personaje creado con éxito');
        readText('Personaje creado con éxito.');
        loadCharacters(); // Actualiza la lista de personajes
        document.getElementById('character-name').value = ''; // Limpiar el campo
        document.getElementById('character-image').value = ''; // Limpiar el campo
    } else {
        const result = await response.json();
        alert(result.message);
        readText(result.message);
    }
}

// Función para mostrar los personajes del usuario
async function loadCharacters() {
    const response = await fetch('/characters');
    const characters = await response.json();
    const charactersContainer = document.getElementById('characters-list');
    charactersContainer.innerHTML = ''; // Limpiar el contenedor antes de cargar

    characters.forEach(character => {
        const characterDiv = document.createElement('div');
        characterDiv.innerHTML = `
            <p>${character.name} <img src="${character.image}" alt="${character.name}" width="50"></p>
            <button onclick="deleteCharacter('${character._id}')">Delete</button>
            <button onclick="showGame('${character._id}')">Play</button> <!-- Botón Jugar -->
        `;
        charactersContainer.appendChild(characterDiv);
    });
    readText('Lista de personajes cargada.');
}

// Función para eliminar un personaje
async function deleteCharacter(characterId) {
    const confirmDelete = confirm('¿Estás seguro de que deseas eliminar este personaje?');
    if (!confirmDelete) {
        readText('Eliminación cancelada.');
        return; // Salir si el usuario no confirma
    }

    const response = await fetch(`/characters/${characterId}`, {
        method: 'DELETE',
    });

    if (response.ok) {
        alert('Personaje eliminado con éxito');
        readText('Personaje eliminado con éxito.');
        loadCharacters(); // Actualiza la lista de personajes
    } else {
        alert('Error al eliminar el personaje. Por favor, intenta nuevamente.');
        readText('Error al eliminar el personaje. Por favor, intenta nuevamente.');
    }
}

// Función para mostrar la sección de juego
async function showGame(characterId) {
    hideAllSections();
    if (characterId) {
        await loadCharacter(characterId);
    } else {
        alert('No hay personaje disponible para jugar.');
        readText('No hay personaje disponible para jugar.');
    }
}

// Función para cargar un personaje específico para jugar
async function loadCharacter(characterId) {
    const response = await fetch(`/characters/${characterId}`);

    if (response.ok) {
        currentCharacter = await response.json();
        document.getElementById('game-character-name').innerText = currentCharacter.name;
        document.getElementById('game-character-image').src = currentCharacter.image;
        document.getElementById('character-health').innerText = currentCharacter.health || 50;
        document.getElementById('character-stamina').innerText = currentCharacter.stamina || 50;
        document.getElementById('character-energy').innerText = currentCharacter.energy || 50;

        document.getElementById('game').style.display = 'block'; // Muestra la sección de juego
        readText(`Jugando como ${currentCharacter.name}`); // Describir la acción de jugar como un personaje
    } else {
        alert('Error al cargar el personaje.');
        readText('Error al cargar el personaje.');
    }
}

// Función para volver al menú principal desde "Jugar" o "Tus Personajes"
function goToMainMenu() {
    hideAllSections();
    document.getElementById('play-section').style.display = 'block'; // Regresa a la sección principal
    readText('Regresaste al menú principal.');
}

// Funciones de acción del juego
function feed() {
    let stamina = parseInt(document.getElementById('character-stamina').innerText);
    stamina += 5; // Aumenta la estamina
    document.getElementById('character-stamina').innerText = stamina;
    readText('Aumentaste la estamina.'); // Describir la acción de aumentar la estamina
}

function sleep() {
    let energy = parseInt(document.getElementById('character-energy').innerText);
    energy += 5; // Aumenta la energía
    document.getElementById('character-energy').innerText = energy;
    readText('Aumentaste la energía.'); // Describir la acción de aumentar la energía
}

function fight() {
    let health = parseInt(document.getElementById('character-health').innerText);
    const randomEffect = Math.random() < 0.5 ? -2 : 3; // Pierde 2 o gana 3 de vida aleatoriamente
    health += randomEffect;
    document.getElementById('character-health').innerText = health; // Actualiza la salud

    // Evitar que la salud baje de 0
    if (health < 0) {
        health = 0;
        document.getElementById('character-health').innerText = health;
        alert("¡Tu personaje ha caído!");
        readText('¡Tu personaje ha caído!'); // Describir la acción si el personaje cae
    } else {
        readText(`La salud de tu personaje ahora es ${health}.`); // Describir el estado de salud del personaje
    }
}
