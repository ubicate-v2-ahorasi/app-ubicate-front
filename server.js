// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Nueva estructura de Angular 17+: dist/app-name/browser/
const distPath = path.join(__dirname, 'dist', 'ubicate-taller-2', 'browser');

// Servir archivos estáticos desde browser/
app.use(express.static(distPath));

// Para Angular Router
app.get('/*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');

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
app.listen(port, () => {});
