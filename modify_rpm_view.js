import fs from 'fs';

const filePath = 'src/components/RpmScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `              <div>
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
            <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
              <button onClick={() => exportPDF(viewingRpm)} className="flex-1 p-3 bg-red-500 text-white rounded-xl font-bold uppercase neo-border flex justify-center items-center gap-2 cursor-pointer hover:bg-red-600"><Download className="w-4 h-4"/> Export PDF</button>
              <button onClick={() => exportWord(viewingRpm)} className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold uppercase neo-border flex justify-center items-center gap-2 cursor-pointer hover:bg-blue-700"><Download className="w-4 h-4"/> Export Word</button>
            </div>`;

const replacement = `              {viewingRpm.tags && viewingRpm.tags.includes('File Upload') ? (
                <div className="mt-4">
                  <strong className="text-gray-900 text-sm uppercase bg-yellow-100 px-2 py-1 rounded inline-block mb-2">File Upload RPM</strong>
                  <div className="mt-2">
                    <p className="mb-3 text-gray-700">RPM ini adalah file yang diunggah.</p>
                    <button 
                      onClick={async () => {
                        if (viewingRpm.content) {
                          const { data, error } = await supabase.storage.from('rpm').createSignedUrl(viewingRpm.content as string, 3600);
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
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
            {!viewingRpm.tags?.includes('File Upload') && (
              <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
                <button onClick={() => exportPDF(viewingRpm)} className="flex-1 p-3 bg-red-500 text-white rounded-xl font-bold uppercase neo-border flex justify-center items-center gap-2 cursor-pointer hover:bg-red-600"><Download className="w-4 h-4"/> Export PDF</button>
                <button onClick={() => exportWord(viewingRpm)} className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold uppercase neo-border flex justify-center items-center gap-2 cursor-pointer hover:bg-blue-700"><Download className="w-4 h-4"/> Export Word</button>
              </div>
            )}`;

content = content.replace(targetStr, replacement);
fs.writeFileSync(filePath, content);
