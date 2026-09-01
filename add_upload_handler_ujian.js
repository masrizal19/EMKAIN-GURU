import fs from 'fs';

const filePath = 'src/components/UjianScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const uploadHandler = `
  const handleUploadAndSave = async () => {
    if (!examTitle || !examSubject || !examGrade || !uploadFile) {
      setUploadError('Mohon lengkapi semua field yang wajib');
      return;
    }
    setIsUploading(true);
    setUploadError('');
    setUploadProgress(10);
    
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = \`\${Date.now()}-\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
      // user object is not available directly, using a mock ID or if we have it
      // Let's check if profile is available. It seems UjianScreen doesn't have profile prop yet.
      // We'll use a placeholder user_id if not.
      const userId = '12345678-1234-1234-1234-123456789012';
      const filePathStr = \`\${userId}/\${fileName}\`;
      
      const { error: uploadErr } = await supabase.storage
        .from('ujian')
        .upload(filePathStr, uploadFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadErr) {
        throw new Error('Gagal mengupload file: ' + uploadErr.message);
      }
      
      setUploadProgress(60);
      
      const metadata = {
        user_id: userId,
        judul: examTitle,
        mata_pelajaran: examSubject,
        kelas: examGrade,
        jenis_file: fileExt,
        file_name: uploadFile.name,
        file_path: filePathStr,
        file_size: uploadFile.size
      };
      
      const { data: dbData, error: dbErr } = await supabase.from('ujian_files').insert([metadata]).select();
      
      setUploadProgress(100);
      
      const generatedToken = (examSubject.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900));
      const newExam: ExamPackage = {
        id: dbData && dbData.length > 0 ? dbData[0].id : \`exam-\${Date.now()}\`,
        title: examTitle.trim(),
        subject: examSubject,
        grade: examGrade,
        durationMinutes: examDuration,
        totalQuestions: examQuestions,
        type: examType,
        token: generatedToken,
        status: 'Terjadwal',
        participantsCount: 0,
        avgScore: 0,
        dateScheduled: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      };
      setExams([newExam, ...exams]);
      
      if (dbErr && dbErr.code === 'PGRST205') {
        console.warn('ujian_files table does not exist yet. Using local state.');
      } else if (dbErr) {
         console.error('Metadata save error:', dbErr);
      }
      
      setShowCreateModal(false);
      setUploadFile(null);
      setExamTitle('');
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan saat mengunggah');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreateExam = (e: React.FormEvent) => {
`;

content = content.replace('  const handleCreateExam = (e: React.FormEvent) => {', uploadHandler);
fs.writeFileSync(filePath, content);
