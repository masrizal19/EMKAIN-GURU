import fs from 'fs';

const filePath = 'src/components/MateriScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace onClick setCreationMode
content = content.replace(/setCreationMode\('select'\)/g, "setCreationMode('compose')");

fs.writeFileSync(filePath, content);
