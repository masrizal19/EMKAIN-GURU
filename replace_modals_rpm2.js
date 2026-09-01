import fs from 'fs';

const filePath = 'src/components/RpmScreen.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('      {creationMode === \'select\' && ('));
const endIndex = lines.findIndex(l => l.includes('{/* Rpm Cards */}'));

if (startIndex !== -1 && endIndex !== -1) {
  const newModals = `
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
                className={\`flex-1 py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all \${composeTab === 'manual' ? 'bg-[#FF8B7B] text-gray-900 neo-border shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'text-gray-500 hover:text-gray-900'}\`}
              >
                ✍ Buat Manual
              </button>
              <button 
                onClick={() => setComposeTab('upload')} 
                className={\`flex-1 py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all \${composeTab === 'upload' ? 'bg-[#FF8B7B] text-gray-900 neo-border shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'text-gray-500 hover:text-gray-900'}\`}
              >
                📎 Upload File
              </button>
              <button 
                onClick={() => setComposeTab('ai')} 
                className={\`flex-1 py-2 text-[10px] sm:text-xs font-black uppercase rounded-lg transition-all \${composeTab === 'ai' ? 'bg-[#FFD166] text-gray-900 neo-border shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'text-gray-500 hover:text-gray-900'}\`}
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
                        <p className="text-gray-500">PDF, Word, Excel, PowerPoint (Maks 10MB)</p>
                        <input 
                          type="file" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              if (file.size > 10 * 1024 * 1024) {
                                setUploadError('Ukuran file maksimal 10MB');
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
                          <div className="bg-[#4CB5AE] h-2 rounded-full" style={{ width: \`\${uploadProgress}%\` }}></div>
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
`;
  
  lines.splice(startIndex, endIndex - startIndex, newModals);
  fs.writeFileSync(filePath, lines.join('\n'));
} else {
  console.log("Could not find boundaries", startIndex, endIndex);
}
