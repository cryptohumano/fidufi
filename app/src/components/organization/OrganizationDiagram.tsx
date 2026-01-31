/**
 * Componente para visualizar la estructura organizacional con Mermaid
 */

import { useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Users, Building2 } from 'lucide-react';

interface OrganizationDiagramProps {
  mermaidDiagram: string;
  trustName?: string | null;
  totalMembers: number;
}

export function OrganizationDiagram({
  mermaidDiagram,
  trustName,
  totalMembers,
}: OrganizationDiagramProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Cargar Mermaid dinámicamente
    const loadMermaid = async () => {
      try {
        // Verificar si ya está cargado
        if (typeof window !== 'undefined' && (window as any).mermaid) {
          if (isMounted) renderDiagram();
          return;
        }

        // Cargar desde CDN
        const existingScript = document.querySelector('script[src*="mermaid"]');
        if (existingScript) {
          // Esperar a que se cargue
          existingScript.addEventListener('load', () => {
            if (isMounted) renderDiagram();
          });
          if ((window as any).mermaid && isMounted) {
            renderDiagram();
          }
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        script.onload = () => {
          if ((window as any).mermaid && isMounted) {
            (window as any).mermaid.initialize({ 
              startOnLoad: false,
              theme: 'default',
              securityLevel: 'loose',
              flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
              },
            });
            renderDiagram();
          }
        };
        script.onerror = () => {
          console.error('Error cargando Mermaid');
          if (mermaidRef.current && isMounted) {
            mermaidRef.current.innerHTML = '<p class="text-muted-foreground text-center p-4">Error al cargar el diagrama. Por favor, recarga la página.</p>';
          }
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error cargando Mermaid:', error);
      }
    };

    const renderDiagram = async () => {
      if (!mermaidRef.current || !(window as any).mermaid || !isMounted) return;

      try {
        mermaidRef.current.innerHTML = '<div class="text-center p-4 text-muted-foreground">Generando diagrama...</div>';
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await (window as any).mermaid.render(id, mermaidDiagram);
        if (mermaidRef.current && isMounted) {
          mermaidRef.current.innerHTML = svg;
        }
      } catch (error: any) {
        console.error('Error renderizando diagrama:', error);
        if (mermaidRef.current && isMounted) {
          mermaidRef.current.innerHTML = `
            <div class="text-center p-8 text-muted-foreground">
              <p class="mb-4">Error al renderizar el diagrama.</p>
              <details class="text-left">
                <summary class="cursor-pointer text-sm mb-2">Ver código del diagrama</summary>
                <pre class="mt-2 text-xs bg-muted p-4 rounded overflow-auto max-h-64">${mermaidDiagram}</pre>
              </details>
            </div>
          `;
        }
      }
    };

    loadMermaid();

    return () => {
      isMounted = false;
    };
  }, [mermaidDiagram]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Estructura Organizacional</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{totalMembers} miembros</span>
        </div>
      </div>
      
      {trustName && (
        <p className="text-sm text-muted-foreground mb-4">
          {trustName}
        </p>
      )}
      
      <div className="w-full overflow-x-auto">
        <div 
          ref={mermaidRef}
          className="mermaid-diagram flex justify-center items-center min-h-[400px]"
        >
          <div className="text-center text-muted-foreground">
            Cargando diagrama...
          </div>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Diagrama generado automáticamente basado en los miembros activos del fideicomiso
      </p>
    </Card>
  );
}
