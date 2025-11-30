export class FileHelper {

  /**
   * Convert a file to base64
   * @param file
   */
  static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        // reader.result will be a data URI string (e.g., "data:image/png;base64,...")
        resolve(reader.result as string);
      };

      reader.onerror = (error) => {
        reject(error);
      };

      // Read the file as a data URL, which includes the Base64 representation
      reader.readAsDataURL(file);
    });
  }
}
