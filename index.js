const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const mysql = require("mysql2");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuración para servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "chat_app",
});

db.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
    return;
  }
  console.log("Conectado a la base de datos MySQL");
});

// Ruta principal para el chat
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Ruta para recibir los mensajes de forma tradicional (Postman)
app.post("/message", (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "Faltan datos necesarios (userId, message)" });
  }

  const query = "INSERT INTO messages (user_id, message) VALUES (?, ?)";
  db.query(query, [userId, message], (err, results) => {
    if (err) {
      console.error("Error al guardar el mensaje:", err);
      return res.status(500).json({ error: "Error al guardar el mensaje" });
    }

    console.log("Mensaje guardado en la base de datos:", results);
    res.status(200).json({ message: "Mensaje enviado", messageId: results.insertId });
  });
});

// Ruta para obtener todos los usuarios
app.get("/users", (req, res) => {
  const query = "SELECT * FROM users"; // Consulta para obtener todos los usuarios

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener usuarios:", err);
      return res.status(500).json({ error: "Error al obtener usuarios" });
    }

    res.status(200).json(results); // Devolver los resultados en formato JSON
  });
});

// Ruta para obtener todos los mensajes
app.get("/messages", (req, res) => {
  const query = `
    SELECT messages.id, users.name, messages.message, messages.created_at 
    FROM messages 
    JOIN users ON messages.user_id = users.id
    ORDER BY messages.created_at DESC
  `; // Consulta para obtener los mensajes y el nombre del usuario

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error al obtener mensajes:", err);
      return res.status(500).json({ error: "Error al obtener mensajes" });
    }

    res.status(200).json(results); // Devolver los resultados en formato JSON
  });
});

io.on("connection", (socket) => {
  console.log("Un usuario se ha conectado");

  // Recibir registro de usuario
  socket.on("register", (user) => {
    console.log(`Usuario registrado: ${user.name}`);
    socket.user = user; // Guardar usuario en el socket

    // Insertar usuario en la base de datos
    const insertUserQuery = "INSERT INTO users (name, image) VALUES (?, ?)";
    db.query(insertUserQuery, [user.name, user.image], (err, results) => {
      if (err) {
        console.error("Error al insertar el usuario en la base de datos:", err);
        return;
      }
      console.log("Usuario insertado en la base de datos:", results);
    });
  });

  // Escuchar mensajes del chat
  socket.on("chat message", (data) => {
    console.log("Mensaje recibido:", data);

    const { name, image, message } = data;

    // 1. Verificar si el usuario existe
    const getUserIdQuery = "SELECT id FROM users WHERE name = ?";
    db.query(getUserIdQuery, [name], (err, results) => {
      if (err) {
        console.error("Error al obtener el ID del usuario:", err);
        return;
      }

      if (results.length > 0) {
        const userId = results[0].id;

        // 2. Insertar el mensaje en la base de datos
        const query = "INSERT INTO messages (user_id, message) VALUES (?, ?)";
        db.query(query, [userId, message], (err, results) => {
          if (err) {
            console.error("Error al guardar el mensaje:", err);
            return;
          }

          console.log("Mensaje guardado en la base de datos:", results);

          // 3. Emitir el mensaje a todos los usuarios conectados
          io.emit("chat message", { name, image, message });
        });
      } else {
        console.error("Usuario no encontrado en la base de datos");
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se ha desconectado");
  });
});

// Iniciar el servidor en el puerto 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
