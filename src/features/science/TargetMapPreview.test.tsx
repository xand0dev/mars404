import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockTargets } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { TargetMapPreview } from './TargetMapPreview';

beforeEach(() => resetMission());

describe('#180 · What awaits you there?', () => {
  it('Given marker target id; Then compact preview shows essential details without auto-add', () => {
    const toggleTarget = vi.fn();
    useMission.setState({ targets: mockTargets, selectedTargetIds: [], reach: null, toggleTarget });

    render(<TargetMapPreview targetId="mock-a" onClose={() => {}} />);

    const dialog = screen.getByRole('dialog', { name: 'MOCK Site A' });
    expect(dialog).toHaveAttribute('data-layout', 'compact');
    expect(within(dialog).queryByText('What awaits you there?')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/шаруваті відклади/i)).toBeVisible();
    expect(within(dialog).getByText(/Reach not assessed/i)).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Add to route' })).toBeVisible();
    expect(toggleTarget).not.toHaveBeenCalled();
  });

  it('When Close, Escape, or outside is used; Then preview closes', async () => {
    useMission.setState({ targets: mockTargets });
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<TargetMapPreview targetId="mock-a" onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close target preview' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<TargetMapPreview targetId="mock-a" onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('Given missing or null target id; Then no preview is rendered', () => {
    useMission.setState({ targets: mockTargets });
    const { rerender } = render(<TargetMapPreview targetId={null} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<TargetMapPreview targetId="missing" onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
