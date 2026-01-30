/**
 * Página de onboarding (registro de actor)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { OnboardActorData } from '../lib/api';

export function OnboardPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<OnboardActorData>({
    name: '',
    role: 'FIDUCIARIO',
    primaryDid: '',
    ethereumAddress: '',
    polkadotAccountId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Las identidades en cadena son opcionales por ahora
    // En el futuro se requerirán para verificación criptográfica

    try {
      await login(formData);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error al registrar actor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-6">Iniciar Sesión / Registrarse</h1>
        <p className="text-muted-foreground mb-8">
          Registra tu identidad en el sistema fidufi. Las identidades en cadena (DID, Ethereum, Polkadot) son opcionales por ahora.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Nombre (opcional)
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium mb-2">
              Rol
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="FIDUCIARIO">Fiduciario</option>
              <option value="COMITE_TECNICO">Comité Técnico</option>
              <option value="AUDITOR">Auditor</option>
              <option value="REGULADOR">Regulador</option>
            </select>
          </div>

          <div>
            <label htmlFor="primaryDid" className="block text-sm font-medium mb-2">
              DID Principal (opcional)
            </label>
            <Input
              id="primaryDid"
              value={formData.primaryDid}
              onChange={(e) => setFormData({ ...formData, primaryDid: e.target.value })}
              placeholder="did:kilt:..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ejemplo: did:kilt:4tDjyLy2gESkLfvaHHybM3oF4nC8EVkQVDMN8y8xFRT9tsZY
            </p>
          </div>

          <div>
            <label htmlFor="ethereumAddress" className="block text-sm font-medium mb-2">
              Dirección Ethereum (opcional)
            </label>
            <Input
              id="ethereumAddress"
              value={formData.ethereumAddress}
              onChange={(e) => setFormData({ ...formData, ethereumAddress: e.target.value })}
              placeholder="0x..."
            />
          </div>

          <div>
            <label htmlFor="polkadotAccountId" className="block text-sm font-medium mb-2">
              AccountId Polkadot (opcional)
            </label>
            <Input
              id="polkadotAccountId"
              value={formData.polkadotAccountId}
              onChange={(e) => setFormData({ ...formData, polkadotAccountId: e.target.value })}
              placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
            />
          </div>

          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Las identidades en cadena (DID, Ethereum, Polkadot) son opcionales por ahora.
              En el futuro, estas identidades se configurarán en Settings y se verificarán mediante firma criptográfica.
            </p>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Registrando...' : 'Registrarse'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
