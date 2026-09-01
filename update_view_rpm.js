import fs from 'fs';

const filePath = 'src/components/RpmScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `
              <div>
                <strong className="text-gray-900 text-sm uppercase bg-yellow-100 px-2 py-1 rounded inline-block mb-2">Asesmen / Penilaian</strong>
                <pre className="whitespace-pre-wrap font-sans mt-1 bg-white p-3 rounded-lg border border-gray-200 text-gray-800 text-sm">
                  {viewingRpm.content?.assessment || '-'}
                </pre>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
              <button onClick={() => exportPDF(viewingRpm)} className="flex-1 p-3 bg-red-500 text-white rounded-xl font-bold uppercase neo-border flex justify-center items-center gap-2 cursor-pointer hover:bg-red-600"><Download className="w-4 h-4"/> Export PDF</button>
              <button onClick={() => exportWord(viewingRpm)} className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold uppercase neo-border flex justify-center items-center gap-2 cursor-pointer hover:bg-blue-700"><Download className="w-4 h-4"/> Export Word</button>
            </div>
`;

// Wait, the structure in RpmScreen is different. Let's see what it is.
