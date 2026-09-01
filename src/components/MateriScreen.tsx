import React, { useState } from 'react';
import { Search, Plus, Filter, Download, BookOpen, Clock, FileText, ArrowLeft, Wand2, X, FileEdit, Upload, Trash2, FileText as FileIcon } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

interface MateriScreenProps {
  profile: UserProfile;
  onBack: () => void;
}

interface MateriItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  type: 'Modul PDF' | 'Slide Tayang' | 'LKPD' | 'Rangkuman AI' | 'Materi Teks';
  author: string;
  downloads: number;
  date: string;
  description: string;
  tags: string[];
  content?: string; // For text-based materials
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

const INITIAL_MATERI_LIST: MateriItem[] = [
  {
    id: 'mat-1',
    title: 'Modul Ajar: Aljabar Linier & Persamaan Kuadrat',
    subject: 'Matematika',
    grade: 'Kelas 9',
    type: 'Modul PDF',
    author: 'Dra. Siti Aminah',
    downloads: 142,
    date: '14 Feb 2026',
    description: 'Panduan lengkap pemahaman konsep rumus ABC, diskriminan, dan aplikasi fungsi kuadrat dalam kehidupan nyata.',
    tags: ['Aljabar', 'Kurikulum Merdeka', 'Latihan Soal']
  }
];

