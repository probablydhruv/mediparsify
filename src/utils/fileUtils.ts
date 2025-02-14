export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: "Only PDF files are allowed temporarily" };
  }
  if (file.size > 3 * 1024 * 1024) {
    return { isValid: false, error: "Maximum file size is 3MB" };
  }
  return { isValid: true };
};
