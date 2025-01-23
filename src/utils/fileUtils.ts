export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: "Only PDF, JPEG, and PNG files are allowed" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { isValid: false, error: "Maximum file size is 5MB" };
  }
  return { isValid: true };
};

export const uploadFileToSupabase = async (file: File, supabase: any) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${crypto.randomUUID()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('temp_pdfs')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data: fileRecord, error: dbError } = await supabase
    .from('uploaded_files')
    .insert({
      filename: file.name,
      file_path: filePath,
      content_type: file.type,
      size: file.size
    })
    .select()
    .single();

  if (dbError) throw dbError;

  return fileRecord;
};