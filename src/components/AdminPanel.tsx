import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  Smartphone, 
  Laptop, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Image as ImageIcon,
  Shield,
  HelpCircle
} from 'lucide-react';
import { useLogos } from '../context/LogoContext';
import { WebDropLogo } from './WebDropLogo';

interface AdminPanelProps {
  onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const { logos, uploadLogo, resetLogo } = useLogos();
  const [uploadingType, setUploadingType] = useState<'app_logo' | 'phone_logo' | 'pc_logo' | null>(null);
  const [successType, setSuccessType] = useState<'app_logo' | 'phone_logo' | 'pc_logo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const pcInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (type: 'app_logo' | 'phone_logo' | 'pc_logo', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Simple validation
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('File size should not exceed 8MB.');
      return;
    }

    setUploadingType(type);
    setError(null);

    try {
      await uploadLogo(type, file);
      setSuccessType(type);
      setTimeout(() => setSuccessType(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload custom logo');
    } finally {
      setUploadingType(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleReset = async (type: 'app_logo' | 'phone_logo' | 'pc_logo') => {
    setError(null);
    try {
      await resetLogo(type);
    } catch (err: any) {
      setError('Failed to reset logo.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
          <span>Back to WebDrop</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] font-mono font-semibold text-indigo-700 dark:text-indigo-300">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>ADMIN CONSOLE</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 sm:py-10 flex flex-col justify-start">
        <div className="space-y-6">
          
          {/* Main Title & Hero info card */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Shield className="w-6 h-6 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>Branding & Logo Settings</span>
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Customize WebDrop's appearance globally. Upload custom icons for the application itself and the paired peer devices to align the experience with your branding guidelines.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* BRAND LOGOS SECTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 1. App Logo */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-800/40 text-cyan-600 dark:text-cyan-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    App Logo
                  </h3>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed mb-4">
                  Replaces the default geometric curves logo. Visible in the navbar, connect QR modals, and headers.
                </p>

                {/* Preview Frame */}
                <div className="h-28 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-4 mb-4 relative overflow-hidden group">
                  {logos.app_logo ? (
                    <img 
                      src={logos.app_logo} 
                      alt="App Logo Preview" 
                      className="max-h-20 max-w-full object-contain" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <WebDropLogo size={36} />
                      <span className="text-[10px] font-mono text-slate-400">Default SVG</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <input
                  ref={appInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange('app_logo', e)}
                />
                
                <button
                  onClick={() => appInputRef.current?.click()}
                  disabled={uploadingType === 'app_logo'}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                    successType === 'app_logo'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                  }`}
                >
                  {uploadingType === 'app_logo' ? (
                    <span>Uploading...</span>
                  ) : successType === 'app_logo' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Uploaded!</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                    </>
                  )}
                </button>

                {logos.app_logo && (
                  <button
                    onClick={() => handleReset('app_logo')}
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Default</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. PC Peer Logo */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    PC Peer Logo
                  </h3>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed mb-4">
                  Displays when the paired peer device is a Computer, Laptop, Desktop, or Mac. Replaces the Lucide Laptop icon.
                </p>

                {/* Preview Frame */}
                <div className="h-28 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-4 mb-4 relative overflow-hidden">
                  {logos.pc_logo ? (
                    <img 
                      src={logos.pc_logo} 
                      alt="PC Logo Preview" 
                      className="max-h-20 max-w-full object-contain" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <Laptop className="w-9 h-9" />
                      <span className="text-[10px] font-mono text-slate-400">Default SVG</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <input
                  ref={pcInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange('pc_logo', e)}
                />
                
                <button
                  onClick={() => pcInputRef.current?.click()}
                  disabled={uploadingType === 'pc_logo'}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                    successType === 'pc_logo'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                  }`}
                >
                  {uploadingType === 'pc_logo' ? (
                    <span>Uploading...</span>
                  ) : successType === 'pc_logo' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Uploaded!</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload PC Logo</span>
                    </>
                  )}
                </button>

                {logos.pc_logo && (
                  <button
                    onClick={() => handleReset('pc_logo')}
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Default</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Phone Peer Logo */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Phone Peer Logo
                  </h3>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed mb-4">
                  Displays when the paired peer device is a Smartphone, Mobile Device, or Tablet. Replaces the Lucide Smartphone icon.
                </p>

                {/* Preview Frame */}
                <div className="h-28 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-4 mb-4 relative overflow-hidden">
                  {logos.phone_logo ? (
                    <img 
                      src={logos.phone_logo} 
                      alt="Phone Logo Preview" 
                      className="max-h-20 max-w-full object-contain" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <Smartphone className="w-9 h-9" />
                      <span className="text-[10px] font-mono text-slate-400">Default SVG</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <input
                  ref={phoneInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange('phone_logo', e)}
                />
                
                <button
                  onClick={() => phoneInputRef.current?.click()}
                  disabled={uploadingType === 'phone_logo'}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 ${
                    successType === 'phone_logo'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                  }`}
                >
                  {uploadingType === 'phone_logo' ? (
                    <span>Uploading...</span>
                  ) : successType === 'phone_logo' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Uploaded!</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Phone Logo</span>
                    </>
                  )}
                </button>

                {logos.phone_logo && (
                  <button
                    onClick={() => handleReset('phone_logo')}
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Default</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Quick usage manual */}
          <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
            <HelpCircle className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                How does it synchronize?
              </h4>
              <p className="mt-1 leading-relaxed">
                Logos uploaded here are stored in-memory on the server. Whenever a change is saved, the server instantly broadcasts a real-time WebSocket update to all active paired devices so they refresh their headers and pairing screens in real-time.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto px-4 py-4 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-800/60">
        WebDrop Branding Manager • Accessible at /admin
      </footer>
    </div>
  );
};
