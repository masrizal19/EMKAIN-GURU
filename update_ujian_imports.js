import fs from 'fs';

const filePath = 'src/components/UjianScreen.tsx';
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { supabase }')) {
  content = content.replace(
    "import { Search, Plus, Filter, Users, Clock, Hash, CheckCircle, Copy, AlertCircle, X, Download } from 'lucide-react';",
    `import { Search, Plus, Filter, Users, Clock, Hash, CheckCircle, Copy, AlertCircle, X, Download, Upload, Trash2, File as FileIcon, Wand2 } from 'lucide-react';\nimport { supabase } from '../lib/supabase';`
  );
}

fs.writeFileSync(filePath, content);
