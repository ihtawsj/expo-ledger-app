import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

// Ensure photos directory exists
async function ensurePhotosDir() {
  const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

/**
 * Compress and resize photo, then save as file
 * @param {string} uri - Original photo URI (can be base64 data URI or file URI)
 * @param {string} expenseId - Expense ID for unique filename
 * @returns {Promise<string>} - File path of saved photo
 */
export async function savePhoto(uri, expenseId) {
  await ensurePhotosDir();

  // Handle base64 data URI
  let sourceUri = uri;
  if (uri.startsWith('data:')) {
    const base64Data = uri.split(',')[1];
    const tempPath = `${FileSystem.cacheDirectory}temp_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(tempPath, base64Data, { encoding: FileSystem.EncodingType.Base64 });
    sourceUri = tempPath;
  }

  // Compress and resize to ~1000px wide, 70% quality JPEG
  const manipulated = await manipulateAsync(
    sourceUri,
    [{ resize: { width: 1000 } }],
    {
      compress: 0.7,
      format: SaveFormat.JPEG,
      base64: false,
    }
  );

  // Clean up temp file if we created one
  if (sourceUri !== uri && sourceUri.startsWith(FileSystem.cacheDirectory)) {
    await FileSystem.deleteAsync(sourceUri, { idempotent: true });
  }

  // Save to photos directory with unique filename
  const filename = `${expenseId}_${Date.now()}.jpg`;
  const destinationPath = `${PHOTOS_DIR}${filename}`;
  await FileSystem.copyAsync({
    from: manipulated.uri,
    to: destinationPath,
  });

  // Clean up manipulated temp file
  await FileSystem.deleteAsync(manipulated.uri, { idempotent: true });

  return destinationPath;
}

/**
 * Delete a photo file
 * @param {string} filePath - Path to photo file
 */
export async function deletePhoto(filePath) {
  if (filePath && filePath.startsWith(PHOTOS_DIR)) {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  }
}

/**
 * Delete all photos in the photos directory
 */
export async function deleteAllPhotos() {
  const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(PHOTOS_DIR, { idempotent: true });
  }
}

/**
 * Check if a photo path is a file path (vs base64 data URI)
 * @param {string} photoPath - Photo path or data URI
 * @returns {boolean}
 */
export function isFilePath(photoPath) {
  return photoPath && !photoPath.startsWith('data:');
}
