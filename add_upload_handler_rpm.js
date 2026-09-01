import fs from 'fs';

const filePath = 'src/components/RpmScreen.tsx';
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
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = \`\${Date.now()}-\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
      const filePath = \`\${profile.id}/\${fileName}\`;
      
      const { error: uploadErr } = await supabase.storage
        .from('rpm')
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadErr) {
        throw new Error('Gagal mengupload file: ' + uploadErr.message);
      }
      
      setUploadProgress(60);
      
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
      
      const { data: dbData, error: dbErr } = await supabase.from('rpm_files').insert([metadata]).select();
      
      setUploadProgress(100);
      
      const newItem: RpmItem = {
        id: dbData && dbData.length > 0 ? dbData[0].id : \`upload-\${Date.now()}\`,
        title: formData.title,
        subject: formData.subject,
        grade: formData.grade,
        author: profile.nama_lengkap,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        topic: formData.topic || 'Upload',
        status: 'Selesai',
        tags: ['File Upload'],
        content: filePath 
      };
      setRpmList([newItem, ...rpmList]);
      
      if (dbErr && dbErr.code === 'PGRST205') {
        console.warn('rpm_files table does not exist yet. Using local state.');
      } else if (dbErr) {
         console.error('Metadata save error:', dbErr);
      }
      
      setCreationMode('idle');
      setUploadFile(null);
      setFormData({...formData, title: '', topic: ''});
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
