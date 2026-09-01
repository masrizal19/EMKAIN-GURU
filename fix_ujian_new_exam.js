import fs from 'fs';

const filePath = 'src/components/UjianScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `        status: 'Terjadwal',
        participantsCount: 0,
        avgScore: 0,
        dateScheduled: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      };`;

const replacement = `        status: 'Terjadwal',
        participantsCount: 0,
        avgScore: 0,
        dateScheduled: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        tags: ['File Upload'],
        content: filePathStr
      };`;

content = content.replace(target, replacement);
fs.writeFileSync(filePath, content);
