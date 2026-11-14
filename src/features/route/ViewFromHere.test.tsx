import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Segment, SurfacePhoto, Target, XY } from '../../contracts';
import { mockTargets } from '../../mocks';
import { ViewFromHere } from './ViewFromHere';

const segment: Segment = { from: [0, 0], to: [100, 0], dist: 100, slope: 0, time: 100, o2: 20, energy: 5, dose: null };

const targetAt = (coordinates: XY): Target => ({
  ...mockTargets[0]!,
  id: 'kimberley',
  name: 'Kimberley',
  coordinates,
  photo: { url: 'photos/kimberley.jpg', alt: 'Layered rock outcrop at Kimberley', credit: 'NASA/JPL-Caltech', sol: 603, sourceUrl: 'https://mars.nasa.gov/raw_images/1', status: 'verified' },
});

describe('ViewFromHere · F4-AC6', () => {
  it('знімок ближче 300 м — фото з alt, чесний підпис, credit і посилання', () => {
    render(<ViewFromHere photos={[]} segment={segment} segmentIndex={2} targets={[targetAt([50, 120])]} />);

    expect(screen.getByRole('img', { name: 'Layered rock outcrop at Kimberley' })).toHaveAttribute('src', 'photos/kimberley.jpg');
    expect(screen.getByText(/sol 603, taken ~120 m from segment 3 \(science target Kimberley\)/i)).toBeInTheDocument();
    expect(screen.getByText(/NASA\/JPL-Caltech/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute('href', 'https://mars.nasa.gov/raw_images/1');
    expect(screen.getByText(/300 m radius — assumption/i)).toBeInTheDocument();
  });

  it('далі 300 м — текст «No surface photo within 300 m», без зображення', () => {
    render(<ViewFromHere photos={[]} segment={segment} segmentIndex={0} targets={[targetAt([50, 400])]} />);
    expect(screen.getByText('No surface photo within 300 m')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('файл не завантажився — заглушка з alt, а не порожня рамка', () => {
    render(<ViewFromHere photos={[]} segment={segment} segmentIndex={0} targets={[targetAt([50, 0])]} />);
    fireEvent.error(screen.getByRole('img'));

    const placeholder = screen.getByRole('img', { name: 'Layered rock outcrop at Kimberley' });
    expect(placeholder.tagName).not.toBe('IMG');
    expect(placeholder).toHaveTextContent(/photo unavailable/i);
  });

  it('знімок з photos — підпис «Navcam, sol N, taken ~D m from this segment (rover stop)»', () => {
    const photo: SurfacePhoto = {
      id: 'p1', coordinates: [50, 80], lonLat: [0, 0], url: 'photos/p1.jpg', alt: 'Navcam view of layered bedrock', sourceUrl: 'https://mars.nasa.gov/raw_images/887166',
      credit: 'NASA/JPL-Caltech', sol: 3010, camera: 'NAV_LEFT_B', locationAccuracy: 'rover-stop', status: 'verified',
    };
    render(<ViewFromHere photos={[photo]} segment={segment} segmentIndex={1} targets={[targetAt([50, 10])]} />);

    expect(screen.getByRole('img', { name: 'Navcam view of layered bedrock' })).toBeInTheDocument();
    expect(screen.getByText(/Navcam, sol 3010, taken ~80 m from segment 2 \(rover stop\)/)).toBeInTheDocument();
    expect(screen.getByText(/view from the rover stop, not from the route/i)).toBeInTheDocument();
  });
});
