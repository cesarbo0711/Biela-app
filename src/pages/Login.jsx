// src/pages/Login.jsx
import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Importamos los estilos limpios

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (tipo) => {
    setLoading(true);
    setErrorMensaje('');
    
    let error;
    if (tipo === 'registro') {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      error = signUpError;
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    }

    if (error) {
      setErrorMensaje(error.message);
    } else {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo-text">BIELA</h1>
        <p className="subtitle">Bitácora de mantenimiento.</p>

        {errorMensaje && <div className="error-box">{errorMensaje}</div>}

        <div className="form-group">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />

          <div className="button-group">
            <button onClick={() => handleAuth('login')} disabled={loading} className="btn-primary">
              {loading ? 'Cargando...' : 'Entrar al Garaje'}
            </button>
            <button onClick={() => handleAuth('registro')} disabled={loading} className="btn-secondary">
              Registrar usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}