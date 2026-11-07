import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MotoDetail from './pages/MotoDetail';
import MapaGasolina from './pages/MapaGasolina';
import Profile from './pages/Profile';
import ChatBot from './pages/ChatBot';
// IMPORTAMOS EL NUEVO NAVBAR
import Navbar from './components/Navbar'; 

function App() {
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  const toggleTheme = () => setIsLightMode(!isLightMode);

  // NOTA: Se le agregó "pb-24" o similar (vía Navbar) para que 
  // el contenido no quede oculto detrás de la barra flotante.
  const themeClasses = isLightMode 
    ? "bg-[#F8F5F0] text-neutral-900 selection:bg-[#FF9B71] selection:text-white" 
    : "bg-neutral-950 text-neutral-100 selection:bg-lime-500 selection:text-black";

  return (
    <Router>
      {/* 
        El contenedor principal tiene pb-24 (padding-bottom) 
        para que cuando hagas scroll, el último elemento no se 
        quede escondido debajo de la pastilla del Navbar. 
      */}
      <div className={`min-h-screen font-sans transition-colors duration-300 ease-in-out pb-24 relative ${themeClasses}`}>
        <Routes>
          <Route path="/" element={<Login />} />
          
          <Route 
            path="/dashboard" 
            element={<Dashboard isLightMode={isLightMode} toggleTheme={toggleTheme} />} 
          />
          
          <Route path="/moto/:id" element={<MotoDetail />} />
          
          {/* El Radar de Bombas */}
          <Route path="/mapa-gasolina" element={<MapaGasolina />} />
          
          {/* Perfil del Usuario */}
          <Route path="/perfil" element={<Profile />} />
          
          {/* Chat con BujÍA */}
          <Route path="/chat" element={<ChatBot />} />
          
          {/* Pestaña de Tiendas (Aún en construcción, apunta a futuro) */}
          <Route path="/tiendas" element={<div className="p-6 text-center mt-20"><h2 className="font-bold text-xl text-[#84cc16]">Directorio de Tiendas</h2><p>Próximamente...</p></div>} />
        </Routes>
        
        {/* RENDERIZAMOS EL NAVBAR FLOTANTE GLOBALMENTE */}
        <Navbar />
      </div>
    </Router>
  );
}

export default App;