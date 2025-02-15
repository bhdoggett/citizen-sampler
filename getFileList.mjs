import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = path.join(__dirname, "public/samples/national-jukebox");
const outputFilePath = path.join(__dirname, "public/fileList.json");

async function generateFileList() {
  const genres = fs.readdirSync(basePath);
  const fileData = {};

  for (const genre of genres) {
    const genrePath = path.join(basePath, genre, "excerpts");
    if (fs.existsSync(genrePath)) {
      fileData[genre] = fs.readdirSync(genrePath);
    }
  }

  fs.writeFileSync(outputFilePath, JSON.stringify(fileData, null, 2));
  console.log("✅ File list generated successfully!");
}

generateFileList();
