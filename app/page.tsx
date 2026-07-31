'use client';

import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import AuthButton from './components/auth-button';

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function isSupportedImage(candidate: File) {
  const extension = candidate.name.split('.').pop()?.toLowerCase() || '';
  return ACCEPTED.includes(candidate.type) || ACCEPTED_EXTENSIONS.includes(extension);
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [status, setStatus] = useState<'idle'|'processing'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');
  const selectFile = (candidate?: File) => {
    if (!candidate) return;
    if (!isSupportedImage(candidate)) return setMessage('Please upload a JPG, PNG, or WEBP image.');
    if (candidate.size > MAX_SIZE) return setMessage('Image must be smaller than 10 MB.');
    setFile(candidate); setOriginalUrl(URL.createObjectURL(candidate)); setResultUrl(''); setMessage(''); setStatus('idle');
  };
  const onInput = (e: ChangeEvent<HTMLInputElement>) => selectFile(e.target.files?.[0]);
  const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); selectFile(e.dataTransfer.files?.[0]); };
  const removeBackground = async () => {
    if (!file) return;
    setStatus('processing'); setMessage('Removing background…');
    try {
      const body = new FormData(); body.append('file', file);
      const response = await fetch('/api/remove-background', { method: 'POST', body });
      if (!response.ok) { const error = await response.json().catch(() => null); throw new Error(error?.error?.message || 'We could not process this image.'); }
      setResultUrl(URL.createObjectURL(await response.blob())); setStatus('success'); setMessage('Background removed successfully.');
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Network error. Please try again.'); }
  };
  const reset = () => { setFile(null); setOriginalUrl(''); setResultUrl(''); setStatus('idle'); setMessage(''); if (inputRef.current) inputRef.current.value = ''; };
  return <main className="min-h-screen"><nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"><div className="text-xl font-black tracking-tight">cutout<span className="text-indigo-600">.ai</span></div><div className="flex items-center gap-5"><a href="#faq" className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block">FAQ</a><AuthButton /></div></nav>
    <section className="mx-auto max-w-5xl px-6 pb-20 pt-12 text-center"><div className="mx-auto mb-5 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">Free online tool · No signup required</div><h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-7xl">Image background<br/><span className="text-indigo-600">remover</span></h1><p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600">Remove backgrounds from images automatically and download a transparent PNG in seconds.</p>
      <div className="mx-auto mt-10 max-w-2xl">{!file ? <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={onDrop} className="cursor-pointer rounded-3xl border-2 border-dashed border-indigo-200 bg-white p-10 shadow-xl shadow-indigo-100/40 transition hover:border-indigo-500 hover:bg-indigo-50/30 sm:p-16"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl text-white">↑</div><p className="text-lg font-bold text-slate-900">Drop your image here</p><p className="mt-2 text-sm text-slate-500">or click to browse · JPG, PNG, WEBP up to 10 MB</p></div> : <div className="rounded-3xl bg-white p-5 text-left shadow-xl shadow-indigo-100/40"><div className="grid gap-5 sm:grid-cols-2"><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Original</p><img src={originalUrl} alt="Original uploaded image" className="h-64 w-full rounded-2xl object-contain bg-slate-100"/></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Result</p><div className="checkerboard flex h-64 items-center justify-center overflow-hidden rounded-2xl">{resultUrl ? <img src={resultUrl} alt="Image with background removed" className="h-full w-full object-contain"/> : <span className="text-sm text-slate-500">{status === 'processing' ? 'Processing…' : 'Your result will appear here'}</span>}</div></div></div><p className={`mt-4 text-center text-sm ${status === 'error' ? 'text-red-600' : 'text-slate-500'}`}>{message}</p><div className="mt-4 flex flex-col gap-3 sm:flex-row">{resultUrl ? <a href={resultUrl} download="background-removed.png" className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-center font-bold text-white hover:bg-indigo-700">Download transparent PNG</a> : <button onClick={removeBackground} disabled={status === 'processing'} className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{status === 'processing' ? 'Removing background…' : 'Remove background'}</button>}<button onClick={reset} className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50">Choose another</button></div></div>}<input ref={inputRef} type="file" accept={ACCEPTED.join(',')} onChange={onInput} className="hidden"/></div>
    </section><section className="border-y border-slate-200 bg-white py-16"><div className="mx-auto grid max-w-5xl gap-8 px-6 text-center sm:grid-cols-3">{[['01','Upload','Choose a photo from your device.'],['02','Remove','Our AI removes the background.'],['03','Download','Save a transparent PNG instantly.']].map(([n,t,d]) => <div key={n}><div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-black text-indigo-700">{n}</div><h2 className="font-bold text-slate-900">{t}</h2><p className="mt-2 text-sm text-slate-500">{d}</p></div>)}</div></section><section id="faq" className="mx-auto max-w-3xl px-6 py-16"><h2 className="text-center text-3xl font-black">Frequently asked questions</h2><div className="mt-8 space-y-4">{[['Is this image background remover free?','Yes. The MVP is free to use and does not require an account.'],['What happens to my image?','Images are sent to the background removal service only for processing and are not stored by this website.'],['What format do I get?','Successful results are returned as transparent PNG files.']].map(([q,a]) => <details key={q} className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-3 text-sm leading-6 text-slate-600">{a}</p></details>)}</div></section><footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">Images are processed temporarily and are not persistently stored.</footer></main>;
}
