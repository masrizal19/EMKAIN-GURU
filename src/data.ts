/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Difficulty, QuestionType, Question, RecentWork, GeneratedSet } from './types';

export const SUBJECTS = [
  // MATA PELAJARAN UMUM
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Fisika',
  'Biologi',
  'Kimia',
  'Sejarah',
  'Pancasila (PPKn)',
  
  // MATA PELAJARAN PRODUKTIF KEJURUAN
  'Produktif Desain Komunikasi Visual',
  'Produktif Teknik Komputer & Jaringan',
  'Produktif Rekayasa Perangkat Lunak',
  'Produktif Teknik Sepeda Motor',
  'Produktif Teknik Kendaraan Ringan (Mobil)',
  'Produktif Teknik Pemesinan',
  'Produktif Manajemen Perkantoran',
  'Produktif Akuntansi',
  
  // SENI DAN KEBUDAYAAN
  'Seni dan Kebudayaan',
  'Seni Tari',
  'Seni Rupa',
  'Seni Musik'
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
  ],
  'Seni dan Kebudayaan': [
    {
      id: 'art-gen-1',
      questionText: 'Karya seni rupa yang memiliki ukuran panjang, lebar, dan tinggi atau memiliki ruang (volume) disebut karya seni...',
      options: ['Dua dimensi', 'Tiga dimensi', 'Empat dimensi', 'Seni murni'],
      correctAnswer: 'B',
      explanation: 'Karya seni rupa yang memiliki dimensi panjang, lebar, dan tinggi serta menempati ruang disebut karya seni 3 dimensi (tiga dimensi).'
    },
    {
      id: 'art-gen-2',
      questionText: 'Batik yang pengerjaannya menggunakan canting untuk menuliskan cairan lilin malam pada permukaan kain dinamakan batik...',
      options: ['Tulis', 'Cap', 'Sablon', 'Cetak'],
      correctAnswer: 'A',
      explanation: 'Batik tulis adalah kain yang dihias dengan tekstur dan corak batik menggunakan tangan (canting) dengan menuliskan malam pada kain.'
    },
    {
      id: 'art-gen-3',
      questionText: 'Warisan budaya takbenda Indonesia yang diakui oleh UNESCO berupa pertunjukan bayangan boneka tradisional dari Jawa adalah...',
      options: ['Ludruk', 'Wayang Kulit', 'Ketoprak', 'Lenong'],
      correctAnswer: 'B',
      explanation: 'Wayang Kulit telah diakui oleh UNESCO sebagai Karya Agung Warisan Budaya Lisan dan Takbenda Manusia.'
    }
  ],
  'Seni Tari': [
    {
      id: 'art-dance-1',
      questionText: 'Unsur utama dalam seni tari yang mengacu pada gerakan tubuh manusia adalah...',
      options: ['Raga (Wiraga)', 'Irama (Wirama)', 'Rasa (Wirasa)', 'Rupa (Wirupa)'],
      correctAnswer: 'A',
      explanation: 'Wiraga (raga) adalah unsur tari yang memperlihatkan gerakan-gerakan tubuh, baik dalam posisi berdiri maupun duduk.'
    },
    {
      id: 'art-dance-2',
      questionText: 'Berikut ini yang merupakan contoh tari tradisional yang ditarikan secara berpasangan atau kelompok bertema perang asal Maluku adalah...',
      options: ['Tari Cakalele', 'Tari Saman', 'Tari Kecak', 'Tari Piring'],
      correctAnswer: 'A',
      explanation: 'Tari Cakalele adalah tari perang tradisional Maluku yang digunakan untuk menyambut tamu ataupun dalam perayaan adat.'
    },
    {
      id: 'art-dance-3',
      questionText: 'Tempo, ketukan, dan iringan musik dalam tarian merupakan perwujudan dari unsur...',
      options: ['Wiraga', 'Wirama', 'Wirasa', 'Wicara'],
      correctAnswer: 'B',
      explanation: 'Wirama (irama) membantu penari dalam mengatur ketukan tempo gerakan dan mensinkronisasikannya dengan musik pengiring.'
    }
  ],
  'Seni Rupa': [
    {
      id: 'art-visual-1',
      questionText: 'Unsur seni rupa paling dasar yang terbentuk dari pertemuan dua atau beberapa titik adalah...',
      options: ['Garis', 'Bidang', 'Bentuk', 'Tekstur'],
      correctAnswer: 'A',
      explanation: 'Garis merupakan kumpulan titik-titik yang sejajar dan mempunyai arah, panjang, serta merupakan unsur utama seni rupa.'
    },
    {
      id: 'art-visual-2',
      questionText: 'Teknik melukis dengan menyemprotkan cat menggunakan bantuan kompresor udara dinamakan teknik...',
      options: ['Aquarel', 'Plakat', 'Spray / Airbrush', 'Pointilis'],
      correctAnswer: 'C',
      explanation: 'Teknik spray (airbrush) adalah teknik melukis dengan menyemprotkan bahan cair menggunakan bantuan tekanan udara.'
    },
    {
      id: 'art-visual-3',
      questionText: 'Campuran warna primer merah dan kuning dengan perbandingan seimbang akan menghasilkan warna sekunder berupa...',
      options: ['Hijau', 'Ungu', 'Oranye', 'Cokelat'],
      correctAnswer: 'C',
      explanation: 'Merah dicampur kuning dengan perbandingan seimbang (1:1) menghasilkan warna oranye (jingga).'
    }
  ],
  'Seni Musik': [
    {
      id: 'art-music-1',
      questionText: 'Tinggi rendahnya nada yang teratur dalam sebuah lagu dinamakan...',
      options: ['Melodi', 'Ritme', 'Harmoni', 'Birama'],
      correctAnswer: 'A',
      explanation: 'Melodi merupakan susunan rangkaian nada dengan getaran teratur yang terdengar berurutan serta mengungkapkan gagasan musik.'
    },
    {
      id: 'art-music-2',
      questionText: 'Alat musik yang sumber bunyinya berasal dari getaran dawai atau senar disebut kelompok alat musik...',
      options: ['Membranofon', 'Kordofon', 'Idiofon', 'Aerofon'],
      correctAnswer: 'B',
      explanation: 'Kordofon adalah golongan alat musik yang menghasilkan suara lewat getaran dawai/senar (contoh: biola, gitar, kecapi).'
    },
    {
      id: 'art-music-3',
      questionText: 'Cepat lambatnya suatu lagu atau musik dimainkan diukur dengan satuan BPM (Beats Per Minute) menggunakan unsur...',
      options: ['Tempo', 'Dinamika', 'Timbre', 'Melodi'],
      correctAnswer: 'A',
      explanation: 'Tempo menyatakan ukuran kecepatan birama lagu yang sangat menentukan suasana atau karakter lagu tersebut.'
    }
  ],
  'Produktif Desain Komunikasi Visual': [
    {
      id: 'dkv-1',
      questionText: 'Jenis tipografi yang dicirikan dengan kaki/sirip pada ujung setiap karakter huruf adalah kelompok...',
      options: ['Sans Serif', 'Serif', 'Script', 'Decorative'],
      correctAnswer: 'B',
      explanation: 'Huruf Serif memiliki sirip/kaki (serif) di ujungnya (contoh: Times New Roman, Garamond), memberikan kesan klasik dan formal.'
    },
    {
      id: 'dkv-2',
      questionText: 'Format berkas gambar raster berbasis kompresi yang mendukung transparansi (alpha channel) secara luas di web adalah...',
      options: ['JPEG', 'PNG', 'BMP', 'TIFF'],
      correctAnswer: 'B',
      explanation: 'PNG (Portable Network Graphics) dikembangkan untuk menggantikan format GIF dan mendukung transparansi penuh dengan kompresi lossless.'
    },
    {
      id: 'dkv-3',
      questionText: 'Unsur tata letak desain yang memberikan kesan ruang bernapas dan mencegah tampilan terlalu padat dinamakan...',
      options: ['White Space / Negative Space', 'Grid System', 'Hierarchy', 'Alignment'],
      correctAnswer: 'A',
      explanation: 'White space atau negative space adalah ruang kosong di sekitar elemen desain yang berfungsi meningkatkan keterbacaan dan fokus visual.'
    }
  ],
  'Produktif Teknik Komputer & Jaringan': [
    {
      id: 'tkj-1',
      questionText: 'Protokol yang berfungsi untuk memberikan konfigurasi alamat IP (IP Address) secara otomatis kepada komputer client adalah...',
      options: ['DNS', 'DHCP', 'FTP', 'HTTP'],
      correctAnswer: 'B',
      explanation: 'DHCP (Dynamic Host Configuration Protocol) mengalokasikan alamat IP secara otomatis kepada host yang terhubung dalam jaringan.'
    },
    {
      id: 'tkj-2',
      questionText: 'Manakah dari alamat IP berikut yang termasuk dalam rentang alamat IP Privat Kelas C?',
      options: ['10.0.0.1', '172.16.0.1', '192.168.1.5', '8.8.8.8'],
      correctAnswer: 'C',
      explanation: 'Alamat IP privat Kelas C berada dalam rentang 192.168.0.0 hingga 192.168.255.255.'
    },
    {
      id: 'tkj-3',
      questionText: 'Perangkat jaringan komputer yang bekerja pada Layer 3 (Network Layer) untuk menghubungkan beberapa jaringan yang berbeda segmen adalah...',
      options: ['Switch', 'Hub', 'Router', 'Repeater'],
      correctAnswer: 'C',
      explanation: 'Router bekerja pada Layer 3 untuk menentukan rute terbaik dalam mengirimkan paket data antar jaringan yang berbeda sub-net.'
    }
  ],
  'Produktif Rekayasa Perangkat Lunak': [
    {
      id: 'rpl-1',
      questionText: 'Dalam Pemrograman Berorientasi Objek (OOP), konsep menyembunyikan detail implementasi internal objek disebut...',
      options: ['Inheritance', 'Polymorphism', 'Encapsulation', 'Abstraction'],
      correctAnswer: 'C',
      explanation: 'Encapsulation (pengkapsulan) adalah proses membungkus data dan fungsi ke dalam kelas, serta membatasi akses langsung dari luar.'
    },
    {
      id: 'rpl-2',
      questionText: 'Perintah SQL yang digunakan untuk mengambil data dari tabel di dalam database adalah...',
      options: ['INSERT', 'UPDATE', 'DELETE', 'SELECT'],
      correctAnswer: 'D',
      explanation: 'Perintah SELECT digunakan untuk memilih dan mengambil data dari satu atau lebih tabel database.'
    },
    {
      id: 'rpl-3',
      questionText: 'Jenis struktur data yang menggunakan prinsip LIFO (Last In First Out) dalam pengoperasiannya adalah...',
      options: ['Queue (Antrean)', 'Stack (Tumpukan)', 'Tree (Pohon)', 'Array'],
      correctAnswer: 'B',
      explanation: 'Stack (tumpukan) menerapkan prinsip LIFO, di mana elemen yang terakhir kali ditambahkan akan menjadi yang pertama kali dikeluarkan.'
    }
  ],
  'Produktif Teknik Sepeda Motor': [
    {
      id: 'tsm-1',
      questionText: 'Komponen pada mesin sepeda motor 4-tak yang berfungsi untuk memicu percikan api guna memulai proses pembakaran adalah...',
      options: ['Karburator', 'Busi (Spark Plug)', 'Piston', 'Noken As'],
      correctAnswer: 'B',
      explanation: 'Busi memercikkan bunga api listrik tegangan tinggi di dalam ruang bakar untuk membakar campuran udara dan bensin yang dikompresi.'
    },
    {
      id: 'tsm-2',
      questionText: 'Apa fungsi utama dari sistem suspensi pada sepeda motor?',
      options: ['Menyalurkan tenaga mesin', 'Menyerap getaran jalan untuk kenyamanan', 'Mendinginkan suhu ban', 'Mengatur rasio bahan bakar'],
      correctAnswer: 'B',
      explanation: 'Suspensi berfungsi menyerap kejutan, getaran, dan permukaan jalan yang kasar demi keselamatan, stabilitas kemudi, serta kenyamanan.'
    },
    {
      id: 'tsm-3',
      questionText: 'Siklus kerja mesin 4-tak secara berurutan terdiri atas langkah...',
      options: ['Hisap - Kompresi - Usaha - Buang', 'Kompresi - Hisap - Usaha - Buang', 'Hisap - Usaha - Kompresi - Buang', 'Usaha - Hisap - Kompresi - Buang'],
      correctAnswer: 'A',
      explanation: 'Siklus kerja motor bensin 4 langkah secara teoritis terdiri dari: 1. Langkah Hisap, 2. Langkah Kompresi, 3. Langkah Usaha/Ekspansi, 4. Langkah Buang.'
    }
  ],
  'Produktif Teknik Kendaraan Ringan (Mobil)': [
    {
      id: 'tkr-1',
      questionText: 'Komponen sistem transmisi mobil yang berfungsi menghubungkan dan memutuskan putaran mesin ke transmisi secara halus adalah...',
      options: ['Gardan (Differential)', 'Kopling (Clutch)', 'Sistem Rem', 'Poros Propeler'],
      correctAnswer: 'B',
      explanation: 'Kopling (clutch) berfungsi menyalurkan dan memutus putaran poros engkol mesin ke poros input transmisi saat perpindahan gigi.'
    },
    {
      id: 'tkr-2',
      questionText: 'Fungsi utama dari air radiator pada sistem pendinginan mobil adalah...',
      options: ['Melumasi piston', 'Menyerap panas dari blok mesin', 'Meningkatkan efisiensi bahan bakar', 'Menghasilkan daya listrik'],
      correctAnswer: 'B',
      explanation: 'Cairan pendingin (air radiator) mengalir melalui mantel air blok silinder untuk menyerap panas hasil pembakaran, lalu didinginkan di radiator.'
    },
    {
      id: 'tkr-3',
      questionText: 'Perangkat pada mobil yang berfungsi mengubah energi mekanik dari putaran mesin menjadi energi listrik DC untuk mengisi baterai aki adalah...',
      options: ['Starter Motor', 'Alternator', 'Koil Pengapian', 'Karburator'],
      correctAnswer: 'B',
      explanation: 'Alternator berfungsi membangkitkan arus AC yang kemudian disearahkan (di-rectify) menjadi arus DC untuk menyuplai kelistrikan mobil dan menyetrum aki.'
    }
  ],
  'Produktif Teknik Pemesinan': [
    {
      id: 'mesin-1',
      questionText: 'Jenis pahat bubut yang digunakan untuk membuat ulir/drat pada benda kerja silindris adalah pahat...',
      options: ['Potong', 'Ulir', 'Rata Kanan', 'Alur'],
      correctAnswer: 'B',
      explanation: 'Pahat bubut ulir dirancang khusus dengan sudut pemotongan standar (misalnya 60 derajat untuk metrik) untuk menyayat ulir luar atau ulir dalam.'
    },
    {
      id: 'mesin-2',
      questionText: 'Alat ukur presisi dengan ketelitian hingga 0,01 mm yang digunakan untuk mengukur diameter luar kawat kecil secara akurat adalah...',
      options: ['Mistar Baja', 'Mikrometer Sekrup', 'Jangka Sorong (Vernier Caliper)', 'Dial Indicator'],
      correctAnswer: 'B',
      explanation: 'Mikrometer sekrup memiliki ketelitian sangat tinggi (mencapai 0.01 mm atau bahkan 0.001 mm) untuk mengukur dimensi benda kerja kecil.'
    },
    {
      id: 'mesin-3',
      questionText: 'Gerakan memutar pahat bermata potong majemuk untuk menyayat permukaan benda kerja yang terpasang pada meja mesin dinamakan proses pemesinan...',
      options: ['Bubut (Turning)', 'Frais (Milling)', 'Sekrap (Shaping)', 'Bor (Drilling)'],
      correctAnswer: 'B',
      explanation: 'Proses frais (milling) adalah penyayatan mekanis benda kerja menggunakan alat potong multi-point (cutter frais) yang berputar pada poros spindle.'
    }
  ],
  'Produktif Manajemen Perkantoran': [
    {
      id: 'adm-1',
      questionText: 'Sistem kearsipan yang mengelompokkan dokumen berdasarkan nama wilayah atau lokasi asal surat dinamakan sistem...',
      options: ['Abjad', 'Kronologis / Tanggal', 'Geografis / Wilayah', 'Subjek / Pokok Masalah'],
      correctAnswer: 'C',
      explanation: 'Sistem geografis adalah sistem penyimpanan dan penemuan kembali arsip yang disusun berdasarkan pembagian wilayah atau daerah tertentu.'
    },
    {
      id: 'adm-2',
      questionText: 'Alat komunikasi kantor yang digunakan untuk mengirimkan salinan dokumen cetak secara langsung melalui saluran telepon disebut...',
      options: ['Mesin Fotokopi', 'Faksimile', 'Interkom', 'Paging System'],
      correctAnswer: 'B',
      explanation: 'Faksimile (fax) memindai dokumen fisik lalu mengirimkan salinannya melalui jaringan telekomunikasi ke mesin fax penerima.'
    },
    {
      id: 'adm-3',
      questionText: 'Langkah awal yang tepat dilakukan saat menerima tamu kantor adalah...',
      options: ['Membiarkannya menunggu sendiri', 'Memberikan salam dengan ramah dan menanyakan keperluannya', 'Langsung mengantarkannya ke ruang direktur', 'Meminta kartu identitas tanpa menyapa'],
      correctAnswer: 'B',
      explanation: 'Sebagai resepsionis atau sekretaris yang profesional, sambutan pertama yang sopan, bersahabat, disertai senyuman dan sapaan menanyakan keperluan tamu adalah etika dasar.'
    }
  ],
  'Produktif Akuntansi': [
    {
      id: 'akt-1',
      questionText: 'Laporan keuangan yang menyajikan informasi mengenai aset, liabilitas (utang), dan ekuitas (modal) suatu entitas pada tanggal tertentu disebut...',
      options: ['Laporan Laba Rugi', 'Neraca (Balance Sheet)', 'Laporan Arus Kas', 'Laporan Perubahan Modal'],
      correctAnswer: 'B',
      explanation: 'Neraca (Balance Sheet atau Statement of Financial Position) menyajikan kondisi keuangan berimbang antara harta (aset) dengan kewajiban dan modal.'
    },
    {
      id: 'akt-2',
      questionText: 'Akun manakah di bawah ini yang saldo normalnya berada di posisi Debit saat terjadi penambahan nilai?',
      options: ['Kas (Aset)', 'Utang Usaha', 'Pendapatan Jasa', 'Modal Pemilik'],
      correctAnswer: 'A',
      explanation: 'Akun aset (seperti Kas, Piutang, Perlengkapan, Peralatan) memiliki saldo normal di sisi Debit.'
    },
    {
      id: 'akt-3',
      questionText: 'Proses mencatat setiap transaksi keuangan secara kronologis ke dalam buku harian untuk pertama kalinya disebut proses...',
      options: ['Posting ke Buku Besar', 'Pembuatan Jurnal Umum', 'Penyusunan Neraca Saldo', 'Penyesuaian Akhir Tahun'],
      correctAnswer: 'B',
      explanation: 'Pembuatan jurnal (journalizing) merupakan tahap pertama dalam pencatatan transaksi keuangan perusahaan sebelum kemudian diposting ke Buku Besar.'
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
  // Requirement 8: For "Seni dan Kebudayaan", allow choosing based on sub-aspects (Seni Tari, Seni Rupa, Seni Musik) in topic or sub-subject
  let selectedArtPreset = '';
  if (subject === 'Seni dan Kebudayaan') {
    const normalizedTopic = topic.toLowerCase();
    if (normalizedTopic.includes('tari') || normalizedTopic.includes('dance') || normalizedTopic.includes('gerak')) {
      selectedArtPreset = 'Seni Tari';
    } else if (normalizedTopic.includes('rupa') || normalizedTopic.includes('gambar') || normalizedTopic.includes('lukis') || normalizedTopic.includes('visual') || normalizedTopic.includes('warna')) {
      selectedArtPreset = 'Seni Rupa';
    } else if (normalizedTopic.includes('musik') || normalizedTopic.includes('nyanyi') || normalizedTopic.includes('lagu') || normalizedTopic.includes('instrumen') || normalizedTopic.includes('nada')) {
      selectedArtPreset = 'Seni Musik';
    }
  }

  const lookupSubject = selectedArtPreset || subject;
  const presetKey = `${lookupSubject}-${grade}`;
  
  // Fallback cascade: specific-grade-key -> subject-key -> 'Matematika-X'
  let baseQuestions = SAMPLE_QUESTION_SETS[presetKey] || SAMPLE_QUESTION_SETS[lookupSubject] || SAMPLE_QUESTION_SETS['Matematika-X'];
  
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
