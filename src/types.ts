/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AppScreen {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  DASHBOARD = 'DASHBOARD',
  GENERATE_SOAL = 'GENERATE_SOAL',
  QUESTIONS_READY = 'QUESTIONS_READY',
  MATERI = 'MATERI',
  UJIAN = 'UJIAN',
  FORUM = 'FORUM',
  COMMUNITY = 'COMMUNITY',
  LOUNGE = 'LOUNGE',
  CHAT = 'CHAT',
  PROFILE = 'PROFILE',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  ADMIN_GURU_LIST = 'ADMIN_GURU_LIST',
  ADMIN_GURU_CREATE = 'ADMIN_GURU_CREATE',
  DISABLED = 'DISABLED',
  ACCESS_DENIED = 'ACCESS_DENIED'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  ESSAY = 'ESSAY',
}

export interface UserProfile {
  id: string;
  username: string;
  nama_lengkap: string;
  email: string | null;
  sekolah: string | null;
  mata_pelajaran: string | null;
  kelas: string | null;
  avatar_url: string | null;
  role: 'admin' | 'guru';
  status: 'aktif' | 'nonaktif';
  created_at?: string;
  updated_at?: string;
  is_online?: boolean;
  last_seen_at?: string | null;
  online_status?: boolean;
  last_seen?: string | null;
}

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string; // e.g. "A", "B", "C", "D"
  explanation?: string;
}

export interface GeneratedSet {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  quantity: number;
  questions: Question[];
  createdAt: string;
}

export interface RecentWork {
  id: string;
  title: string;
  date: string;
  status: 'READY' | 'DRAFT' | 'SAVED';
  type: 'SOAL' | 'MATERI' | 'RPM';
  subject?: string;
  grade?: string;
}

export interface ForumComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_profile?: {
    nama_lengkap: string;
    username: string;
    avatar_url: string | null;
    role: 'admin' | 'guru';
    sekolah?: string | null;
  } | null;
}

export interface ForumPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at?: string;
  likes_count: number;
  comments_count: number;
  user_has_liked?: boolean;
  author_profile?: {
    nama_lengkap: string;
    username: string;
    avatar_url: string | null;
    role: 'admin' | 'guru';
    sekolah?: string | null;
    mata_pelajaran?: string | null;
    is_online?: boolean;
    last_seen_at?: string | null;
  } | null;
}

// Backward compatibility alias
export type CommunityPost = ForumPost;

export type ChatMessageType = 'text' | 'file' | 'image' | 'video' | 'audio' | 'link' | 'retracted';

export interface ChatAttachment {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  url: string;
  file_category: 'doc' | 'pdf' | 'ppt' | 'excel' | 'image' | 'video' | 'audio' | 'other';
  storage_path?: string;
  thumbnail_url?: string;
  download_url?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  message_type?: ChatMessageType;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  attachment_mime_type?: string | null;
  link_url?: string | null;
  link_title?: string | null;
  link_description?: string | null;
  attachments?: ChatAttachment[];
  created_at: string;
  read_by?: string[];
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  sender_profile?: {
    nama_lengkap: string;
    username: string;
    avatar_url: string | null;
    role: 'admin' | 'guru';
    sekolah?: string | null;
    mata_pelajaran?: string | null;
  } | null;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: string[];
  other_user?: UserProfile;
  last_message?: {
    message: string;
    sender_id: string;
    created_at: string;
    message_type?: ChatMessageType;
  } | null;
  unread_count: number;
}
