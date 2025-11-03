const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(__dirname + '/dist/ubicate-taller-2'));

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname + '/dist/ubicate-taller-2/index.html'));
});

// Puerto dinámico de Heroku
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Ubicate Taller 2 corriendo en puerto ${port}`);
});
