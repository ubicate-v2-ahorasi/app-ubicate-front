// Servidor Express para SPA Angular en /dist
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

const distPath = path.join(__dirname, 'dist'); // veremos en el Dockerfile que copiamos aquí
app.use(express.static(distPath, { maxAge: '1y', etag: true }));

// Fallback SPA: cualquier ruta -> index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => console.log(`Listening on ${port}`));
