const tailwind = require('tailwindcss');
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const fs = require('fs');
const path = require('path');

const srcStyles = path.join(__dirname, 'src/styles.css');
const outStyles = path.join(__dirname, 'dist/ubicate-taller-2/browser/styles.css');

const src = fs.readFileSync(srcStyles, 'utf8');

postcss([tailwind, autoprefixer])
  .process(src, { from: srcStyles, to: outStyles })
  .then(result => {
    fs.mkdirSync(path.dirname(outStyles), { recursive: true });
    fs.writeFileSync(outStyles, result.css);
    console.log('CSS processed successfully');
  })
  .catch(err => {
    console.error('CSS processing failed:', err);
    process.exit(1);
  });
