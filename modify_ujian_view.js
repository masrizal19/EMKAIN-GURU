import fs from 'fs';

const filePath = 'src/components/UjianScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {`;
                
const replacement = `            {selectedExam.tags?.includes('File Upload') && selectedExam.content && (
              <button 
                onClick={async () => {
                  if (selectedExam.content) {
                    const { data, error } = await supabase.storage.from('ujian').createSignedUrl(selectedExam.content as string, 3600);
                    if (data?.signedUrl) {
                      window.open(data.signedUrl, '_blank');
                    } else {
                      alert('Gagal membuka file: ' + (error?.message || 'Url tidak ditemukan'));
                    }
                  }
                }}
                className="w-full py-2 bg-[#4CB5AE] hover:bg-[#3da39d] text-white neo-border rounded-xl font-black text-xs uppercase cursor-pointer flex justify-center items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download / Lihat File Soal
              </button>
            )}
            
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {`;

content = content.replace(target, replacement);
fs.writeFileSync(filePath, content);
