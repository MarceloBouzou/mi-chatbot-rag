// fileReader.js

import fs from 'fs/promises';
import path from 'path';
// ¡Importamos la nueva librería!
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Lee el contenido de texto de un archivo (.txt o .pdf).
 * @param {string} filePath La ruta al archivo.
 * @returns {Promise<string>} El contenido de texto del archivo.
 */
export async function readTextFromFile(filePath) {
  try {
    console.log(`Leyendo el archivo: ${filePath}`);
    
    const extension = path.extname(filePath).toLowerCase();
    
    if (extension === '.txt') {
      const textContent = await fs.readFile(filePath, 'utf-8');
      return textContent;

    } else if (extension === '.pdf') {
      const data = new Uint8Array(await fs.readFile(filePath));
      // Cargar el PDF usando la nueva librería
      const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
      let fullText = '';

      // Iterar por cada página del PDF para extraer el texto
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n'; // Agregamos el texto de la página al total
      }
      return fullText.trim();

    } else {
      throw new Error(`Tipo de archivo no soportado: ${extension}`);
    }
  } catch (error) {
    console.error("Error al leer el archivo:", error.message);
    return null; 
  }
}