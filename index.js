// index.js - SERVIDOR WEB COMPLETO CON CHATBOT Y MEMORIA
import express from 'express';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { readTextFromFile } from './fileReader.js';

// --- 1. CONFIGURACIÓN INICIAL ---
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
    // Usaremos la IP del usuario como un "ID de sesión" simple.
    // En una app real, usaríamos un sistema de sesiones más robusto.
    const sessionId = req.ip; 

    // Si no hay historial para este usuario, crea uno nuevo.
    if (!chatHistories[sessionId]) {
      chatHistories[sessionId] = [];
    }

    const history = chatHistories[sessionId];

  // Dentro de la ruta app.post('/chat', ...)

  const systemInstruction = `
    --- INSTRUCCIONES DE PERSONA ---
    Actúa como un fanático experto y entusiasta del juego Maniac Mansion.
    - Usa un tono casual, amigable y un poco geek.
    - NUNCA menciones que eres una IA, un modelo de lenguaje o un programa.
    - Si te preguntan por opiniones o gustos, responde como si realmente tuvieras esos gustos. Por ejemplo, si te preguntan si te gusta el juego, di algo como "¡Me encanta! Es un clásico inolvidable."
    - Sé conciso y ve al grano, pero con entusiasmo.

    --- INSTRUCCIONES DE CONOCIMIENTO ---
    Basándote únicamente en el siguiente texto y en el historial de la conversación, responde la nueva pregunta del usuario.
    El texto es tu única fuente de verdad sobre los hechos del juego.

    --- INSTRUCCIONES DE CONOCIMIENTO Y DERIVACIÓN ---
    Basándote únicamente en el siguiente texto y en el historial de la conversación, responde la nueva pregunta del usuario.
    El texto es tu única fuente de verdad sobre los hechos del juego.

    **¡REGLA CRÍTICA!** Si la respuesta a la pregunta del usuario NO se encuentra en el texto de contexto, NO digas "No tengo información". En su lugar, responde EXACTAMENTE con la siguiente frase, sin añadir nada más:
    "Vaya, esa es una pregunta muy específica y no tengo la respuesta en mi base de datos de Maniac Mansion. Si quieres, te puedo poner en contacto con uno de nuestros expertos humanos para que te ayude."



    --- TEXTO DE CONTEXTO ---
    ${knowledge}
    --- FIN DEL TEXTO ---
  `;

    const contents = [
      { role: "user", parts: [{ text: systemInstruction }] },
      { role: "model", parts: [{ text: "Entendido. Estoy listo para responder." }] },
      ...history,
      { role: "user", parts: [{ text: userMessage }] }
    ];

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