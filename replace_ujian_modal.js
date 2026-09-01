import fs from 'fs';

const filePath = 'src/components/UjianScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const modalStart = `      {/* Modal: Buat Paket Ujian Baru */}`;
      
const modalStartIndex = content.indexOf(modalStart);
if (modalStartIndex === -1) {
  console.log('Modal start not found');
  process.exit(1);
}

const modalEndIndex = content.lastIndexOf('    </div>');
if (modalEndIndex === -1) {
  console.log('Modal end not found');
  process.exit(1);
}

const replacementModal = `      {/* Modal: Buat Paket Ujian Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl neo-border neo-shadow-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center shrink-0 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#FF8B7B] rounded-lg neo-border-thin text-base">📝</span>
                <h3 className="text-lg font-black font-display text-gray-900 uppercase">
                  Penyusunan Ujian / Asesmen
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-gray-500" />
              </button>
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
                <form onSubmit={handleCreateExam} className="space-y-3.5 text-xs pb-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nama Asesmen / Judul Ujian</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Penilaian Harian Bab 2 Listrik Dinamis..."
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-medium text-gray-900 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Mata Pelajaran</label>
                      <select
                        value={examSubject}
                        onChange={(e) => setExamSubject(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none cursor-pointer"
                      >
                        <option value="Matematika">Matematika</option>
                        <option value="Ilmu Pengetahuan Alam (IPA)">IPA</option>
                        <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                        <option value="Fisika">Fisika</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Jenjang Kelas</label>
                      <select
                        value={examGrade}
                        onChange={(e) => setExamGrade(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none cursor-pointer"
                      >
                        <option value="Kelas 7">Kelas 7</option>
                        <option value="Kelas 8">Kelas 8</option>
                        <option value="Kelas 9">Kelas 9</option>
                        <option value="Kelas 10">Kelas 10</option>
                        <option value="Kelas 11">Kelas 11</option>
                        <option value="Kelas 12">Kelas 12</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Durasi Pengerjaan (Menit)</label>
                      <input
                        type="number"
                        min={10} max={180}
                        required
                        value={examDuration}
                        onChange={(e) => setExamDuration(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-medium text-gray-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Jumlah Soal</label>
                      <input
                        type="number"
                        min={1} max={100}
                        required
                        value={examQuestions}
                        onChange={(e) => setExamQuestions(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-medium text-gray-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Format Soal / Tipe Ujian</label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none cursor-pointer"
                    >
                      <option value="Pilihan Ganda">Pilihan Ganda (Otomatis Dinilai)</option>
                      <option value="Campuran">Campuran (Pilihan Ganda + Uraian)</option>
                      <option value="Essay Mandiri">Essay Mandiri</option>
                    </select>
                  </div>
                  
                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-[#FFD166] text-gray-900 rounded-xl font-black uppercase neo-border neo-shadow-sm hover:bg-[#ffdf8f] transition-colors"
                    >
                      Jadwalkan & Siapkan Soal
                    </button>
                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 neo-border-thin rounded-xl font-bold text-xs uppercase cursor-pointer">
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {composeTab === 'ai' && (
                <div className="space-y-4 text-xs pb-4">
                  <div className="bg-[#FAF6F0] p-4 rounded-xl border-2 border-gray-900 mb-4">
                    <div className="flex gap-3 items-start">
                      <Wand2 className="w-5 h-5 text-[#FF8B7B] shrink-0" />
                      <p className="font-medium text-gray-700 leading-relaxed">
                        Fitur <span className="font-bold">Generate AI</span> membantu Anda menyusun draf soal dengan cepat berdasarkan kompetensi dasar.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nama Asesmen / Judul Ujian</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Penilaian Harian Bab 2 Listrik Dinamis..."
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-medium text-gray-900 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Topik Utama Pembelajaran</label>
                    <textarea rows={2} className="w-full p-2 border-2 border-gray-900 rounded-lg" placeholder="Cth: Fotosintesis, rantai makanan, dan ekosistem" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Mata Pelajaran</label>
                      <input className="w-full p-2 border-2 border-gray-900 rounded-lg" value={examSubject} onChange={e => setExamSubject(e.target.value)} />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Jenjang Kelas</label>
                      <input className="w-full p-2 border-2 border-gray-900 rounded-lg" value={examGrade} onChange={e => setExamGrade(e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="pt-2 flex gap-3">
                    <button onClick={(e) => { e.preventDefault(); alert('Memulai proses penyusunan soal dengan AI...'); handleCreateExam(e); }} className="flex-1 p-3 bg-gray-900 text-white rounded-xl font-bold uppercase mt-4 cursor-pointer hover:bg-gray-800">
                      Mulai Generate Soal dengan AI
                    </button>
                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 p-3 bg-gray-100 text-gray-900 rounded-xl font-bold uppercase neo-border hover:bg-gray-200 mt-4">
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {composeTab === 'upload' && (
                <div className="space-y-4 text-xs pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Nama Asesmen / Judul Ujian <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Penilaian Harian Bab 2 Listrik Dinamis..."
                        value={examTitle}
                        onChange={(e) => setExamTitle(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-medium text-gray-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Format Soal / Tipe Ujian <span className="text-red-500">*</span></label>
                      <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none cursor-pointer"
                      >
                        <option value="Pilihan Ganda">Pilihan Ganda (Otomatis Dinilai)</option>
                        <option value="Campuran">Campuran (Pilihan Ganda + Uraian)</option>
                        <option value="Essay Mandiri">Essay Mandiri</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Mata Pelajaran <span className="text-red-500">*</span></label>
                      <select
                        value={examSubject}
                        onChange={(e) => setExamSubject(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none cursor-pointer"
                      >
                        <option value="Matematika">Matematika</option>
                        <option value="Ilmu Pengetahuan Alam (IPA)">IPA</option>
                        <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                        <option value="Fisika">Fisika</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Jenjang Kelas <span className="text-red-500">*</span></label>
                      <select
                        value={examGrade}
                        onChange={(e) => setExamGrade(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#FAF6F0] rounded-xl neo-border font-bold text-gray-900 focus:outline-none cursor-pointer"
                      >
                        <option value="Kelas 7">Kelas 7</option>
                        <option value="Kelas 8">Kelas 8</option>
                        <option value="Kelas 9">Kelas 9</option>
                        <option value="Kelas 10">Kelas 10</option>
                        <option value="Kelas 11">Kelas 11</option>
                        <option value="Kelas 12">Kelas 12</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-1">Upload File Soal <span className="text-red-500">*</span></label>
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
                    <button type="button" onClick={() => setShowCreateModal(false)} disabled={isUploading} className="flex-1 p-3 bg-gray-200 text-gray-900 rounded-xl font-bold uppercase neo-border hover:bg-gray-300">Batal</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
`;

content = content.substring(0, modalStartIndex) + replacementModal + '\n' + content.substring(modalEndIndex);
fs.writeFileSync(filePath, content);
