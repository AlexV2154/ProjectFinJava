const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const cors = require('cors'); // Para permitir peticiones entre dominios (opcional)

const app = express();
const server = createServer(app);
const io = new Server(server);

// Middleware para analizar el cuerpo de las peticiones y habilitar CORS
app.use(express.json());
app.use(cors());

// Puerto dinámico para Railway
const PORT = process.env.PORT || 3000;

// Arreglos en memoria para almacenar los usuarios y los mensajes
let users = [];
let messages = [];

// Ruta para servir el archivo HTML
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Ruta para registrar un usuario
app.post('/register', (req, res) => {
  const { name, image } = req.body;
  
  if (!name || !image) {
    return res.status(400).send('El nombre y la imagen son obligatorios.');
  }

  const newUser = { name, image };
  users.push(newUser);

  io.emit('user registered', newUser);
  return res.status(200).send({ message: 'Usuario registrado correctamente', user: newUser });
});

// Ruta para obtener todos los usuarios registrados
app.get('/users', (req, res) => {
  res.status(200).json(users);
});

// Ruta para obtener todos los mensajes
app.get('/messages', (req, res) => {
  res.status(200).json(messages);
});

// Ruta para enviar un mensaje
app.post('/send-message', (req, res) => {
  const { name, image, message } = req.body;

  if (!name || !image || !message) {
    return res.status(400).send('El nombre, la imagen y el mensaje son obligatorios.');
  }

  const newMessage = { name, image, message };
  messages.push(newMessage);

  io.emit('chat message', newMessage);
  return res.status(200).send({ message: 'Mensaje enviado correctamente' });
});

// Manejar eventos de conexión con Socket.IO
io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado');

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

// Iniciar el servidor
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
