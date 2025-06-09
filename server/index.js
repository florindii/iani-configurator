const express = require('express');
const cors = require('cors'); // move this up here
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const convertSvgToGlb = require('./convertSvgToGlb');

const app = express();

// ✅ CORS needs to be added BEFORE any routes
app.use(cors());

const upload = multer({ dest: 'uploads/' });


app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const fileName = `${Date.now()}.glb`;
  const destPath = path.join(__dirname, 'glbs', fileName);
  fs.renameSync(file.path, destPath);

  res.json({ url: `/glbs/${fileName}` });
});


app.use('/glbs', express.static(path.join(__dirname, 'glbs')));

app.listen(3001, () => console.log('Server running on http://localhost:3001'));
