// index.js

// --- 1. Importaciones ---
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { readTextFromFile } from './fileReader.js';
import readline from 'readline';

// --- 2. Configuración inicial ---
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// --- 3. Función principal del Chatbot ---
async function main() {
  try {
    console.log("Iniciando chatbot RAG con memoria...");

    const filePath = 'articulo.txt';
    const knowledge = await readTextFromFile(filePath);

    if (!knowledge) {
      console.log("No se pudo cargar la base de conocimiento. Abortando.");
      return;
    }

    console.log("Base de conocimiento cargada. ¡Estoy listo para tus preguntas!");
    console.log('Escribe "salir" para terminar el chat.\n');

    // ===================================================================
    // ¡NUEVO! Aquí creamos el array que guardará la memoria del chat.
    const chatHistory = [];
    // ===================================================================

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const chatLoop = () => {
      rl.question("Tú: ", async (userQuestion) => {
        if (userQuestion.toLowerCase() === 'salir') {
          console.log("\n¡Hasta luego!");
          rl.close();
          return;
        }

        // ===================================================================
        // ¡MODIFICADO! Construimos un prompt más complejo en formato de array.
        // Este es el formato que el SDK de Gemini entiende para el historial.
        const systemInstruction = `
          Basándote únicamente en el siguiente texto de contexto y en el historial de la conversación, responde la nueva pregunta del usuario.
          Si la respuesta no se encuentra en el texto, responde "No tengo información suficiente para responder a esa pregunta".

          --- TEXTO DE CONTEXTO ---
          ${knowledge}
          --- FIN DEL TEXTO ---
        `;

        // El array 'contents' que enviaremos a la API
        const contents = [
            // 1. Las instrucciones y el conocimiento base van primero
            { role: "user", parts: [{ text: systemInstruction }] },
            { role: "model", parts: [{ text: "Entendido. Estoy listo para responder basándome en el texto proporcionado y el historial de la conversación." }] },
            
            // 2. Aquí insertamos TODO el historial de chat acumulado
            ...chatHistory,

            // 3. Finalmente, añadimos la nueva pregunta del usuario
            { role: "user", parts: [{ text: userQuestion }] }
        ];
        
        // La llamada a la API ahora usa el objeto 'contents'
        const result = await model.generateContent({ contents });
        const response = result.response;
        const responseText = response.text();
        
        console.log(`\nChatbot: ${responseText}\n`);

        // ¡NUEVO! Actualizamos la memoria con el último intercambio.
        chatHistory.push({ role: "user", parts: [{ text: userQuestion }] });
        chatHistory.push({ role: "model", parts: [{ text: responseText }] });
        // ===================================================================

        chatLoop();
      });
    };

    chatLoop();

  } catch (error) {
    console.error("Ha ocurrido un error crítico:", error);
  }
}

// --- 4. Ejecutar el programa ---
main();