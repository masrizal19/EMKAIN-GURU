/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Difficulty, QuestionType, Question, RecentWork, GeneratedSet } from './types';

export const SUBJECTS = [
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Fisika',
  'Biologi',
  'Kimia',
  'Sejarah',
  'Pancasila (PPKn)'
];

export const GRADES = ['X', 'XI', 'XII'];

export const INITIAL_RECENT_WORKS: RecentWork[] = [
  {
    id: 'rw-1',
    title: 'Ujian Matematika Kelas X',
    date: 'Generated on 12 Oct 2025',
    status: 'READY',
    type: 'SOAL',
    subject: 'Matematika',
    grade: 'X'
  },
  {
    id: 'rw-2',
    title: 'Materi Dasar Fotografi',
    date: 'Edited 2 hours ago',
    status: 'DRAFT',
    type: 'MATERI',
    subject: 'Seni Budaya',
    grade: 'XI'
  },
  {
    id: 'rw-3',
    title: 'RPM Semester Ganjil 2026',
    date: 'Saved yesterday',
    status: 'SAVED',
    type: 'RPM',
    subject: 'Fisika',
    grade: 'XII'
  }
];

// Presets for instantaneous generator fallback
export const SAMPLE_QUESTION_SETS: Record<string, Question[]> = {
  'Matematika-X': [
    {
      id: 'math-x-1',
      questionText: 'Jika 2x + 4 = 10, maka nilai x adalah...',
      options: ['2', '3', '4', '5'],
      correctAnswer: 'B',
      explanation: '2x + 4 = 10  =>  2x = 6  =>  x = 3. Jadi pilihan yang benar adalah B.'
    },
    {
      id: 'math-x-2',
      questionText: 'Luas sebuah persegi panjang dengan panjang 8cm dan lebar 5cm adalah...',
      options: ['13 cm²', '26 cm²', '40 cm²', '80 cm²'],
      correctAnswer: 'C',
      explanation: 'Luas persegi panjang = p x l = 8cm x 5cm = 40 cm². Jadi pilihan yang benar adalah C.'
    },
    {
      id: 'math-x-3',
      questionText: 'Tentukan himpunan penyelesaian dari persamaan kuadrat x² - 5x + 6 = 0.',
      options: ['x = 1 atau x = 6', 'x = 2 atau x = 3', 'x = -2 atau x = -3', 'x = -1 atau x = -6'],
      correctAnswer: 'B',
      explanation: 'Faktorisasi: (x - 2)(x - 3) = 0, maka x = 2 atau x = 3.'
    },
    {
      id: 'math-x-4',
      questionText: 'Berapakah nilai dari 3³ + 2³ - 5²?',
      options: ['10', '15', '20', '25'],
      correctAnswer: 'A',
      explanation: '3³ = 27, 2³ = 8, 5² = 25. Maka 27 + 8 - 25 = 35 - 25 = 10.'
    },
    {
      id: 'math-x-5',
      questionText: 'Suku ke-10 dari barisan aritmatika 3, 7, 11, 15, ... adalah...',
      options: ['35', '39', '41', '43'],
      correctAnswer: 'B',
      explanation: 'a = 3, b = 4. U_10 = a + 9b = 3 + 9(4) = 3 + 36 = 39.'
    }
  ],
  'Bahasa Indonesia-XI': [
    {
      id: 'ind-xi-1',
      questionText: 'Struktur teks prosedur yang tepat adalah...',
      options: [
        'Tesis - Argumentasi - Penegasan Ulang',
        'Tujuan - Langkah-langkah - Penegasan Ulang',
        'Pernyataan Umum - Deretan Penjelas - Interpretasi',
        'Orientasi - Komplikasi - Resolusi - Koda'
      ],
      correctAnswer: 'B',
      explanation: 'Teks prosedur umumnya terdiri atas Tujuan, Langkah-langkah, dan Penegasan Ulang.'
    },
    {
      id: 'ind-xi-2',
      questionText: 'Manakah di bawah ini yang merupakan kalimat imperatif?',
      options: [
        'Hari ini cuaca sangat dingin sekali.',
        'Mengapa kamu tidak masuk sekolah kemarin?',
        'Tolong bersihkan papan tulis itu!',
        'Mereka sedang bermain sepak bola di lapangan.'
      ],
      correctAnswer: 'C',
      explanation: 'Kalimat imperatif adalah kalimat perintah, ditandai oleh partikel "Tolong" dan tanda seru.'
    }
  ],
  'Fisika-XII': [
    {
      id: 'phy-xii-1',
      questionText: 'Hukum yang menyatakan bahwa arus listrik berbanding lurus dengan beda potensial adalah...',
      options: ['Hukum Kirchhoff', 'Hukum Coulomb', 'Hukum Ohm', 'Hukum Faraday'],
      correctAnswer: 'C',
      explanation: 'Hukum Ohm menyatakan V = I * R, yaitu arus berbanding lurus dengan tegangan.'
    },
    {
      id: 'phy-xii-2',
      questionText: 'Berapakah besar hambatan pengganti untuk dua resistor masing-masing 6 Ohm yang disusun paralel?',
      options: ['12 Ohm', '6 Ohm', '3 Ohm', '1.5 Ohm'],
      correctAnswer: 'C',
      explanation: '1/Rp = 1/6 + 1/6 = 2/6 => Rp = 6/2 = 3 Ohm.'
    }
  ]
};

