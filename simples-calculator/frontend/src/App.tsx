import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import EmpresasPage from './pages/EmpresasPage';
import DashboardPage from './pages/DashboardPage';
import './styles.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/empresas" replace />} />
        <Route path="empresas" element={<EmpresasPage />} />
        <Route path="empresas/nova" element={<EmpresasPage />} />
        <Route path="empresas/:id" element={<DashboardPage />} />
        <Route path="empresas/:id/editar" element={<EmpresasPage />} />
      </Route>
    </Routes>
  );
}

export default App;