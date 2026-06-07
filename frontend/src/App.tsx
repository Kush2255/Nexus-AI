import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LandingPage   from './pages/LandingPage';
import Dashboard     from './pages/Dashboard';
import ChatPage      from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import ReportsPage   from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage  from './pages/SettingsPage';
import NotFoundPage  from './pages/NotFoundPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"            element={<LandingPage   />} />
          <Route path="/dashboard"   element={<Dashboard     />} />
          <Route path="/chat"        element={<ChatPage      />} />
          <Route path="/chat/:id"    element={<ChatPage      />} />
          <Route path="/documents"   element={<DocumentsPage />} />
          <Route path="/reports"     element={<ReportsPage   />} />
          <Route path="/analytics"   element={<AnalyticsPage />} />
          <Route path="/settings"    element={<SettingsPage  />} />
          <Route path="*"            element={<NotFoundPage  />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
