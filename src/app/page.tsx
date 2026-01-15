'use client';

import { useState, useEffect } from "react";
import PinAuth from "@/components/auth/PinAuth";
import TabShell from "@/components/layout/TabShell";
import ContractForm from "@/components/forms/ContractForm";
import PaymentForm from "@/components/forms/PaymentForm";
import OverdueList from "@/components/lists/OverdueList";
// import CustomerList from "@/components/lists/CustomerList";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; spreadsheetId: string } | null>(null);
  const [activeLink, setActiveLink] = useState<string | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('asf_staff_name');
    const savedId = localStorage.getItem('asf_spreadsheet_id');
    if (savedName && savedId) {
      setUser({ name: savedName, spreadsheetId: savedId });
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthSuccess = (staffName: string, spreadsheetId: string) => {
    localStorage.setItem('asf_staff_name', staffName);
    localStorage.setItem('asf_spreadsheet_id', spreadsheetId);
    setUser({ name: staffName, spreadsheetId: spreadsheetId });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      localStorage.clear();
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  if (!isAuthenticated || !user) {
    return <PinAuth onSuccess={handleAuthSuccess} />;
  }

  return (
    <TabShell userName={user.name} onLogout={handleLogout} activeLink={activeLink}>
      {(activeTab) => (
        <div className="space-y-6">
          {activeTab === 'contract' && (
            <div className="glass-panel p-8 rounded-3xl animate-in fade-in slide-in-from-right duration-500">
              <ContractForm
                staffName={user.name}
                spreadsheetId={user.spreadsheetId}
                onSelectCustomer={(link) => setActiveLink(link)}
              />
            </div>
          )}
          {activeTab === 'payment' && (
            <div className="glass-panel p-8 rounded-3xl animate-in fade-in slide-in-from-right duration-500">
              <PaymentForm
                staffName={user.name}
                spreadsheetId={user.spreadsheetId}
                onSelectCustomer={(link) => setActiveLink(link)}
              />
            </div>
          )}
          {activeTab === 'overdue' && (
            <div className="glass-panel p-8 rounded-3xl animate-in fade-in slide-in-from-right duration-500">
              <OverdueList />
            </div>
          )}
        </div>
      )}
    </TabShell>
  );
}
