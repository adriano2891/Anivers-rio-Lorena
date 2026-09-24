import React, { useState, useEffect } from 'react';
import { PublicInvitation } from './components/PublicInvitation';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'admin' | 'public'>('public');
  const [invitationCode, setInvitationCode] = useState<string>('geral');

  // Parse path and hash on load
  useEffect(() => {
    const parseUrl = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);

      const codeFromParam = searchParams.get('c') || searchParams.get('code');
      const isAdminQuery =
        searchParams.get('admin') === 'true' ||
        searchParams.has('admin') ||
        searchParams.get('painel') === 'true' ||
        searchParams.has('painel') ||
        searchParams.has('dashboard');

      // Check path /convite/CODE or /c/CODE
      const conviteMatch = path.match(/^\/(?:convite|c)\/([A-Za-z0-9_-]+)/i);
      const hashMatch = hash.match(/^#(?:convite|c)\/([A-Za-z0-9_-]+)/i);

      if (isAdminQuery || path.startsWith('/admin') || path.startsWith('/painel') || hash === '#admin' || hash === '#painel') {
        setCurrentRoute('admin');
      } else if (conviteMatch && conviteMatch[1]) {
        setCurrentRoute('public');
        setInvitationCode(conviteMatch[1]);
      } else if (hashMatch && hashMatch[1]) {
        setCurrentRoute('public');
        setInvitationCode(hashMatch[1]);
      } else if (codeFromParam) {
        setCurrentRoute('public');
        setInvitationCode(codeFromParam);
      } else if (path === '/convite' || path === '/convite/' || path === '/' || hash === '#convite') {
        // Default to public generic open invitation form
        setCurrentRoute('public');
        setInvitationCode('geral');
      } else {
        setCurrentRoute('public');
        setInvitationCode('geral');
      }
    };

    parseUrl();
    window.addEventListener('popstate', parseUrl);
    window.addEventListener('hashchange', parseUrl);

    return () => {
      window.removeEventListener('popstate', parseUrl);
      window.removeEventListener('hashchange', parseUrl);
    };
  }, []);

  const navigateToPublic = (code: string) => {
    const cleanCode = code || 'geral';
    setInvitationCode(cleanCode);
    setCurrentRoute('public');
    window.history.pushState({}, '', `/convite/${cleanCode}`);
  };

  const navigateToAdmin = () => {
    setCurrentRoute('admin');
    window.history.pushState({}, '', '/admin');
  };

  return (
    <div className="min-h-screen bg-ativa-gradient font-sans antialiased text-slate-800 flex flex-col">
      {/* Main App View */}
      <div className="flex-1 flex flex-col">
        {currentRoute === 'public' ? (
          <PublicInvitation
            code={invitationCode}
            onNavigateToAdmin={navigateToAdmin}
            onBackToAdmin={navigateToAdmin}
            onSelectCode={(c) => navigateToPublic(c)}
          />
        ) : (
          <AdminDashboard
            onOpenPublicInvitation={(code) => navigateToPublic(code)}
          />
        )}
      </div>
    </div>
  );
}

