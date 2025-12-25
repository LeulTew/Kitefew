
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsDir = path.join(__dirname, '../src/assets');

async function convertImages() {
  try {
    if (!fs.existsSync(assetsDir)) {
      console.error('Assets directory not found:', assetsDir);
      return;
    }

    const files = fs.readdirSync(assetsDir);
    const pngFiles = files.filter(file => path.extname(file).toLowerCase() === '.png');

    if (pngFiles.length === 0) {
      console.log('No PNG files found to convert.');
      return;
    }

    console.log(`Found ${pngFiles.length} PNG files. Converting...`);

    for (const file of pngFiles) {
      const inputPath = path.join(assetsDir, file);
      const outputPath = path.join(assetsDir, path.basename(file, '.png') + '.webp');

      await sharp(inputPath)
        .webp({ quality: 80 })
        .toFile(outputPath);

      console.log(`Converted: ${file} -> ${path.basename(outputPath)}`);
    }

    console.log('Conversion complete!');

  } catch (err) {
    console.error('Error converting images:', err);
  }
}

convertImages();
