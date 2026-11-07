import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // No mostramos el navbar en la pantalla de Login
  if (location.pathname === '/') return null;

  const isActive = (path) => location.pathname.includes(path);

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[5000] px-4 flex justify-center pointer-events-none">
      <nav className="biela-navbar flex items-center justify-between px-3 py-2.5 rounded-full w-full max-w-sm pointer-events-auto transition-all">
        
        {/* BOTÓN 1: HOME / GARAJE (A la izquierda) */}
        <button 
          onClick={() => navigate('/dashboard')}
          className={`flex-1 flex items-center justify-center h-12 rounded-[1.2rem] transition-all duration-300 active:scale-95 ${isActive('/dashboard') ? 'nav-btn-active' : 'text-neutral-400 hover:text-white'}`}
        >
          {/* Ícono de Casita minimalista */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isActive('/dashboard') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </button>

        {/* BOTÓN 2: MAPA DE BOMBAS (Centro Izquierda) */}
        <button 
          onClick={() => navigate('/mapa-gasolina')}
          className={`flex-1 flex items-center justify-center h-12 rounded-[1.2rem] transition-all duration-300 active:scale-95 ${isActive('/mapa-gasolina') ? 'nav-btn-active' : 'text-neutral-400 hover:text-white'}`}
        >
          {/* Ícono de Pin de Ubicación (Como en tu imagen) */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isActive('/mapa-gasolina') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </button>

        {/* BOTÓN 3: BUJÍA / CHAT (CENTRO ABSOLUTO CON GLOW) */}
        <div className="flex justify-center px-1">
          <button 
            onClick={() => navigate('/chat')} 
            className="flex items-center justify-center w-[52px] h-[52px] bujia-glow text-black rounded-full hover:scale-105 active:scale-95 transition-all duration-300 z-10"
          >
             <span className="text-2xl drop-shadow-md">🤖</span>
          </button>
        </div>

        {/* BOTÓN 4: TIENDAS (Centro Derecha) */}
        <button 
          onClick={() => navigate('/tiendas')}
          className={`flex-1 flex items-center justify-center h-12 rounded-[1.2rem] transition-all duration-300 active:scale-95 ${isActive('/tiendas') ? 'nav-btn-active' : 'text-neutral-400 hover:text-white'}`}
        >
          {/* Ícono de Tienda/Llave */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isActive('/tiendas') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
        </button>

        {/* BOTÓN 5: PERFIL (A la derecha) */}
        <button 
          onClick={() => navigate('/perfil')}
          className={`flex-1 flex items-center justify-center h-12 rounded-[1.2rem] transition-all duration-300 active:scale-95 ${isActive('/perfil') ? 'nav-btn-active' : 'text-neutral-400 hover:text-white'}`}
        >
          {/* Ícono de Usuario minimalista (Como en tu imagen) */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isActive('/perfil') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </button>

      </nav>
    </div>
  );
}