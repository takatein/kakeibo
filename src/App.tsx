import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { HomePage } from './components/home/HomePage';
import { InputPage } from './components/input/InputPage';
import { TransactionsPage } from './components/transactions/TransactionsPage';
import { KnowledgePage } from './components/knowledge/KnowledgePage';
import { SimulatorPage } from './components/simulator/SimulatorPage';

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">💰</div>
          <p className="text-slate-400 text-sm">Kakeibo AI</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="input" element={<InputPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="simulator" element={<SimulatorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/kakeibo">
      <AuthProvider>
        <ProtectedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
