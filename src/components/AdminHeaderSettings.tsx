import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HeaderSettings } from '../types';
import { Upload, X, Save, RefreshCw } from 'lucide-react';

export default function AdminHeaderSettings() {
  const [settings, setSettings] = useState<HeaderSettings>({
    config_key: 'main',
    brand_name: 'EMKAIN GURU',
    brand_subtitle: 'Edu-Creative Portal',
    header_title: 'DASHBOARD GURU',
    bg_color: '#FAF6F0',
    text_color: '#111827', // text-gray-900
    border_color: '#111827',
    border_width: '2px',
    border_radius: '1rem', // rounded-2xl
    show_logo: true,
    show_brand_name: true,
    show_subtitle: true,
    show_logo_circle: true,
    show_default_title: true,
    logo_path: null,
    logo_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('header_settings')
        .select('*')
        .eq('config_key', 'main')
        .maybeSingle();

      if (error) {
        console.error('Error fetching header settings:', error);
      } else if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error in fetchSettings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('header_settings')
        .upsert({ ...settings, updated_at: new Date().toISOString() }, { onConflict: 'config_key' })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (data) setSettings(data);
      
      alert('Pengaturan header berhasil disimpan!');
      // Dispatch custom event so App.tsx can update
      window.dispatchEvent(new Event('headerSettingsUpdated'));
    } catch (error: any) {
      alert('Gagal menyimpan pengaturan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran logo maksimal 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('header-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('header-assets')
        .getPublicUrl(filePath);

      // Delete old logo if exists
      if (settings.logo_path) {
        await supabase.storage.from('header-assets').remove([settings.logo_path]);
      }

      setSettings(prev => ({
        ...prev,
        logo_path: filePath,
        logo_url: publicUrl
      }));
    } catch (error: any) {
      alert('Gagal mengupload logo: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings.logo_path) return;
    
    const confirm = window.confirm('Apakah Anda yakin ingin menghapus logo ini?');
    if (!confirm) return;

    try {
      await supabase.storage.from('header-assets').remove([settings.logo_path]);
      setSettings(prev => ({ ...prev, logo_path: null, logo_url: null }));
    } catch (error: any) {
      alert('Gagal menghapus logo: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">
        Memuat Pengaturan...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl neo-border neo-shadow p-6">
      <div className="flex justify-between items-center mb-6 border-b-2 border-gray-900 pb-4">
        <h2 className="text-xl font-black text-gray-900">PENGATURAN HEADER & BRANDING</h2>
        <div className="flex gap-2">
          <button 
            onClick={fetchSettings}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg neo-border-thin flex items-center gap-1 font-bold text-xs uppercase"
          >
            <RefreshCw className="w-4 h-4" /> Batal / Reset
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || uploading}
            className="p-2 bg-[#FFD166] hover:bg-[#ffdf8f] text-gray-900 rounded-lg neo-border-thin flex items-center gap-1 font-bold text-xs uppercase disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Teks & Tampilan */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-500 uppercase text-xs border-b border-gray-200 pb-1 mb-3">Teks & Brand</h3>
          
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-1">Nama Brand</label>
            <input 
              type="text" name="brand_name" value={settings.brand_name} onChange={handleChange}
              className="w-full p-2 border-2 border-gray-900 rounded-lg font-bold text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 mb-1">Subtitle Brand</label>
            <input 
              type="text" name="brand_subtitle" value={settings.brand_subtitle} onChange={handleChange}
              className="w-full p-2 border-2 border-gray-900 rounded-lg font-bold text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-1">Judul Halaman Default</label>
            <input 
              type="text" name="header_title" value={settings.header_title} onChange={handleChange}
              className="w-full p-2 border-2 border-gray-900 rounded-lg font-bold text-sm"
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input type="checkbox" name="show_logo" checked={settings.show_logo} onChange={handleChange} className="w-4 h-4 border-2 border-gray-900 rounded" />
              Tampilkan Logo
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input type="checkbox" name="show_logo_circle" checked={settings.show_logo_circle ?? true} onChange={handleChange} className="w-4 h-4 border-2 border-gray-900 rounded" />
              Lingkaran Logo
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input type="checkbox" name="show_brand_name" checked={settings.show_brand_name} onChange={handleChange} className="w-4 h-4 border-2 border-gray-900 rounded" />
              Tampilkan Nama Brand
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input type="checkbox" name="show_subtitle" checked={settings.show_subtitle} onChange={handleChange} className="w-4 h-4 border-2 border-gray-900 rounded" />
              Tampilkan Subtitle Brand
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input type="checkbox" name="show_default_title" checked={settings.show_default_title ?? true} onChange={handleChange} className="w-4 h-4 border-2 border-gray-900 rounded" />
              Tampilkan Judul Halaman Default
            </label>
          </div>
        </div>

        {/* Warna & Gaya */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-500 uppercase text-xs border-b border-gray-200 pb-1 mb-3">Warna & Gaya (Neo-Brutalism)</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Background Color</label>
              <div className="flex items-center gap-2">
                <input type="color" name="bg_color" value={settings.bg_color} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
                <input type="text" name="bg_color" value={settings.bg_color} onChange={handleChange} className="flex-1 p-2 border-2 border-gray-900 rounded-lg font-bold text-xs" />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Text Color</label>
              <div className="flex items-center gap-2">
                <input type="color" name="text_color" value={settings.text_color} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
                <input type="text" name="text_color" value={settings.text_color} onChange={handleChange} className="flex-1 p-2 border-2 border-gray-900 rounded-lg font-bold text-xs" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Border Color</label>
              <div className="flex items-center gap-2">
                <input type="color" name="border_color" value={settings.border_color} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
                <input type="text" name="border_color" value={settings.border_color} onChange={handleChange} className="flex-1 p-2 border-2 border-gray-900 rounded-lg font-bold text-xs" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Border Width</label>
              <input type="text" name="border_width" value={settings.border_width} onChange={handleChange} placeholder="Cth: 2px" className="w-full p-2 border-2 border-gray-900 rounded-lg font-bold text-xs" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-1">Border Radius</label>
            <input type="text" name="border_radius" value={settings.border_radius} onChange={handleChange} placeholder="Cth: 1rem, 0.5rem, 0" className="w-full p-2 border-2 border-gray-900 rounded-lg font-bold text-xs" />
          </div>
        </div>

        {/* Logo Upload */}
        <div className="md:col-span-2 space-y-4 pt-4 border-t-2 border-gray-900">
          <h3 className="font-bold text-gray-500 uppercase text-xs border-b border-gray-200 pb-1 mb-3">Logo Kustom</h3>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-32 h-32 flex-shrink-0 bg-gray-100 border-2 border-gray-900 rounded-2xl flex items-center justify-center overflow-hidden relative">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Brand Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center p-2">
                  <span className="text-4xl block mb-1">👩‍🏫</span>
                  <span className="text-[9px] font-bold text-gray-400">Logo Default</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-3">
              <p className="text-xs font-bold text-gray-600 leading-relaxed">
                Upload logo kustom Anda di sini. Disarankan menggunakan format PNG transparan atau SVG. Ukuran maksimal 5MB.
              </p>
              
              <div className="flex gap-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase hover:bg-gray-800 transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Mengupload...' : 'Upload Logo Baru'}
                  <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml" className="hidden" onChange={handleUploadLogo} disabled={uploading} />
                </label>
                
                {settings.logo_url && (
                  <button 
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold uppercase hover:bg-red-200 transition-colors"
                  >
                    <X className="w-4 h-4" /> Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
