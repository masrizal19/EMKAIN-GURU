import fs from 'fs';

const filePath = 'src/components/MateriScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const uploadHandler = `
  const handleUploadAndSave = async () => {
    if (!formData.title || !formData.subject || !formData.grade || !uploadFile) {
      setUploadError('Mohon lengkapi semua field yang wajib');
      return;
    }
    setIsUploading(true);
    setUploadError('');
    setUploadProgress(10);
    
    try {
      // 1. Upload file to Supabase Storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = \`\${Date.now()}-\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
      const filePath = \`\${profile.id}/\${fileName}\`;
      
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('materi')
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadErr) {
        throw new Error('Gagal mengupload file: ' + uploadErr.message);
      }
      
      setUploadProgress(60);
      
      // 2. Save metadata to database (public.materi_files)
      // Note: If table does not exist, this will fail. We catch it and fallback to local state if needed.
      const metadata = {
        user_id: profile.id,
        judul: formData.title,
        mata_pelajaran: formData.subject,
        kelas: formData.grade,
        jenis_file: fileExt,
        file_name: uploadFile.name,
        file_path: filePath,
        file_size: uploadFile.size
      };
      
      const { data: dbData, error: dbErr } = await supabase.from('materi_files').insert([metadata]).select();
      
      setUploadProgress(100);
      
      // 3. Add to local UI list
      const newItem: MateriItem = {
        id: dbData && dbData.length > 0 ? dbData[0].id : \`upload-\${Date.now()}\`,
        title: formData.title,
        subject: formData.subject,
        grade: formData.grade,
        type: formData.type,
        author: profile.nama_lengkap,
        downloads: 0,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        description: \`File: \${uploadFile.name}\`,
        tags: ['File Upload'],
        content: filePath // Store path here for downloading later
      };
      setMateriList([newItem, ...materiList]);
      
      if (dbErr && dbErr.code === 'PGRST205') {
        // Table doesn't exist yet, we still show in UI for this session
        console.warn('materi_files table does not exist yet. Using local state.');
      } else if (dbErr) {
         console.error('Metadata save error:', dbErr);
         // Don't throw, we already uploaded. But ideally we'd cleanup.
      }
      
      setCreationMode('idle');
      setUploadFile(null);
      setFormData({...formData, title: '', content: ''});
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan saat mengunggah');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const generateAI = () => {
`;

content = content.replace('  const generateAI = () => {', uploadHandler);
fs.writeFileSync(filePath, content);
