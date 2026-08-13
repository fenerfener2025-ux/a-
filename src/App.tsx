/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Dashboard } from './components/Dashboard';
import { InventoryModule } from './components/InventoryModule';
import { DistributionModule } from './components/DistributionModule';
import { ReturnDestructionModule } from './components/ReturnDestructionModule';
import { ReportsModule } from './components/ReportsModule';
import { OfficialWordFormsView } from './components/OfficialWordFormsView';
import { ImportSystem } from './components/ImportSystem';
import { AuditHistoryModule } from './components/AuditHistoryModule';
import { SettingsModule } from './components/SettingsModule';
import { NotesPlannerModule } from './components/NotesPlannerModule';
import { LoginScreen } from './components/LoginScreen';
import { StorageService } from './services/storageService';
import { SeriesLot, SearchResultItem } from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('etlik_auth_authenticated') === 'true';
  });
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Cross-module drilldown states
  const [selectedSeriesDetail, setSelectedSeriesDetail] = useState<SeriesLot | null>(null);
  const [selectedProvinceName, setSelectedProvinceName] = useState<string | null>(null);

  // Initialize storage defaults on first mount
  useEffect(() => {
    StorageService.initializeStorage();
  }, []);

  const handleLoginSuccess = () => {
    sessionStorage.setItem('etlik_auth_authenticated', 'true');
    setIsAuthenticated(true);
    StorageService.addAuditLog({
      user: 'Etlik Yetkilisi',
      action: 'Sisteme Giriş Yapıldı',
      module: 'Güvenlik',
      entityType: 'Oturum',
      entityId: 'auth-1907',
      details: '1907 şifresi ile başarılı oturum açıldı.'
    });
  };

  const handleLogout = () => {
    StorageService.addAuditLog({
      user: 'Etlik Yetkilisi',
      action: 'Oturum Kapatıldı',
      module: 'Güvenlik',
      entityType: 'Oturum',
      entityId: 'auth-logout',
      details: 'Kullanıcı güvenli oturumu sonlandırdı.'
    });
    sessionStorage.removeItem('etlik_auth_authenticated');
    setIsAuthenticated(false);
  };

  const handleRefreshData = () => {
    StorageService.initializeStorage();
    window.location.reload();
  };

  // If not authenticated, render LoginScreen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Handle item selection from Global Search
  const handleSelectSearchResult = (item: SearchResultItem) => {
    if (item.category === 'Seri / Lot' && item.actionData) {
      setSelectedSeriesDetail(item.actionData);
      setActiveView('inventory');
    } else if (item.category === 'İl' && item.actionData) {
      setSelectedProvinceName(item.actionData.name);
      setActiveView('distribution');
    } else if (item.category === 'Aşı') {
      setActiveView('inventory');
    } else if (item.category === 'Sevkiyat' && item.actionData) {
      setSelectedProvinceName(item.actionData.provinceName);
      setActiveView('distribution');
    } else {
      setActiveView(item.targetView);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      
      {/* Top Fixed Header */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        onRefreshData={handleRefreshData}
        onLogout={handleLogout}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />

        {/* Dynamic View Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 pb-12">
          {activeView === 'dashboard' && (
            <Dashboard
              onNavigate={(view) => setActiveView(view)}
              onOpenSeriesDetail={(series) => {
                setSelectedSeriesDetail(series);
                setActiveView('inventory');
              }}
              onOpenProvinceDetail={(provName) => {
                setSelectedProvinceName(provName);
                setActiveView('distribution');
              }}
            />
          )}

          {activeView === 'inventory' && (
            <InventoryModule
              selectedSeriesFromParent={selectedSeriesDetail}
              onClearSelectedSeries={() => setSelectedSeriesDetail(null)}
              onNavigateToDistribution={(seriesId) => {
                setActiveView('distribution');
              }}
            />
          )}

          {activeView === 'distribution' && (
            <DistributionModule
              preselectedProvinceName={selectedProvinceName}
              onClearPreselection={() => setSelectedProvinceName(null)}
            />
          )}

          {activeView === 'returns' && (
            <ReturnDestructionModule />
          )}

          {activeView === 'reports' && (
            <ReportsModule />
          )}

          {activeView === 'word_forms' && (
            <OfficialWordFormsView />
          )}

          {activeView === 'notes_planner' && (
            <NotesPlannerModule />
          )}

          {activeView === 'import' && (
            <ImportSystem />
          )}

          {activeView === 'history' && (
            <AuditHistoryModule />
          )}

          {activeView === 'settings' && (
            <SettingsModule />
          )}
        </main>

      </div>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectItem={handleSelectSearchResult}
      />

    </div>
  );
}