export default function MateriScreen({ profile }: MateriScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Semua');
  const [selectedGrade, setSelectedGrade] = useState('Semua');
  
  const [materiList, setMateriList] = useState<MateriItem[]>(INITIAL_MATERI_LIST);
  
  const [creationMode, setCreationMode] = useState<'idle' | 'compose' | 'select' | 'manual' | 'ai'>('idle');
  const [composeTab, setComposeTab] = useState<'manual' | 'upload' | 'ai'>('manual');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFilesList, setUploadedFilesList] = useState<any[]>([]);
  const [itemToDelete, setItemToDelete] = useState<MateriItem | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchFiles = async () => {
      const { data, error } = await supabase
        .from('materi_files')
        .select('*')
        .eq('category', 'materi')
        .order('created_at', { ascending: false });
      
      if (!isMounted) return;

      if (data && data.length > 0) {
        const uploadedItems: MateriItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          subject: item.subject,
          grade: item.class_level,
          type: 'Modul PDF' as any,
          author: 'Guru',
          downloads: 0,
          date: new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          description: `File: ${item.file_name} (${Math.round((item.file_size || 0) / 1024)} KB)`,
          tags: ['File Upload'],
          content: item.file_path,
          uploaded_by: item.uploaded_by,
          file_path: item.file_path,
          category: item.category || 'materi'
        }));

        setMateriList(prev => {
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

      const bucket = itemToDelete.category || 'materi';

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
      setMateriList(prev => deduplicateById(prev.filter(i => i.id !== itemToDelete.id)));
      setItemToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus file.');
      setItemToDelete(null);
    }
  };

  const [viewingMateri, setViewingMateri] = useState<MateriItem | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    subject: 'Matematika',
    grade: 'Kelas 7',
    type: 'Materi Teks' as any,
    topic: '',
    content: '',
    tags: ''
  });

  const [aiLoading, setAiLoading] = useState(false);

  const subjects = ['Semua', 'Matematika', 'Ilmu Pengetahuan Alam (IPA)', 'Bahasa Indonesia', 'Bahasa Inggris', 'Fisika', 'Desain Komunikasi Visual'];
  const grades = ['Semua', 'Kelas 7', 'Kelas 8', 'Kelas 9', 'Kelas 10', 'Kelas 11', 'Kelas 12'];

  const filteredMateri = materiList.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = selectedSubject === 'Semua' || item.subject === selectedSubject;
    const matchGrade = selectedGrade === 'Semua' || item.grade === selectedGrade;
    return matchSearch && matchSubject && matchGrade;
  });

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.title) return;

    const newItem: MateriItem = {
      id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: formData.title,
      subject: formData.subject,
      grade: formData.grade,
      type: formData.type,
      author: profile.nama_lengkap,
      downloads: 0,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      description: formData.content.substring(0, 100) + '...',
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : ['Umum'],
      content: formData.content
    };
    setMateriList(prev => deduplicateById([newItem, ...prev]));
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
        .from('materi')
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
        category: 'materi',
        uploaded_by: userId
      };
      
      const { data: dbData, error: dbErr } = await supabase.from('materi_files').insert([metadata]).select();
      
      if (dbErr) {
        await supabase.storage.from('materi').remove([filePath]);
        throw new Error('Database insert gagal: ' + dbErr.message);
      }
      
      setUploadProgress(100);
      alert('File berhasil diupload');
      
      const newItem: MateriItem = {
        id: dbData && dbData.length > 0 ? dbData[0].id : `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: formData.title,
        subject: formData.subject,
        grade: formData.grade,
        type: formData.type,
        author: profile.nama_lengkap,
        downloads: 0,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        description: `File: ${uploadFile.name}`,
        tags: ['File Upload'],
        content: filePath,
        uploaded_by: userId,
        file_path: filePath,
        category: 'materi'
      };
      setMateriList(prev => deduplicateById([newItem, ...prev]));
      
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

    if (!formData.topic) {
      alert('Validasi Gagal: Topik Pembelajaran wajib diisi untuk referensi AI!');
      return;
    }
    setAiLoading(true);
    setTimeout(() => {
      const topic = formData.topic;
      setFormData(prev => ({
        ...prev,
        title: `Materi AI: ${topic}`,
        content: `PENGANTAR\n${topic} merupakan bagian penting dari mata pelajaran ${prev.subject}.\n\nKONSEP UTAMA\n1. Definisi dan Prinsip Dasar dari ${topic}.\n2. Penerapan ${topic} dalam kehidupan sehari-hari dan relevansinya bagi peserta didik.\n\nLATIHAN/EVALUASI\n- Coba jelaskan kembali apa yang dimaksud dengan ${topic} berdasarkan pemahamanmu sendiri.\n- Berikan 2 contoh konkret penerapan ${topic}.`,
        tags: `${prev.subject}, AI, ${topic}`
      }));
      setAiLoading(false);
      setCreationMode('manual');
    }, 1500);
  };

  const exportPDF = (item: MateriItem) => {
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

      addText(`Materi Pembelajaran`, true, 16);
      y += 5;
      addText(`Judul: ${item.title}`, true, 14);
      addText(`Mata Pelajaran: ${item.subject}`);
      addText(`Kelas: ${item.grade}`);
      addText(`Penyusun: ${item.author}`);
      addText(`Tanggal: ${item.date}`);
      
      y += 10;
      addText(`ISI MATERI`, true);
      addText(item.content || item.description);

      doc.save(`Materi_${item.title.substring(0, 15).replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      alert('Gagal mengekspor dokumen PDF.');
    }
  };

  const exportWord = async (item: MateriItem) => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: 'Materi Pembelajaran', heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ children: [new TextRun({ text: `Judul: ${item.title}`, bold: true, font: 'Times New Roman', size: 28 })] }),
            new Paragraph({ children: [new TextRun({ text: `Mata Pelajaran: ${item.subject}`, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: `Kelas: ${item.grade}`, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: `Penyusun: ${item.author}`, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ text: '' }),
            new Paragraph({ children: [new TextRun({ text: 'Isi Materi', bold: true, font: 'Times New Roman', size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: item.content || item.description, font: 'Times New Roman', size: 24 })] }),
          ],
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Materi_${item.title.substring(0, 15).replace(/\s+/g, '_')}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Gagal mengekspor dokumen Word.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-body pb-24">
      {/* Header Banner */}
      <div className="bg-[#FFD166] p-6 rounded-2xl neo-border neo-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-white rounded-xl neo-border-thin text-xl">📚</span>
            <h1 className="text-2xl md:text-3xl font-black font-display text-gray-900 uppercase tracking-tight">
              Materi Pembelajaran
            </h1>
          </div>
          <p className="text-sm font-semibold text-gray-800">
            Pusat modul ajar, lembar kerja siswa (LKPD), bahan presentasi, dan rangkuman cerdas.
          </p>
        </div>

        <button
          onClick={() => setCreationMode('compose')}
          className="px-5 py-3 bg-[#FF8B7B] hover:bg-[#ff9d90] text-gray-900 neo-border rounded-xl font-black text-xs uppercase tracking-wide flex items-center gap-2 cursor-pointer neo-shadow-sm neo-btn shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Materi</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl neo-border neo-shadow space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari judul materi, topik, atau nama penyusun..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#FAF6F0] rounded-xl neo-border font-medium text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#FF8B7B]"
            />
          </div>

          <div className="w-full md:w-56">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3.5 py-3 bg-[#FAF6F0] rounded-xl neo-border font-bold text-xs text-gray-900 focus:outline-none cursor-pointer"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>{sub === 'Semua' ? 'Semua Mata Pelajaran' : sub}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-44">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-3.5 py-3 bg-[#FAF6F0] rounded-xl neo-border font-bold text-xs text-gray-900 focus:outline-none cursor-pointer"
            >
              {grades.map((gr) => (
                <option key={gr} value={gr}>{gr === 'Semua' ? 'Semua Kelas' : gr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {/* Compose Modal */}
      {creationMode === 'compose' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl neo-border neo-shadow-lg max-w-3xl w-full p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center shrink-0 mb-4">
              <h3 className="text-lg font-black text-gray-900 uppercase">Penyusunan Materi</h3>
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
                      <label className="block font-bold mb-1">Judul Materi <span className="text-red-500">*</span></label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Tipe Materi <span className="text-red-500">*</span></label>
                      <select className="w-full p-2 border-2 border-gray-900 rounded-lg bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                        <option value="Materi Teks">Materi Teks</option>
                        <option value="Rangkuman AI">Rangkuman AI</option>
                        <option value="Modul PDF">Modul PDF (Export)</option>
                        <option value="LKPD">LKPD</option>
                      </select>
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
                    <label className="block font-bold mb-1">Isi Materi Pembelajaran</label>
                    <textarea rows={8} className="w-full p-3 border-2 border-gray-900 rounded-lg font-sans" placeholder="Ketik isi materi di sini..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-1">Tag (Pisahkan dengan koma)</label>
                    <input className="w-full p-2 border-2 border-gray-900 rounded-lg" placeholder="Cth: Fotosintesis, Biologi, Ujian" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
                  </div>
                  <div className="flex gap-3 pt-4 sticky bottom-0 bg-white p-2 border-t-2 border-gray-100">
                    <button type="submit" className="flex-1 p-3 bg-[#FFD166] text-gray-900 rounded-xl font-bold uppercase neo-border hover:bg-[#ffdf8f]">Simpan Materi</button>
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
                        Asisten AI akan membantu Anda menyusun draf materi pembelajaran berdasarkan topik. Anda dapat mengedit hasilnya sebelum disimpan.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Topik Pembelajaran <span className="text-red-500">*</span></label>
                    <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" placeholder="Cth: Fotosintesis pada Tumbuhan" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
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
                  <div className="flex gap-3 pt-4">
                    <button onClick={generateAI} disabled={aiLoading} className="flex-1 p-3 bg-gray-900 text-white rounded-xl font-bold uppercase disabled:opacity-50 cursor-pointer hover:bg-gray-800">
                      {aiLoading ? 'Menyusun materi...' : 'Generate AI'}
                    </button>
                    <button type="button" onClick={() => setCreationMode('idle')} className="flex-1 p-3 bg-gray-200 text-gray-900 rounded-xl font-bold uppercase neo-border hover:bg-gray-300">Batal</button>
                  </div>
                </div>
              )}

              {composeTab === 'upload' && (
                <div className="space-y-4 text-xs pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Judul Materi <span className="text-red-500">*</span></label>
                      <input required className="w-full p-2 border-2 border-gray-900 rounded-lg" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">Tipe Materi <span className="text-red-500">*</span></label>
                      <select className="w-full p-2 border-2 border-gray-900 rounded-lg bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                        <option value="Modul PDF">Modul PDF</option>
                        <option value="Slide Tayang">Slide Tayang</option>
                        <option value="LKPD">LKPD</option>
                      </select>
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
                    <label className="block font-bold mb-1">Upload File <span className="text-red-500">*</span></label>
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

      {/* Materi Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {deduplicateById(filteredMateri).map((item: MateriItem) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl neo-border neo-shadow p-5 flex flex-col justify-between hover:-translate-y-1 transition-all duration-200"
          >
            <div>
              {/* Type and Grade Badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-lg neo-border-thin text-[10px] font-black uppercase tracking-wider ${
                  item.type === 'Modul PDF' ? 'bg-[#C1F2D0] text-gray-900' :
                  item.type === 'Slide Tayang' ? 'bg-[#A2D2FF] text-gray-900' :
                  item.type === 'Rangkuman AI' ? 'bg-[#FFD166] text-gray-900' : 
                  item.type === 'Materi Teks' ? 'bg-[#FEE4CB] text-gray-900' : 'bg-[#FF8B7B] text-gray-900'
                }`}>
                  {item.type}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-600">
                  {item.grade}
                </span>
              </div>

              <h3 className="font-black text-lg text-gray-900 leading-tight mb-2 line-clamp-2">
                {item.title}
              </h3>
              
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[10px] font-bold text-[#FF8B7B] uppercase tracking-wider">
                  {item.subject}
                </span>
              </div>

              <p className="text-xs font-medium text-gray-600 line-clamp-3 mb-4">
                {item.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag, i) => (
                  <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t-2 border-gray-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                    {item.author.charAt(0)}
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 truncate max-w-[100px]">
                    {item.author}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-gray-400">{item.date}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setViewingMateri(item)} className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-gray-800 transition-colors">
                  Buka / Download Materi
                </button>
                {item.file_path && (profile.role?.toLowerCase() === 'admin' || item.uploaded_by === profile.id) && (
                  <button 
                    onClick={() => setItemToDelete(item)}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-1"
                    title="Hapus File"
                  >
                    <Trash2 className="w-4 h-4" />
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

      {viewingMateri && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl neo-border neo-shadow-lg max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b-2 border-gray-100 pb-3">
              <h3 className="text-xl font-black text-gray-900 uppercase">Detail Materi</h3>
              <button onClick={() => setViewingMateri(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="col-span-2"><strong className="text-gray-500 text-xs uppercase block">Judul</strong><span className="font-bold text-lg">{viewingMateri.title}</span></div>
                <div><strong className="text-gray-500 text-xs uppercase block">Mata Pelajaran</strong><span className="font-bold">{viewingMateri.subject}</span></div>
                <div><strong className="text-gray-500 text-xs uppercase block">Kelas</strong><span className="font-bold">{viewingMateri.grade}</span></div>
              </div>
              

              <div>
                <strong className="text-gray-900 text-sm uppercase bg-yellow-100 px-2 py-1 rounded inline-block mb-2">Isi Materi</strong>
                {viewingMateri.tags && viewingMateri.tags.includes('File Upload') ? (
                  <div className="mt-2">
                    <p className="mb-3 text-gray-700">Materi ini adalah file yang diunggah.</p>
                    <button 
                      onClick={async () => {
                        if (viewingMateri.content) {
                          const { data, error } = await supabase.storage.from('materi').createSignedUrl(viewingMateri.content, 3600);
                          if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank');
                          } else {
                            alert('Gagal membuka file: ' + (error?.message || 'Url tidak ditemukan'));
                          }
                        }
                      }}
                      className="px-4 py-2 bg-[#4CB5AE] text-white font-bold rounded-lg neo-border shadow-sm flex items-center gap-2 hover:bg-[#3da39d]"
                    >
                      <Download className="w-4 h-4" /> Download / Lihat File
                    </button>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans mt-1 bg-white p-3 rounded-lg border border-gray-200 text-gray-800 text-sm">
                    {viewingMateri.content || viewingMateri.description}
                  </pre>
                )}
              </div>
            </div>
            {!viewingMateri.tags?.includes('File Upload') && (
              <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
                <button onClick={() => exportPDF(viewingMateri)} className="flex-1 p-3 bg-red-500 text-white rounded-xl font-bold uppercase neo-border flex justify-center items-center gap-2 cursor-pointer hover:bg-red-600"><Download className="w-4 h-4"/> Export PDF</button>
                <button onClick={() => exportWord(viewingMateri)} className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold uppercase neo-border flex justify-center items-center gap-2 cursor-pointer hover:bg-blue-700"><Download className="w-4 h-4"/> Export Word</button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
