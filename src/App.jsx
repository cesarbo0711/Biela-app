// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MotoDetail from './pages/MotoDetail';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-lime-500 selection:text-black">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/moto/:id" element={<MotoDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;