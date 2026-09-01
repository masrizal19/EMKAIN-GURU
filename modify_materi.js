import fs from 'fs';

const filePath = 'src/components/MateriScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';",
  `import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';\nimport { supabase } from '../lib/supabase';\nimport { Upload, Trash2, File as FileIcon } from 'lucide-react';`
);

content = content.replace(
  "const [creationMode, setCreationMode] = useState<'idle' | 'select' | 'manual' | 'ai'>('idle');",
  `const [creationMode, setCreationMode] = useState<'idle' | 'compose'>('idle');\n  const [composeTab, setComposeTab] = useState<'manual' | 'upload' | 'ai'>('manual');\n  const [uploadFile, setUploadFile] = useState<File | null>(null);\n  const [uploadProgress, setUploadProgress] = useState(0);\n  const [uploadError, setUploadError] = useState('');\n  const [isUploading, setIsUploading] = useState(false);\n  const [uploadedFilesList, setUploadedFilesList] = useState<any[]>([]);\n\n  React.useEffect(() => {\n    const fetchFiles = async () => {\n      const { data, error } = await supabase.from('materi_files').select('*').order('created_at', { ascending: false });\n      if (data) setUploadedFilesList(data);\n    };\n    fetchFiles();\n  }, []);`
);

// We need to replace the creation modes UI.
const selectRegex = /{\/\* Creation Mode Dialog \*\/.+?{\/\* AI Mode \*\//s;
// Let's just do a manual replacement using sed or node to be safe.
