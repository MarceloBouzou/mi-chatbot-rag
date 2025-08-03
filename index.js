// index.js - SERVIDOR WEB COMPLETO CON CHATBOT Y MEMORIA
import express from 'express';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { readTextFromFile } from './fileReader.js';

// --- 1. CONFIGURACIÓN INICIAL --
dotenv.config();
const app = express();
const port = process.env.PORT || 3000; // Usa el puerto de OnRender o 3000 en local

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

let knowledge = ''; // Variable para guardar el conocimiento del archivo

// --- 2. MIDDLEWARE ---
// Sirve los archivos estáticos de la carpeta 'public'
app.use(express.static('public'));
// Permite al servidor entender JSON en las peticiones
app.use(express.json());

// --- 3. GESTIÓN DE HISTORIAL (PARA MÚLTIPLES USUARIOS) ---
// En un entorno real, esto se guardaría en una base de datos.
// Por ahora, lo guardamos en memoria. ¡OJO! Se reinicia si el servidor se reinicia.
const chatHistories = {};

// --- 4. LA RUTA PRINCIPAL DEL CHAT ---
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const sessionId = req.ip; 

    if (!chatHistories[sessionId]) {
      chatHistories[sessionId] = [];
    }
    const history = chatHistories[sessionId];

    // =================== CÓDIGO CORREGIDO ===================

    // 1. Define tus instrucciones base en una variable limpia.
    const systemInstruction = `
--- INSTRUCCIONES DE PERSONA ---
Actuás como Nika, la asistente de Nexus Fitness. Sos amable, entusiasta y conocés al detalle todo sobre el gimnasio.
- Usá un tono profesional pero cálido, como si fueras parte del equipo humano del gimnasio.
- NUNCA digas que sos una IA, un modelo de lenguaje o un sistema automatizado. Respondé como si fueras una persona real que trabaja en el gimnasio.
- Si te preguntan por gustos u opiniones, respondé como alguien apasionado por el entrenamiento, el bienestar y la comunidad Nexus. Por ejemplo: "¡Me gusta mucho el ambiente que se vive en nuestras clases de grupo, hay mucha buena onda!"
- Sé claro y directo, evitá dar vueltas o extenderte innecesariamente.

--- INSTRUCCIONES DE CONOCIMIENTO ---
Basándote únicamente en el siguiente texto y en el historial de la conversación, respondé la nueva pregunta del usuario.
El texto es tu única fuente de verdad sobre los servicios, beneficios, horarios, precios y características de Nexus Fitness.

--- INSTRUCCIONES DE CONOCIMIENTO Y DERIVACIÓN ---
Si la respuesta a la pregunta del usuario NO se encuentra en el texto de contexto, NO digas que no sabés, que no tenés datos o que sos una IA. Respondé EXACTAMENTE con la siguiente frase, sin agregar nada más:
"Ok! Ahora mismo no tengo la respuesta de tu pregunta. Si querés, te puedo poner en contacto con alguien del equipo para que te puedan ayudar."
`;

    // 2. Combina las instrucciones con el conocimiento en un solo prompt.
    const fullPrompt = `
${systemInstruction}

--- TEXTO DE CONTEXTO ---
${knowledge}
--- FIN DEL TEXTO ---
`;

    // 3. Construye el array 'contents' para la API.
    const contents = [
      { role: "user", parts: [{ text: fullPrompt }] }, // Usamos el prompt completo aquí
      { role: "model", parts: [{ text: "Entendido. Estoy lista para responder." }] },
      ...history,
      { role: "user", parts: [{ text: userMessage }] }
    ];

    // =================== FIN DEL CÓDIGO CORREGIDO ===================

    const result = await model.generateContent({ contents });
    const botReply = result.response.text();

    // Actualiza el historial para este usuario
    history.push({ role: "user", parts: [{ text: userMessage }] });
    history.push({ role: "model", parts: [{ text: botReply }] });

    // Envía la respuesta de vuelta al cliente (el navegador)
    res.json({ reply: botReply });

  } catch (error) {
    console.error("Error en el endpoint /chat:", error);
    res.status(500).json({ reply: "Lo siento, ocurrió un error en el servidor." });
  }
});

// --- 5. INICIAR EL SERVIDOR ---
// Primero, cargamos el conocimiento y LUEGO iniciamos el servidor.
readTextFromFile('articulo.txt')
  .then(text => {
    knowledge = text;
    console.log("Base de conocimiento cargada exitosamente.");
    app.listen(port, () => {
      console.log(`Servidor escuchando en http://localhost:${port}`);
    });
  })
  .catch(error => {
    console.error("ERROR CRÍTICO: No se pudo cargar la base de conocimiento.", error);
    process.exit(1); // Detiene la aplicación si no puede leer el archivo.
  });
