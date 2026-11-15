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
    expect(screen.getByRole('link', { name: 'NASA source' })).toHaveAttribute('href', 'https://mars.nasa.gov/raw_images/1');
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

  it('знімок Spirit з PDS (approximate) — справжні sol/камера/credit з даних, «NASA source», позначка assumption', () => {
    const photo: SurfacePhoto = {
      id: 'spirit-1', coordinates: [50, 40], lonLat: [175.53, -14.6], url: 'https://planetarydata.jpl.nasa.gov/img/data/mer/spirit/mer2no_0xxx/browse/sol0738/edr/x.img.jpg',
      alt: 'Left Navcam view from Spirit rover site 123, sol 738', sourceUrl: 'https://planetarydata.jpl.nasa.gov/img/data/mer/spirit/mer2no_0xxx/data/sol0738/edr/x.img',
      credit: 'NASA/JPL-Caltech', sol: 738, camera: 'NAVCAM_LEFT', locationAccuracy: 'approximate', status: 'verified',
    };
    render(<ViewFromHere photos={[photo]} segment={segment} segmentIndex={0} targets={[]} />);

    expect(screen.getByRole('img', { name: photo.alt })).toHaveAttribute('src', photo.url);
    expect(screen.getByText(/Navcam, sol 738, taken ~40 m from segment 1 \(approximate location\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'NASA source' })).toHaveAttribute('href', photo.sourceUrl);
    expect(screen.getByText('Location: approximate rover site — assumption.')).toBeInTheDocument();
  });

  it('знімок із зупинки ровера — позначка точності «rover stop»', () => {
    const photo: SurfacePhoto = {
      id: 'p2', coordinates: [50, 10], lonLat: [0, 0], url: 'photos/p2.jpg', alt: 'Navcam p2', sourceUrl: 'https://mars.nasa.gov/raw_images/886246',
      credit: 'NASA/JPL-Caltech', sol: 3008, camera: 'NAV_LEFT_B', locationAccuracy: 'rover-stop', status: 'verified',
    };
    render(<ViewFromHere photos={[photo]} segment={segment} segmentIndex={0} targets={[]} />);
    expect(screen.getByText('Location: rover stop, not the exact camera spot.')).toBeInTheDocument();
  });
});
