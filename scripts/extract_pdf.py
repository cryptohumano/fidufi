#!/usr/bin/env python3
"""
Script temporal para extraer texto del PDF del contrato.
Requiere: pip install pdfplumber
"""

import sys
import os

def extract_pdf_text(pdf_path):
    """Extrae texto del PDF usando pdfplumber"""
    try:
        import pdfplumber
        
        print(f"Extrayendo texto de: {pdf_path}")
        print("=" * 80)
        
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            total_pages = len(pdf.pages)
            print(f"Total de páginas: {total_pages}\n")
            
            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    full_text += f"\n--- PÁGINA {i} ---\n\n"
                    full_text += text + "\n\n"
            
            return full_text
            
    except ImportError:
        print("ERROR: pdfplumber no está instalado.")
        print("Instala con: pip install pdfplumber")
        return None
    except Exception as e:
        print(f"ERROR al procesar PDF: {e}")
        return None

if __name__ == "__main__":
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else "docs/Contrato_de_Fideicomiso_10045__1.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"ERROR: No se encontró el archivo: {pdf_path}")
        sys.exit(1)
    
    text = extract_pdf_text(pdf_path)
    
    if text:
        # Guardar en archivo de texto
        output_path = pdf_path.replace(".pdf", "_extracted.txt")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"\nTexto extraído guardado en: {output_path}")
        print(f"\nPrimeros 2000 caracteres:\n")
        print(text[:2000])
    else:
        sys.exit(1)
