import fs from "fs";
import path from "path";
import { getDocument } from "pdfjs-dist";

// Ensure the PDF file path is provided as a command-line argument
const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error(
    "Please provide the path to the PDF file as the first argument."
  );
  process.exit(1);
}

async function pdfToText(pdfPath) {
  const loadingTask = getDocument(pdfPath);
  const pdfDocument = await loadingTask.promise;

  const numPages = pdfDocument.numPages;
  console.log(`Number of pages: ${numPages}`);

  const output = {
    numPages,
    pages: [],
  };

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageData = {
      page: pageNum,
      textItems: [],
    };

    textContent.items.forEach((item) => {
      const { str, transform } = item;
      const [x, y] = transform.slice(4, 6); // Extracting the x and y coordinates from the transform matrix

      // Calculate width and height based on the transform matrix
      const fontHeight = Math.sqrt(transform[2] ** 2 + transform[3] ** 2);
      const fontWidth = Math.sqrt(transform[0] ** 2 + transform[1] ** 2);

      // Calculate the bounding box corner coordinates
      const topLeft = { x, y };
      const topRight = { x: x + fontWidth, y };
      const bottomLeft = { x, y: y - fontHeight };
      const bottomRight = { x: x + fontWidth, y: y - fontHeight };

      pageData.textItems.push({
        text: str,
        boundingBox: {
          topLeft,
          topRight,
          bottomLeft,
          bottomRight,
        },
      });
    });

    output.pages.push(pageData);
  }

  // Ensure the output directory exists
  const outputDir = "output";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Generate the output file path
  const inputFileName = path.basename(pdfPath, path.extname(pdfPath));
  const outputFileName = `${inputFileName}_result.json`;
  const outputPath = path.join(outputDir, outputFileName);

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Text data saved to ${outputPath}`);
}

pdfToText(pdfPath).catch(console.error);
