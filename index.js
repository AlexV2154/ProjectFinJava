const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuración para servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));
//Nuevo cambio
console.log("Hola mundo");
// Ruta principal para el chat
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Lista en memoria para usuarios y mensajes
const users = [];
const messages = [];

// Configurar eventos de conexión
io.on("connection", (socket) => {
  console.log("Un usuario se ha conectado");

  // Registro de usuario
  socket.on("register", (user) => {
    console.log(`Usuario registrado: ${user.name}`);
    socket.user = user;
    users.push(user); // Almacenar usuario en memoria
  });

  // Escuchar mensajes del chat
  socket.on("chat message", (data) => {
    console.log("Mensaje recibido:", data);

    const { name, image, message } = data;
    messages.push({ name, image, message }); // Almacenar mensaje en memoria

    // Emitir mensaje a todos los usuarios conectados
    io.emit("chat message", { name, image, message });
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se ha desconectado");
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
