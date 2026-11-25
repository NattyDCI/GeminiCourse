import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDefaultPageProgress } from '../storage/patternDb';
import type { PageProgress } from '../types/pattern';
import { PageCounterPanel } from './PageCounterPanel';

function ControlledPanel({ initialPage = 2 }: { initialPage?: number }) {
  const [progress, setProgress] = useState<PageProgress>(() =>
    createDefaultPageProgress(initialPage)
  );
  return (
    <PageCounterPanel
      pageNumber={initialPage}
      numPages={5}
      progress={progress}
      lastSavedAt={progress.updatedAt}
      onChangeProgress={setProgress}
    />
  );
}

describe('PageCounterPanel', () => {
  it('increments, decrements, sets target, and adds extra counters for the current page', () => {
    render(<ControlledPanel initialPage={2} />);

    expect(screen.getByRole('heading', { name: /Página 2/i })).toBeInTheDocument();

    const valueInput = screen.getByLabelText('Valor de Vueltas / Filas') as HTMLInputElement;
    expect(valueInput.value).toBe('0');

    // Increment by 1 -> status automatically moves from Pendiente to En progreso
    const plusBtn = screen.getByLabelText('Sumar 1 a Vueltas / Filas');
    fireEvent.click(plusBtn);
    fireEvent.click(plusBtn);
    expect(valueInput.value).toBe('2');

    // Decrement by 1
    const minusBtn = screen.getByLabelText('Restar 1 a Vueltas / Filas');
    fireEvent.click(minusBtn);
    expect(valueInput.value).toBe('1');

    // Add a target and reach it
    const targetInput = screen.getByLabelText('Meta de Vueltas / Filas') as HTMLInputElement;
    fireEvent.change(targetInput, { target: { value: '2' } });
    fireEvent.click(plusBtn);
    expect(screen.getByText(/Meta alcanzada/i)).toBeInTheDocument();

    // Add a second independent counter on the same page
    fireEvent.click(screen.getByRole('button', { name: /Añadir contador/i }));
    const nameInput = screen.getByPlaceholderText(/Ej\. Trenzas o Disminuciones/i);
    fireEvent.change(nameInput, { target: { value: 'Disminuciones' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(screen.getByLabelText('Valor de Disminuciones')).toBeInTheDocument();

    // Update notes for page 2
    const notes = screen.getByLabelText('Notas de la página 2') as HTMLTextAreaElement;
    fireEvent.change(notes, { target: { value: 'Recordar marcar inicio de vuelta' } });
    expect(notes.value).toBe('Recordar marcar inicio de vuelta');
  });
});
