import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ApiError } from '../lib/api';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Գաղտնաբառը պետք է լինի առնվազն 6 նիշ');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/projects');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Գրանցումը ձախողվեց');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-lg font-medium text-stone-900">Գրանցում</h1>
          <p className="text-sm text-stone-500 mt-1">Ստեղծեք հաշիվ</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
          )}
          <Input label="Անուն" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Էլ. փոստ" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Գաղտնաբառ" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" loading={loading}>Գրանցվել</Button>
          <p className="text-center text-sm text-stone-500">
            Արդեն ունե՞ք հաշիվ{' '}
            <Link to="/login" className="text-stone-900 hover:underline">Մուտք</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
