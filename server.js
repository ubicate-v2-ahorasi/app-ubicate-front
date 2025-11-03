// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Verificar estructura de directorios
console.log('🔍 Verificando estructura de directorios...');
console.log('📁 Directorio actual:', __dirname);

const distPath = path.join(__dirname, 'dist', 'ubicate-taller-2');
console.log('📁 Ruta dist:', distPath);

// Verificar si existe el directorio
if (fs.existsSync(distPath)) {
  console.log('✅ Directorio dist existe');
  const files = fs.readdirSync(distPath);
  console.log('📄 Archivos en dist:', files);
} else {
  console.log('❌ Directorio dist NO existe');

  // Verificar directorios alternativos
  const distRoot = path.join(__dirname, 'dist');
  if (fs.existsSync(distRoot)) {
    console.log('📁 Contenido de dist/:', fs.readdirSync(distRoot));
  }
}

// Servir archivos estáticos
app.use(express.static(distPath));

// Para Angular Router
app.get('/*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  console.log('🔍 Buscando index.html en:', indexPath);

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <h1>Error 404</h1>
      <p>No se pudo encontrar index.html en: ${indexPath}</p>
      <p>Directorio actual: ${__dirname}</p>
    `);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Ubicate Taller 2 corriendo en puerto ${port}`);
});
