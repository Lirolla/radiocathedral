
import React, { useState } from 'react';
import { LockIcon, XMarkIcon } from './Icons';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
        onLogin(password);
        setPassword('');
    } else {
        setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
        >
            <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-purple-500">
                <LockIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Área Restrita</h3>
            <p className="text-sm text-gray-400 text-center">Digite a senha de administrador para acessar o estúdio.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input 
                type="password" 
                autoFocus
                placeholder="Senha de Acesso"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-center tracking-widest"
            />
            {error && <span className="text-red-500 text-xs text-center font-bold">Senha incorreta. Tente novamente.</span>}
            
            <button 
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-purple-900/20"
            >
                ENTRAR
            </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
