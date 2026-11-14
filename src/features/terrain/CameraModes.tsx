// F2 заглушка (F0).
export function CameraModes() {
  return (
    <div role="group" aria-label="Camera mode">
      <button type="button" aria-pressed="true">Orbit</button> <button type="button" disabled>Top</button>{' '}
      <button type="button" disabled>POV</button>
    </div>
  );
}
// F2: контроль automerge — лише власна папка.
