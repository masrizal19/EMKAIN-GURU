import fs from 'fs';

const filePath = 'src/components/RpmScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
  "import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';",
  `import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';\nimport { supabase } from '../lib/supabase';\nimport { Upload, Trash2, File as FileIcon } from 'lucide-react';`
);

// 2. Add state
content = content.replace(
  "const [creationMode, setCreationMode] = useState<'idle' | 'select' | 'manual' | 'ai'>('idle');",
  `const [creationMode, setCreationMode] = useState<'idle' | 'compose'>('idle');\n  const [composeTab, setComposeTab] = useState<'manual' | 'upload' | 'ai'>('manual');\n  const [uploadFile, setUploadFile] = useState<File | null>(null);\n  const [uploadProgress, setUploadProgress] = useState(0);\n  const [uploadError, setUploadError] = useState('');\n  const [isUploading, setIsUploading] = useState(false);\n  const [uploadedFilesList, setUploadedFilesList] = useState<any[]>([]);\n\n  React.useEffect(() => {\n    const fetchFiles = async () => {\n      const { data } = await supabase.from('rpm_files').select('*').order('created_at', { ascending: false });\n      if (data) setUploadedFilesList(data);\n    };\n    fetchFiles();\n  }, []);`
);

// 3. Replace toggle setCreationMode('select') with 'compose'
content = content.replace(/setCreationMode\('select'\)/g, "setCreationMode('compose')");

fs.writeFileSync(filePath, content);
