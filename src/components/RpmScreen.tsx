import React, { useState } from 'react';
import { ArrowLeft, Plus, Search, FileText, Download, Wand2, X, FileEdit, Upload, Trash2, FileText as FileIcon } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import jsPDF from 'jspdf';

interface RpmScreenProps {
  profile: UserProfile;
  onBack: () => void;
}

interface RpmItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  semester?: string;
  academicYear?: string;
  author_id?: string;
  author: string;
  date: string;
  topic: string;
  timeAllocation?: string;
  learningObjectives?: string;
  coreActivity?: string;
  assessment?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  tags?: string[];
  content?: string;
  uploaded_by?: string;
  file_path?: string;
  category?: string;
}

function deduplicateById<T extends { id?: any }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const id = item?.id;
    if (id && !seen.has(String(id))) {
      seen.add(String(id));
      result.push(item);
    } else if (!id) {
      result.push(item);
    }
  }
  return result;
}

const INITIAL_RPM_LIST: RpmItem[] = [
  {
    id: 'rpm-1',
    title: 'RPM Semester Ganjil 2026',
    subject: 'Desain Komunikasi Visual',
    grade: 'Kelas X',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    author_id: 'dummy',
    author: 'Dra. Siti Aminah',
    date: '14 Feb 2026',
    topic: 'Fotografi Dasar',
    timeAllocation: '2 x 45 Menit',
    learningObjectives: 'Siswa memahami exposure segitiga',
    coreActivity: 'Praktek kamera dasar',
    assessment: 'Ujian praktik',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export default function RpmScreen({ profile, onBack }: RpmScreenProps) {
  const [rpmList, setRpmList] = useState<RpmItem[]>(INITIAL_RPM_LIST);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [creationMode, setCreationMode] = useState<'idle' | 'compose'>('idle');
  const [composeTab, setComposeTab] = useState<'manual' | 'upload' | 'ai'>('manual');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFilesList, setUploadedFilesList] = useState<any[]>([]);
  const [itemToDelete, setItemToDelete] = useState<RpmItem | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchFiles = async () => {
      const { data } = await supabase
        .from('materi_files')
        .select('*')
        .eq('category', 'rpm')
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (data && data.length > 0) {
        const uploadedItems: RpmItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          subject: item.subject,
          grade: item.class_level,
          semester: 'Ganjil',
          academicYear: '2026/2027',
          author: 'Guru',
          date: new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          topic: `File: ${item.file_name} (${Math.round((item.file_size || 0) / 1024)} KB)`,
          status: 'Selesai',
          tags: ['File Upload'],
          content: item.file_path,
          uploaded_by: item.uploaded_by,
          file_path: item.file_path,
          category: item.category || 'rpm'
        }));

        setRpmList(prev => {
          const nonDbItems = prev.filter(i => !data.some((d: any) => d.id === i.id));
          return deduplicateById([...uploadedItems, ...nonDbItems]);
        });
      }
    };
    fetchFiles();

    return () => {
      isMounted = false;
    };
  }, []);

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || profile.id;
      const isAdmin = profile.role?.toLowerCase() === 'admin';
      const isOwner = itemToDelete.uploaded_by && itemToDelete.uploaded_by === currentUserId;

      if (!isAdmin && !isOwner) {
        alert('Anda tidak memiliki izin untuk menghapus file ini.');
        setItemToDelete(null);
        return;
      }

      const bucket = itemToDelete.category || 'rpm';

      if (itemToDelete.file_path) {
        const { error: storageErr } = await supabase.storage
          .from(bucket)
          .remove([itemToDelete.file_path]);

        if (storageErr) {
          throw new Error('Gagal menghapus file dari penyimpanan.');
        }
      }

      const { error: dbErr } = await supabase
        .from('materi_files')
        .delete()
        .eq('id', itemToDelete.id);

      if (dbErr) {
        throw new Error('Gagal menghapus data file dari database.');
      }

      alert('File berhasil dihapus.');
      setRpmList(prev => deduplicateById(prev.filter(i => i.id !== itemToDelete.id)));
      setItemToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus file.');
      setItemToDelete(null);
    }
  };
  const [viewingRpm, setViewingRpm] = useState<RpmItem | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subject: 'Matematika',
    grade: 'Kelas 7',
    semester: 'Ganjil',
    academicYear: '2026/2027',
    topic: '',
    timeAllocation: '2 x 45 Menit',
    learningObjectives: '',
    learningModel: 'Project Based Learning',
    learningMethod: 'Diskusi, Tanya Jawab',
    introActivity: '',
    coreActivity: '',
    closingActivity: '',
    assessment: ''
  });

  const [aiLoading, setAiLoading] = useState(false);

  const filteredRpm = rpmList.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.topic) return;

    const newItem: RpmItem = {
      id: `rpm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: formData.title || `RPM ${formData.topic}`,
      subject: formData.subject,
      grade: formData.grade,
      semester: formData.semester,
      academicYear: formData.academicYear,
      author_id: profile.id,
      author: profile.nama_lengkap,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      topic: formData.topic,
      timeAllocation: formData.timeAllocation,
      learningObjectives: formData.learningObjectives,
      coreActivity: formData.coreActivity,
      assessment: formData.assessment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setRpmList(prev => deduplicateById([newItem, ...prev]));
    setCreationMode('idle');
  };


  const handleUploadAndSave = async () => {
    if (!formData.title || !formData.subject || !formData.grade || !uploadFile) {
      setUploadError('Mohon lengkapi semua field yang wajib');
      return;
    }
    setIsUploading(true);
    setUploadError('');
    setUploadProgress(10);
    
    let filePath = '';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || profile.id;

      filePath = `${userId}/${crypto.randomUUID()}-${uploadFile.name}`;
      
      const { error: uploadErr } = await supabase.storage
        .from('rpm')
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadErr) {
        throw new Error('Upload gagal: ' + uploadErr.message);
      }
      
      setUploadProgress(60);
      
      const metadata = {
        title: formData.title,
        subject: formData.subject,
        class_level: formData.grade,
        file_name: uploadFile.name,
        file_path: filePath,
        file_type: uploadFile.type || 'application/octet-stream',
        file_size: uploadFile.size,
        category: 'rpm',
        uploaded_by: userId
      };
      
      const { data: dbData, error: dbErr } = await supabase.from('materi_files').insert([metadata]).select();
      
      if (dbErr) {
        await supabase.storage.from('rpm').remove([filePath]);
        throw new Error('Database insert gagal: ' + dbErr.message);
      }
      
      setUploadProgress(100);
      alert('File berhasil diupload');
      
      const newItem: RpmItem = {
        id: dbData && dbData.length > 0 ? dbData[0].id : `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: formData.title,
        subject: formData.subject,
        grade: formData.grade,
        author: profile.nama_lengkap,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        topic: formData.topic || 'Upload',
        status: 'Selesai',
        tags: ['File Upload'],
        content: filePath,
        uploaded_by: userId,
        file_path: filePath,
        category: 'rpm'
      };
      setRpmList(prev => deduplicateById([newItem, ...prev]));
      
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

    if (!formData.topic) {
      alert('Validasi Gagal: Topik Pembelajaran wajib diisi!');
      return;
    }
    setAiLoading(true);
    setTimeout(() => {
      // Basic strict AI simulation that respects the constraints
      const topicStr = formData.topic;
      setFormData(prev => ({
        ...prev,
        title: `RPM AI: ${prev.topic}`,
        learningObjectives: `Peserta didik mampu memahami konsep utama dari ${topicStr} secara mendalam sesuai kurikulum.\nMampu menerapkan ${topicStr} dalam studi kasus nyata.`,
        introActivity: `1. Guru membuka pembelajaran dengan doa dan salam.\n2. Apersepsi: Guru mengaitkan pengalaman siswa dengan ${topicStr}.\n3. Menyampaikan tujuan pembelajaran terkait ${topicStr}.`,
        coreActivity: `1. Eksplorasi: Peserta didik mengamati materi tentang ${topicStr}.\n2. Elaborasi: Peserta didik berdiskusi dan menggali informasi lebih lanjut mengenai ${topicStr}.\n3. Konfirmasi: Guru memberikan penguatan konsep pada materi ${topicStr}.`,
        closingActivity: `1. Guru bersama peserta didik merangkum pembelajaran ${topicStr}.\n2. Refleksi mengenai kendala dalam memahami ${topicStr}.\n3. Doa penutup.`,
        assessment: `Asesmen Formatif: Observasi keaktifan siswa saat diskusi ${topicStr}.\nAsesmen Sumatif: Kuis tertulis tentang prinsip dasar ${topicStr}.`
      }));
      setAiLoading(false);
      setCreationMode('manual');
    }, 1200);
  };

  const exportPDF = (item: RpmItem) => {
    try {
      const doc = new jsPDF();
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      
      let y = 20;
      const addText = (text: string, isBold: boolean = false, size: number = 12) => {
        doc.setFont('times', isBold ? 'bold' : 'normal');
        doc.setFontSize(size);
        const splitText = doc.splitTextToSize(text, 170);
        doc.text(splitText, 20, y);
        y += splitText.length * 7;
        if (y > 280) { doc.addPage(); y = 20; }
      };

      addText(`Rencana Pelaksanaan Pembelajaran (RPM)`, true, 16);
      y += 5;
      addText(`Judul: ${item.title}`);
      addText(`Mata Pelajaran: ${item.subject}`);
      addText(`Kelas: ${item.grade}`);
      addText(`Semester: ${item.semester}`);
      addText(`Tahun Ajaran: ${item.academicYear}`);
      addText(`Penyusun: ${item.author}`);
      addText(`Tanggal: ${item.date}`);
      addText(`Alokasi Waktu: ${item.timeAllocation}`);
      
      y += 10;
      addText(`TOPIK PEMBELAJARAN`, true);
      addText(item.topic);
      
      y += 5;
      addText(`TUJUAN PEMBELAJARAN`, true);
      addText(item.learningObjectives);
      
      y += 5;
      addText(`KEGIATAN INTI`, true);
      addText(item.coreActivity);

      y += 5;
      addText(`ASESMEN`, true);
      addText(item.assessment);

      doc.save(`RPM_${item.topic.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      alert('Gagal mengekspor dokumen PDF. Kesalahan sistem pemrosesan PDF.');
    }
  };

  const exportWord = async (item: RpmItem) => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: 'Rencana Pelaksanaan Pembelajaran (RPM)', heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ children: [new TextRun({ text: `Judul: ${item.title}`, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: `Mata Pelajaran: ${item.subject}`, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: `Kelas: ${item.grade}`, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: `Penyusun: ${item.author}`, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: 'Topik Pembelajaran', bold: true, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: item.topic, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: 'Tujuan Pembelajaran', bold: true, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: item.learningObjectives, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: 'Kegiatan Inti', bold: true, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: item.coreActivity, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: 'Asesmen', bold: true, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: item.assessment, font: 'Times New Roman', size: 24 })] }),
          ],
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RPM_${item.topic.replace(/\s+/g, '_')}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Gagal mengekspor dokumen Word. Kesalahan sistem pemrosesan DOCX.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-body pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity w-max" onClick={onBack}>
        <div className="w-10 h-10 rounded-full bg-white neo-border-thin flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </div>
        <span className="font-extrabold text-sm uppercase tracking-widest text-gray-900">Kembali</span>
      </div>

      <div className="bg-[#B4D3FF] p-6 rounded-2xl neo-border neo-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-white rounded-xl neo-border-thin text-xl">📄</span>
            <h1 className="text-2xl md:text-3xl font-black font-display text-gray-900 uppercase tracking-tight">
              Rencana Pelaksanaan Pembelajaran
            </h1>
          </div>
          <p className="text-sm font-semibold text-gray-800">
            Susun dan kelola RPM dengan mudah, manual maupun bantuan AI.
          </p>
        </div>
        <button
          onClick={() => setCreationMode('compose')}
          className="px-5 py-3 bg-white text-gray-900 neo-border rounded-xl font-black text-xs uppercase tracking-wide flex items-center gap-2 cursor-pointer neo-shadow-sm neo-btn shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat RPM</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl neo-border neo-shadow space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari topik RPM atau judul..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#FAF6F0] rounded-xl neo-border font-medium text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF8B7B]"
          />
        </div>
      </div>


      {/* Compose Modal */}
      {creationMode === 'compose' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl neo-border neo-shadow-lg max-w-3xl w-full p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center shrink-0 mb-4">
              <h3 className="text-lg font-black text-gray-900 uppercase">Penyusunan RPM</h3>
              <button onClick={() => setCreationMode('idle')} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex gap-2 mb-4 shrink-0 p-1 bg-[#FAF6F0] rounded-xl border-2 border-gray-900">
              <button 
                onClick={() => setComposeTab('manual')} 
                className={`flex-1 py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all ${composeTab === 'manual' ? 'bg-[#FF8B7B] text-gray-900 neo-border shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'text-gray-500 hover:text-gray-900'}`}
              >
                ✍ Buat Manual
              </button>
              <button 
                onClick={() => setComposeTab('upload')} 
                className={`flex-1 py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all ${composeTab === 'upload' ? 'bg-[#FF8B7B] text-gray-900 neo-border shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'text-gray-500 hover:text-gray-900'}`}
              >
                📎 Upload File
              </button>
              <button 
                onClick={() => setComposeTab('ai')} 
                className={`flex-1 py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all ${composeTab === 'ai' ? 'bg-[#FFD166] text-gray-900 neo-border shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'text-gray-500 hover:text-gray-900'}`}
              >
                ✨ Bantuan AI
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2">
              {composeTab === 'manual' && (
                <form onSubmit={handleCreate} className="space-y-4 text-xs pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Judul / Nama RPM <span className="text-red-500">*</span></label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Topik Pembelajaran <span className="text-red-500">*</span></label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Mata Pelajaran <span className="text-red-500">*</span></label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Kelas <span className="text-red-500">*</span></label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Semester</label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Tahun Ajaran</label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Tujuan Pembelajaran</label>
                    <textarea rows={3} className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.learningObjectives} onChange={e => setFormData({...formData, learningObjectives: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-1">Kegiatan Pendahuluan</label>
                    <textarea rows={2} className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.introActivity} onChange={e => setFormData({...formData, introActivity: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-1">Kegiatan Inti</label>
                    <textarea rows={4} className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.coreActivity} onChange={e => setFormData({...formData, coreActivity: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-1">Kegiatan Penutup</label>
                    <textarea rows={2} className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.closingActivity} onChange={e => setFormData({...formData, closingActivity: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-1">Asesmen / Penilaian</label>
                    <textarea rows={2} className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.assessment} onChange={e => setFormData({...formData, assessment: e.target.value})} />
                  </div>
                  <div className="flex gap-3 pt-4 sticky bottom-0 bg-white p-2 border-t-2 border-gray-100">
                    <button type="submit" className="flex-1 p-3 bg-[#FFD166] text-gray-900 rounded-xl font-bold uppercase neo-border hover:bg-[#ffdf8f]">Simpan RPM</button>
                    <button type="button" onClick={() => setCreationMode('idle')} className="flex-1 p-3 bg-gray-200 text-gray-900 rounded-xl font-bold uppercase neo-border hover:bg-gray-300">Batal</button>
                  </div>
                </form>
              )}

              {composeTab === 'ai' && (
                <div className="space-y-4 text-xs pb-4">
                  <div className="bg-[#FAF6F0] p-4 rounded-xl border-2 border-gray-900 mb-4">
                    <div className="flex gap-3 items-start">
                      <Wand2 className="w-5 h-5 text-[#FF8B7B] shrink-0" />
                      <p className="font-medium text-gray-700 leading-relaxed">
                        Asisten AI akan menyusun struktur Rencana Pelaksanaan Pembelajaran (RPM) secara lengkap.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Topik Pembelajaran <span className="text-red-500">*</span></label>
                    <input className="w-full p-2 border-2 border-gray-900 rounded-lg" placeholder="Cth: Teknik Dasar Fotografi" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Mata Pelajaran <span className="text-red-500">*</span></label>
                      <input className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Kelas <span className="text-red-500">*</span></label>
                      <input className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Alokasi Waktu <span className="text-red-500">*</span></label>
                    <input className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.timeAllocation} onChange={e => setFormData({...formData, timeAllocation: e.target.value})} />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={generateAI} disabled={aiLoading} className="flex-1 p-3 bg-gray-900 text-white rounded-xl font-bold uppercase disabled:opacity-50 mt-4 cursor-pointer">
                      {aiLoading ? 'Menyusun RPM secara otomatis...' : 'Generate RPM dengan AI'}
                    </button>
                    <button type="button" onClick={() => setCreationMode('idle')} className="flex-1 p-3 bg-gray-200 text-gray-900 rounded-xl font-bold uppercase neo-border hover:bg-gray-300">Batal</button>
                  </div>
                </div>
              )}

              {composeTab === 'upload' && (
                <div className="space-y-4 text-xs pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Judul / Nama RPM <span className="text-red-500">*</span></label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Topik Pembelajaran <span className="text-red-500">*</span></label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Mata Pelajaran <span className="text-red-500">*</span></label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Kelas <span className="text-red-500">*</span></label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-1">Upload File RPM <span className="text-red-500">*</span></label>
                    {!uploadFile ? (
                      <div className="relative border-2 border-dashed border-gray-900 rounded-xl p-8 bg-[#FAF6F0] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 mb-3" />
                        <p className="font-bold text-sm mb-1">Tarik file ke sini atau klik untuk memilih</p>
                        <p className="text-gray-500">PDF, Word, Excel, PowerPoint (Maks 50MB)</p>
                        <input 
                          type="file" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              if (file.size > 50 * 1024 * 1024) {
                                setUploadError('Ukuran file maksimal 50 MB');
                                return;
                              }
                              const ext = file.name.split('.').pop()?.toLowerCase();
                              const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
                              if (!ext || !allowed.includes(ext)) {
                                setUploadError('Format file tidak didukung. Harap unggah PDF, Word, Excel, atau PowerPoint.');
                                return;
                              }
                              setUploadError('');
                              setUploadFile(file);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="border-2 border-gray-900 rounded-xl p-4 bg-white flex items-center justify-between neo-shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-[#4CB5AE]/20 rounded-lg">
                            <FileIcon className="w-6 h-6 text-[#4CB5AE]" />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-sm truncate">{uploadFile.name}</p>
                            <p className="text-gray-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setUploadFile(null)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {uploadError && <p className="text-red-500 mt-2 font-bold">{uploadError}</p>}
                    {isUploading && (
                      <div className="mt-3 space-y-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-[#4CB5AE] h-2 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <p className="text-center text-gray-500 text-[10px]">Mengunggah... {uploadProgress}%</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 sticky bottom-0 bg-white p-2 border-t-2 border-gray-100">
                    <button 
                      type="button" 
                      onClick={handleUploadAndSave}
                      disabled={isUploading || !uploadFile}
                      className="flex-1 p-3 bg-[#4CB5AE] text-white rounded-xl font-bold uppercase neo-border hover:bg-[#3da39d] disabled:opacity-50"
                    >
                      {isUploading ? 'Menyimpan...' : 'Upload & Simpan'}
                    </button>
                    <button type="button" onClick={() => setCreationMode('idle')} disabled={isUploading} className="flex-1 p-3 bg-gray-200 text-gray-900 rounded-xl font-bold uppercase neo-border hover:bg-gray-300">Batal</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rpm Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {deduplicateById(filteredRpm).map((item: RpmItem) => (
          <div key={item.id} className="bg-white rounded-2xl neo-border neo-shadow p-5 flex flex-col justify-between hover:-translate-y-1 transition-all">
            <div>
              <span className="px-2.5 py-1 rounded-lg neo-border-thin bg-[#B4D3FF] text-[10px] font-black uppercase mb-3 inline-block">RPM</span>
              <h3 className="font-black text-lg leading-tight mb-2">{item.title}</h3>
              <p className="text-xs text-gray-600 line-clamp-2">{item.topic}</p>
            </div>
            <div className="mt-4 flex justify-between items-center border-t-2 border-gray-100 pt-4">
              <span className="text-[10px] font-bold text-gray-500">{item.date}</span>
              <div className="flex gap-2">
                <button onClick={() => setViewingRpm(item)} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-gray-700">Lihat Detail</button>
                {item.file_path && (profile.role?.toLowerCase() === 'admin' || item.uploaded_by === profile.id) && (
                  <button 
                    onClick={() => setItemToDelete(item)}
                    className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center"
                    title="Hapus File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl neo-border neo-shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900 uppercase">HAPUS FILE?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus:
              <br />
              <strong className="text-gray-900 block my-1 font-bold text-sm">"{itemToDelete.title}"</strong>
              File akan dihapus dari penyimpanan dan tidak dapat diakses lagi.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-3 bg-gray-200 text-gray-900 rounded-xl font-bold uppercase neo-border hover:bg-gray-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold uppercase neo-border hover:bg-red-600 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      
      {viewingRpm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl neo-border neo-shadow-lg max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b-2 border-gray-100 pb-3">
              <h3 className="text-xl font-black text-gray-900 uppercase">Detail RPM</h3>
              <button onClick={() => setViewingRpm(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div><strong className="text-gray-500 text-xs uppercase block">Judul</strong><span className="font-bold">{viewingRpm.title}</span></div>
                <div><strong className="text-gray-500 text-xs uppercase block">Topik</strong><span className="font-bold">{viewingRpm.topic}</span></div>
                <div><strong className="text-gray-500 text-xs uppercase block">Mata Pelajaran</strong><span className="font-bold">{viewingRpm.subject}</span></div>
                <div><strong className="text-gray-500 text-xs uppercase block">Kelas & Semester</strong><span className="font-bold">{viewingRpm.grade} - {viewingRpm.semester}</span></div>
              </div>
              
              <div>
                <strong className="text-gray-900 text-sm uppercase bg-yellow-100 px-2 py-1 rounded inline-block mb-2">Tujuan Pembelajaran</strong>
                <pre className="whitespace-pre-wrap font-sans mt-1 bg-white p-3 rounded-lg border border-gray-200 text-gray-800">{viewingRpm.learningObjectives}</pre>
              </div>

              <div>
                <strong className="text-gray-900 text-sm uppercase bg-blue-100 px-2 py-1 rounded inline-block mb-2">Kegiatan Inti</strong>
                <pre className="whitespace-pre-wrap font-sans mt-1 bg-white p-3 rounded-lg border border-gray-200 text-gray-800">{viewingRpm.coreActivity}</pre>
              </div>

              <div>
                <strong className="text-gray-900 text-sm uppercase bg-green-100 px-2 py-1 rounded inline-block mb-2">Asesmen</strong>
                <pre className="whitespace-pre-wrap font-sans mt-1 bg-white p-3 rounded-lg border border-gray-200 text-gray-800">{viewingRpm.assessment}</pre>
              </div>
            </div>
            {viewingRpm.tags?.includes('File Upload') && viewingRpm.content ? (
              <button 
                onClick={async () => {
                  if (viewingRpm.content) {
                    const { data, error } = await supabase.storage.from('rpm').createSignedUrl(viewingRpm.content, 3600);
                    if (data?.signedUrl) {
                      window.open(data.signedUrl, '_blank');
                    } else {
                      alert('Gagal membuka file: ' + (error?.message || 'Url tidak ditemukan'));
                    }
                  }
                }}
                className="w-full py-3 bg-[#4CB5AE] hover:bg-[#3da39d] text-white neo-border rounded-xl font-black text-xs uppercase cursor-pointer flex justify-center items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download / Lihat File RPM
              </button>
            ) : (
              <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
                <button onClick={() => exportPDF(viewingRpm)} className="flex-1 p-3 bg-red-500 text-white rounded-xl font-bold uppercase neo-border flex justify-center items-center gap-2 cursor-pointer hover:bg-red-600"><Download className="w-4 h-4"/> Export PDF</button>
                <button onClick={() => exportWord(viewingRpm)} className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold uppercase neo-border flex justify-center items-center gap-2 cursor-pointer hover:bg-blue-700"><Download className="w-4 h-4"/> Export Word</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
