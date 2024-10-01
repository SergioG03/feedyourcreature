const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
require('dotenv').config(); // Cargar las variables de entorno desde .env

// Configuración de la base de datos de MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Conectado a MongoDB');
}).catch(err => {
    console.error('Error conectando a MongoDB', err);
});

// Crear un modelo para almacenar usuarios
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    characters: [{
        name: String,
        image: String,
        health: { type: Number, default: 50 },
        stamina: { type: Number, default: 50 },
        energy: { type: Number, default: 50 }
    }]
});

const User = mongoose.model('User', UserSchema);

// Inicialización de Express
const app = express();
app.use(bodyParser.json());

// Configurar la carpeta de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuración de la sesión (almacenada en MongoDB)
const store = new MongoDBStore({
    uri: process.env.MONGODB_URI, // Usar la URI de conexión a MongoDB Atlas
    collection: 'sessions'
});

app.use(session({
    secret: 'supersecretkey', // Clave para cifrar la cookie
    resave: false,
    saveUninitialized: false,
    store: store,  // Almacenar sesiones en MongoDB
    cookie: { maxAge: 1000 * 60 * 60 * 24 }  // 1 día de duración
}));

// Ruta principal para mostrar el index.ejs
app.get('/', (req, res) => {
    res.render('index');
});

// Ruta de registro de usuario
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Crear y guardar el nuevo usuario
    const newUser = new User({ username, password });
    await newUser.save();

    // Crear sesión para el nuevo usuario
    req.session.user = newUser;
    res.json({ message: 'Usuario registrado y sesión iniciada', user: newUser });
});

// Ruta de login de usuario
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Verificar si el usuario existe
    const user = await User.findOne({ username, password });
    if (!user) {
        return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // Crear sesión para el usuario
    req.session.user = user;
    res.json({ message: 'Sesión iniciada', user }); // Devuelve el usuario con el mensaje
});

// Ruta para obtener los personajes del usuario
app.post('/characters', async (req, res) => {
    const { name, image } = req.body;
    if (!req.session.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const user = await User.findById(req.session.user._id);
    user.characters.push({ name, image });
    await user.save();

    res.status(201).json(user.characters);
});

// Ruta para obtener todos los personajes del usuario
app.get('/characters', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const user = await User.findById(req.session.user._id);
    res.json(user.characters);
});

// Ruta para obtener un personaje específico por su ID
app.get('/characters/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const user = await User.findById(req.session.user._id);
    const character = user.characters.id(req.params.id); // Encuentra el personaje por ID
    if (!character) {
        return res.status(404).json({ message: 'Personaje no encontrado' });
    }

    res.json(character); // Devuelve el personaje encontrado
});

// Ruta para eliminar un personaje específico
app.delete('/characters/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const user = await User.findById(req.session.user._id);

    if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Busca el personaje por su ID
    const character = user.characters.id(req.params.id);
    if (!character) {
        return res.status(404).json({ message: 'Personaje no encontrado' });
    }

    // Elimina el personaje del array
    user.characters.pull({ _id: req.params.id });

    await user.save(); // Guarda los cambios en el usuario

    res.status(204).send(); // Envia respuesta de éxito
});

// Ruta de logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Error al cerrar sesión' });
        }
        res.json({ message: 'Sesión cerrada' });
    });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
