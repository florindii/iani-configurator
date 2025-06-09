const fs = require('fs').promises;
const path = require('path');

async function convertSvgToGlb(svgPath, glbPath) {
  const placeholder = path.join(__dirname, 'placeholder.glb');

  // Check if placeholder exists
  try {
    await fs.access(placeholder);
  } catch (err) {
    console.error('❌ placeholder.glb is missing!');
    throw new Error('Placeholder .glb file not found');
  }

  // Simulate conversion by copying the placeholder
  await fs.copyFile(placeholder, glbPath);
}

module.exports = convertSvgToGlb;
