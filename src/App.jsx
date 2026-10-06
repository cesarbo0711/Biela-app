// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MotoDetail from './pages/MotoDetail';

function App() {
  // 1. Estado para manejar el modo leyendo si ya estaba guardado en localStorage
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  // 2. Efecto para agregar una clase global al <body> (por si tienes variables en CSS) 
  // y para guardar la preferencia del usuario en su navegador.
  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightMode]);

  // 3. Función para cambiar el tema que le pasaremos a los componentes
  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
  };

  // 4. Clases dinámicas de Tailwind: si es Light Mode aplica hueso/melocotón, sino el oscuro/lima
  const themeClasses = isLightMode 
    ? "bg-[#F8F5F0] text-neutral-900 selection:bg-[#FF9B71] selection:text-white" 
    : "bg-neutral-950 text-neutral-100 selection:bg-lime-500 selection:text-black";

  return (
    <Router>
      <div className={`min-h-screen font-sans transition-colors duration-300 ease-in-out ${themeClasses}`}>
        <Routes>
          <Route path="/" element={<Login />} />
          
          {/* Pasamos toggleTheme y el estado al Dashboard para poder poner el botón ahí */}
          <Route 
            path="/dashboard" 
            element={<Dashboard isLightMode={isLightMode} toggleTheme={toggleTheme} />} 
          />
          
          <Route path="/moto/:id" element={<MotoDetail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;