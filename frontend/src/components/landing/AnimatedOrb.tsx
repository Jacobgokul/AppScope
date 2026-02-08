export default function AnimatedOrb() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-[600px] h-[600px]">
        {/* Main morphing orb */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary-500 via-pink-500 to-cyan-500 opacity-30 blur-3xl animate-morph"
          style={{
            animation: 'morph 15s ease-in-out infinite',
          }}
        />

        {/* Secondary glow */}
        <div
          className="absolute inset-10 bg-gradient-to-tr from-cyan-400 via-primary-400 to-pink-400 opacity-20 blur-2xl"
          style={{
            animation: 'morph 20s ease-in-out infinite reverse',
          }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full opacity-40"
              style={{
                top: `${20 + i * 15}%`,
                left: `${15 + i * 12}%`,
                animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
