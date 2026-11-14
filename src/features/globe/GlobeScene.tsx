// F1 заглушка (F0): R3F-вузли глобуса. Рендериться всередині MapView (F2) через проп globe.
export function GlobeScene() {
  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <mesh>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color="#b4532a" />
      </mesh>
    </group>
  );
}
