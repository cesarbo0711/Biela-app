import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // No mostramos el navbar en la pantalla de Login
  if (location.pathname === '/') return null;

  const isActive = (path) => location.pathname.includes(path);

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[5000] px-4 flex justify-center pointer-events-none">
      <nav className="biela-navbar flex items-center justify-between px-2 py-2 rounded-[2rem] w-full max-w-sm pointer-events-auto transition-all">
        
        {/* HOME / GARAJE */}
        <button 
          onClick={() => navigate('/dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 px-4 rounded-full transition-all active:scale-95 ${isActive('/dashboard') ? 'nav-btn-active' : 'nav-btn-inactive hover:bg-neutral-800'}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive('/dashboard') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </button>

        {/* MAPA DE BOMBAS */}
        <button 
          onClick={() => navigate('/mapa-gasolina')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 px-4 rounded-full transition-all active:scale-95 ${isActive('/mapa-gasolina') ? 'nav-btn-active' : 'nav-btn-inactive hover:bg-neutral-800'}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive('/mapa-gasolina') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </button>

        {/* BUJÍA (CENTRO DESTACADO) */}
        <div className="px-1">
          <button 
            onClick={() => navigate('/chat')} 
            className="flex flex-col items-center justify-center w-12 h-12 bg-gradient-to-tr from-[#65a30d] to-[#a3e635] text-black rounded-full shadow-[0_0_15px_rgba(132,204,22,0.4)] hover:scale-105 active:scale-95 transition-all"
          >
             <span className="text-xl">🤖</span>
          </button>
        </div>

        {/* PERFIL */}
        <button 
          onClick={() => navigate('/perfil')}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 px-4 rounded-full transition-all active:scale-95 ${isActive('/perfil') ? 'nav-btn-active' : 'nav-btn-inactive hover:bg-neutral-800'}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isActive('/perfil') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </button>

      </nav>
    </div>
  );
}