const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
require('dotenv').config(); // Cargar variables de entorno desde .env

const mongoURI = process.env.MONGODB_URI;

// Conectar a MongoDB Atlas
mongoose.connect(mongoURI).then(() => {
    console.log('Conectado a MongoDB Atlas');
}).catch(err => {
    console.error('Error conectando a MongoDB Atlas:', err);
});

// Monitorear la conexión de MongoDB
const db = mongoose.connection;

db.on('error', (err) => {
    console.error('Error en la conexión de MongoDB:', err);
});

db.once('open', () => {
    console.log('Conexión abierta con MongoDB Atlas');
});

db.on('disconnected', () => {
    console.log('Desconectado de MongoDB Atlas');
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
    uri: mongoURI,
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
    res.render('language');
});

// Rutas de idiomas
app.get('/index.es.ejs', (req, res) => {
    res.render('index.es.ejs');
});
app.get('/index.en.ejs', (req, res) => {
    res.render('index.en.ejs');
});
app.get('/index.fr.ejs', (req, res) => {
    res.render('index.fr.ejs');
});

app.get('/sessions', async (req, res) => {
    try {
        const sessionCollection = mongoose.connection.collection('sessions');
        const sessions = await sessionCollection.find().toArray();

        // Extraer los IDs de los usuarios y formatear las fechas
        const userIds = sessions.map(session => session.session.user?._id).filter(Boolean);
        
        const onlineUsers = await User.find({ _id: { $in: userIds } });

        // Añadir fecha formateada a las sesiones
        const sessionsWithDate = sessions.map(session => {
            const sessionDate = session.session.cookie.expires
                ? new Date(session.session.cookie.expires).toLocaleString()
                : 'Sin fecha';

            return {
                ...session,
                formattedDate: sessionDate
            };
        });

        // Renderizar la vista con las fechas formateadas
        res.render('sessions', { onlineUsers, sessions: sessionsWithDate });
    } catch (err) {
        console.error('Error obteniendo las sesiones activas:', err);
        res.status(500).send('Error obteniendo las sesiones activas');
    }
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

// Nueva ruta para mostrar los usuarios en línea (sesiones activas)
app.get('/sessions', async (req, res) => {
    const sessions = await store.all(); // Obtener todas las sesiones activas
    const userIds = sessions.map(session => session.user?._id).filter(Boolean);
    const onlineUsers = await User.find({ _id: { $in: userIds } });
    res.render('sessions', { onlineUsers });
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
