import fs from 'fs';

const filePath = 'src/components/UjianScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const stateCode = `  const [composeTab, setComposeTab] = useState<'ai' | 'manual' | 'upload'>('manual');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFilesList, setUploadedFilesList] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchFiles = async () => {
      const { data } = await supabase.from('ujian_files').select('*').order('created_at', { ascending: false });
      if (data) setUploadedFilesList(data);
    };
    fetchFiles();
  }, []);
`;

if (!content.includes('setComposeTab')) {
  content = content.replace(
    '  const [showCreateModal, setShowCreateModal] = useState(false);',
    '  const [showCreateModal, setShowCreateModal] = useState(false);\n' + stateCode
  );
}

fs.writeFileSync(filePath, content);
