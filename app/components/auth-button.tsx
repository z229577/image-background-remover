'use client';

import { useEffect, useState } from 'react';

type Session = { user?: { name?: string | null; email?: string | null; image?: string | null } } | null;

export default function AuthButton() {
  const [session, setSession] = useState<Session | undefined>(undefined);
  useEffect(() => { fetch('/api/auth/session').then(response => response.json()).then(setSession).catch(() => setSession(null)); }, []);
  if (session?.user) return <div className="flex items-center gap-3"><span className="hidden max-w-32 truncate text-sm font-medium text-slate-600 sm:block">{session.user.name || session.user.email}</span><a href="/api/auth/signout" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Sign out</a></div>;
  return <a href="/api/auth/signin/google" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700">Sign in with Google</a>;
}
