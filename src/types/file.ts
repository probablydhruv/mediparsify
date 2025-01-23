export interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  onUploadSuccess: (fileId: string) => void;
  onReset: () => void;
}

export interface UploadState {
  state: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  progress: number;
}