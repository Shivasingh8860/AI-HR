import fs from "fs/promises";

export async function validateFileSignature(filePath) {
  try {
    const fileHandle = await fs.open(filePath, "r");
    const stat = await fileHandle.stat();
    if (stat.size < 4) {
      await fileHandle.close();
      return false;
    }
    const buffer = Buffer.alloc(4);
    await fileHandle.read(buffer, 0, 4, 0);
    await fileHandle.close();

    const hex = buffer.toString("hex").toUpperCase();
    
    // PDF: 25 50 44 46 (%PDF)
    if (hex === "25504446") return true;
    // DOCX (ZIP archive signature): 50 4B 03 04
    if (hex.startsWith("504B")) return true;

    return false;
  } catch (error) {
    return false;
  }
}
