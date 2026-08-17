/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sparkles,
  BookOpen,
  Pencil,
  LayoutGrid,
  Plus,
  ArrowRight,
  MoreVertical,
  GraduationCap,
  Star
} from 'lucide-react';
import { RecentWork } from '../types';

interface DashboardScreenProps {
  onNavigateToGenerate: () => void;
  onNavigateToMateri?: () => void;
  onNavigateToUjian?: () => void;
  onLoadRecentWork: (workId: string) => void;
  recentWorks: RecentWork[];
  onLogout: () => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export default function DashboardScreen({
  onNavigateToGenerate,
  onNavigateToMateri,
  onNavigateToUjian,
  onLoadRecentWork,
  recentWorks,
}: DashboardScreenProps) {

  return (
    <div className="max-w-6xl mx-auto space-y-8" id="dashboard-scroll-content">
      
      {/* Welcome Banner Box */}
      <div className="bg-[#FAF6F0] rounded-2xl neo-border neo-shadow p-6 lg:p-8 flex flex-col md:flex-row justify-between items-center gap-6" id="welcome-banner">
        <div className="space-y-3" id="welcome-text-group">
          <span className="text-xs font-black uppercase tracking-wider text-[#FF8B7B] block font-display" id="morning-eyebrow">
            GOOD MORNING, TEACHER!
          </span>
          <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight font-display leading-none" id="morning-heading">
            Siap mengajar hari ini?
          </h1>
          <p className="text-gray-600 font-bold text-sm lg:text-base max-w-md" id="morning-desc">
            Biarkan EMKAIN membantu menyiapkan pembelajaranmu.
          </p>
        </div>
        
        {/* Mini illustration panel on the right side of welcome box */}
        <div className="relative w-full md:w-52 h-28 rounded-xl neo-border bg-[#B4D3FF] flex items-center justify-center p-3 overflow-hidden shadow-inner" id="welcome-banner-illustration">
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white neo-border-thin flex items-center justify-center cursor-pointer shadow" id="welcome-banner-favorite-star">
            <Star className="w-3.5 h-3.5 fill-[#FFD166] text-[#1E1E1E]" />
          </div>
          <div className="flex flex-col items-center justify-center text-center space-y-1" id="banner-mini-brand">
            <GraduationCap className="w-10 h-10 text-[#1E1E1E]" />
            <span className="text-xs font-black tracking-tight" id="banner-brand-lbl">EMKAIN GURU</span>
          </div>
        </div>
      </div>

      {/* Quick Tool Actions Grid */}
      <section className="space-y-4" id="quick-actions-section">
        <h3 className="text-lg font-black tracking-tight uppercase text-gray-900 font-display" id="actions-heading">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5" id="actions-grid">
          
          {/* Card 1: Generate Soal */}
          <div className="bg-[#B4D3FF] rounded-2xl neo-border neo-shadow p-5 flex flex-col justify-between min-h-[220px]" id="action-card-gen-soal">
            <div>
              <div className="w-10 h-10 rounded-lg bg-white neo-border-thin flex items-center justify-center mb-4" id="action-icon-wrapper-1">
                <Sparkles className="w-5 h-5 text-[#1E1E1E]" />
              </div>
              <h4 className="text-xl font-black tracking-tight font-display text-gray-900" id="action-card-title-1">Generate Soal</h4>
              <p className="text-gray-800 text-xs font-medium mt-1 leading-relaxed" id="action-card-desc-1">
                Buat soal ujian dalam hitungan menit.
              </p>
            </div>
            <button
              onClick={onNavigateToGenerate}
              className="mt-6 w-full py-2.5 bg-white text-gray-900 neo-border-thin rounded-xl font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:translate-y-0.5 active:translate-x-0.5 transition-all"
              id="action-card-btn-1"
            >
              <span>BUAT SOAL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Materi */}
          <div className="bg-[#FAF6F0] rounded-2xl neo-border neo-shadow p-5 flex flex-col justify-between min-h-[220px]" id="action-card-materi">
            <div>
              <div className="w-10 h-10 rounded-lg bg-white neo-border-thin flex items-center justify-center mb-4" id="action-icon-wrapper-2">
                <BookOpen className="w-5 h-5 text-[#1E1E1E]" />
              </div>
              <h4 className="text-xl font-black tracking-tight font-display text-gray-900" id="action-card-title-2">Materi</h4>
              <p className="text-gray-700 text-xs font-medium mt-1 leading-relaxed" id="action-card-desc-2">
                Modul ajar, slide tayang, dan rangkuman siap pakai.
              </p>
            </div>
            <button
              onClick={onNavigateToMateri || onNavigateToGenerate}
              className="mt-6 w-full py-2.5 bg-white text-gray-900 neo-border-thin rounded-xl font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:translate-y-0.5 active:translate-x-0.5 transition-all"
              id="action-card-btn-2"
            >
              <span>BUKA MATERI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Ujian */}
          <div className="bg-[#FF8B7B] rounded-2xl neo-border neo-shadow p-5 flex flex-col justify-between min-h-[220px]" id="action-card-soal-harian">
            <div>
              <div className="w-10 h-10 rounded-lg bg-white neo-border-thin flex items-center justify-center mb-4" id="action-icon-wrapper-3">
                <Pencil className="w-5 h-5 text-[#1E1E1E]" />
              </div>
              <h4 className="text-xl font-black tracking-tight font-display text-gray-900" id="action-card-title-3">Pusat Ujian</h4>
              <p className="text-gray-800 text-xs font-medium mt-1 leading-relaxed" id="action-card-desc-3">
                Jadwalkan asesmen, rilis token ujian & cetak soal.
              </p>
            </div>
            <button
              onClick={onNavigateToUjian || onNavigateToGenerate}
              className="mt-6 w-full py-2.5 bg-white text-gray-900 neo-border-thin rounded-xl font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:translate-y-0.5 active:translate-x-0.5 transition-all"
              id="action-card-btn-3"
            >
              <span>BUKA UJIAN</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: RPM */}
          <div className="bg-[#B4D3FF] rounded-2xl neo-border neo-shadow p-5 flex flex-col justify-between min-h-[220px]" id="action-card-rpm">
            <div>
              <div className="w-10 h-10 rounded-lg bg-white neo-border-thin flex items-center justify-center mb-4" id="action-icon-wrapper-4">
                <LayoutGrid className="w-5 h-5 text-[#1E1E1E]" />
              </div>
              <h4 className="text-xl font-black tracking-tight font-display text-gray-900" id="action-card-title-4">RPM</h4>
              <p className="text-gray-800 text-xs font-medium mt-1 leading-relaxed" id="action-card-desc-4">
                Susun rencana pembelajaran dengan lebih cepat.
              </p>
            </div>
            <button
              onClick={onNavigateToGenerate}
              className="mt-6 w-full py-2.5 bg-white text-gray-900 neo-border-thin rounded-xl font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:translate-y-0.5 active:translate-x-0.5 transition-all"
              id="action-card-btn-4"
            >
              <span>BUAT RPM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* Sub Row 2 Columns splits */}
      <div className="flex flex-col xl:flex-row gap-6" id="sub-dashboard-split">
        {/* Toolkit metrics */}
        <div className="w-full xl:w-1/3 space-y-4" id="toolkit-section">
          <h3 className="text-lg font-black tracking-tight uppercase text-gray-900 font-display" id="toolkit-heading">
            Your Teaching Toolkit
          </h3>
          
          <div className="space-y-4" id="toolkit-cards">
            {/* Metric 1 */}
            <div className="bg-[#FAF6F0] rounded-2xl neo-border neo-shadow p-5 flex items-center justify-between" id="metric-card-total-soal">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#B4D3FF] neo-border-thin flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-gray-800" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-gray-500 uppercase block leading-none">Total Soal</span>
                  <div className="w-24 bg-gray-200 h-2.5 rounded-full neo-border-thin mt-2 overflow-hidden">
                    <div className="bg-[#FF8B7B] h-full" style={{ width: '68%' }}></div>
                  </div>
                </div>
              </div>
              <span className="text-3xl font-black font-display text-gray-900" id="metric-val-1">128</span>
            </div>

            {/* Metric 2 */}
            <div className="bg-[#FAF6F0] rounded-2xl neo-border neo-shadow p-5 flex items-center justify-between" id="metric-card-materi">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#C1F2D0] neo-border-thin flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-gray-800" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-gray-500 uppercase block leading-none">Materi</span>
                  <div className="w-24 bg-gray-200 h-2.5 rounded-full neo-border-thin mt-2 overflow-hidden">
                    <div className="bg-[#B4D3FF] h-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>
              <span className="text-3xl font-black font-display text-gray-900" id="metric-val-2">24</span>
            </div>

            {/* Star Sticker Badge */}
            <div className="bg-[#FFD166] rounded-2xl neo-border neo-shadow p-4 text-center relative overflow-hidden" id="toolkit-sticker-card">
              <div className="flex items-center justify-center gap-2" id="sticker-container">
                <span className="text-xl">🌟</span>
                <h5 className="font-black text-sm tracking-tight text-gray-900 uppercase font-display" id="sticker-text">Keep it up!</h5>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Work list */}
        <div className="flex-1 space-y-4" id="recent-work-section">
          <div className="flex justify-between items-center" id="recent-work-header">
            <h3 className="text-lg font-black tracking-tight uppercase text-gray-900 font-display" id="recent-heading">
              Recent Work
            </h3>
            <button className="text-xs font-black text-gray-700 flex items-center gap-1 hover:underline cursor-pointer" id="see-all-works-btn">
              <span>See All</span>
              <span>↗</span>
            </button>
          </div>

          <div className="space-y-4" id="recent-work-list">
            {recentWorks.map((work) => (
              <div
                key={work.id}
                onClick={() => work.type === 'SOAL' && onLoadRecentWork(work.id)}
                className={`bg-[#FAF6F0] rounded-2xl neo-border neo-shadow p-5 flex items-center justify-between transition-all duration-150 ${
                  work.type === 'SOAL' ? 'hover:bg-amber-50/55 cursor-pointer hover:translate-y-[-2px]' : ''
                }`}
                id={`recent-card-${work.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-lg neo-border-thin flex items-center justify-center ${
                    work.type === 'SOAL' ? 'bg-[#B4D3FF]' : work.type === 'MATERI' ? 'bg-[#C1F2D0]' : 'bg-[#FF8B7B]'
                  }`}>
                    {work.type === 'SOAL' ? (
                      <Sparkles className="w-5 h-5 text-gray-800" />
                    ) : work.type === 'MATERI' ? (
                      <BookOpen className="w-5 h-5 text-gray-800" />
                    ) : (
                      <LayoutGrid className="w-5 h-5 text-gray-800" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm md:text-base text-gray-900" id={`recent-title-${work.id}`}>{work.title}</h4>
                    <span className="text-xs text-gray-500 font-bold" id={`recent-date-${work.id}`}>{work.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full neo-border-thin text-[10px] font-black tracking-wider ${
                    work.status === 'READY'
                      ? 'bg-[#C1F2D0] text-[#1E1E1E]'
                      : work.status === 'DRAFT'
                      ? 'bg-[#FAF6F0] text-gray-600'
                      : 'bg-[#B4D3FF] text-[#1E1E1E]'
                  }`} id={`recent-status-${work.id}`}>
                    {work.status}
                  </span>
                  <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 neo-border-thin-transparent" id={`recent-opt-${work.id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