// Generates dynamic questions based on user selections
export function generateQuestions(params: {
  subject: string;
  grade: string;
  topic: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  quantity: number;
}): GeneratedSet {
  const { subject, grade, topic, difficulty, questionType, quantity } = params;
  
  // Try to find preset questions
  const presetKey = `${subject}-${grade}`;
  let baseQuestions = SAMPLE_QUESTION_SETS[presetKey] || SAMPLE_QUESTION_SETS['Matematika-X'];
  
  // If user typed a custom topic, let's customize the questions to make it incredibly cool and smart!
  const questions: Question[] = [];
  const finalTopic = topic.trim() || 'Umum';

  for (let i = 0; i < quantity; i++) {
    const baseQ = baseQuestions[i % baseQuestions.length];
    let qText = baseQ.questionText;
    let options = [...baseQ.options];
    let correct = baseQ.correctAnswer;
    let explanation = baseQ.explanation;

    // Custom text substitution based on subject and topic
    if (topic.trim().length > 0) {
      if (i === 0) {
        qText = `Berdasarkan materi "${finalTopic}", manakah pernyataan berikut yang paling tepat terkait konsep dasarnya?`;
        options = [
          'Konsep ini menjelaskan hubungan sebab akibat secara logis dan empiris.',
          'Konsep ini hanya berlaku pada kondisi teoretis tanpa aplikasi praktis.',
          'Konsep ini bertentangan dengan asas dasar metodologi ilmiah.',
          'Semua jawaban di atas tidak ada yang benar.'
        ];
        correct = 'A';
        explanation = `Pada topik ${finalTopic}, penjelasan teoretis yang logis dan empiris selalu menjadi landasan konsep dasarnya.`;
      } else if (i === 1) {
        qText = `Dalam konteks pembelajaran kelas ${grade} untuk "${finalTopic}", faktor utama yang menentukan keberhasilan analisis adalah...`;
        options = [
          'Kedalaman pemahaman rumus dan teori dasar',
          'Mengandalkan keberuntungan saat menjawab',
          'Meniru hasil pekerjaan siswa lain',
          'Membatasi bahan bacaan hanya pada satu bab'
        ];
        correct = 'A';
        explanation = 'Pemahaman mendalam mengenai rumus dan teori dasar adalah kunci utama pemecahan masalah.';
      } else {
        // Adapt preset question
        qText = `[Topik: ${finalTopic}] ${baseQ.questionText}`;
      }
    }

    // Handle essay types
    if (questionType === QuestionType.ESSAY) {
      options = [];
      correct = '';
      explanation = `[Jawaban Esai Terbuka] Guru disarankan menilai berdasarkan pemahaman siswa tentang: ${explanation || 'Konsep terkait'}`;
    }

    questions.push({
      id: `gen-q-${i + 1}`,
      questionText: qText,
      options,
      correctAnswer: correct,
      explanation
    });
  }

  return {
    id: `set-${Date.now()}`,
    subject,
    grade,
    topic: finalTopic,
    difficulty,
    questionType,
    quantity,
    questions,
    createdAt: new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  };
}
