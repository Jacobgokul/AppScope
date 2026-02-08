import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export default function FeatureCard({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      onMouseMove={handleMouseMove}
      className="group relative p-8 bg-dark-800/50 backdrop-blur-lg rounded-2xl border border-dark-700/50 hover:border-primary-500/50 transition-all duration-300 overflow-hidden"
    >
      {/* Spotlight effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(168, 85, 247, 0.1), transparent 40%)`,
        }}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
        <p className="text-dark-300 leading-relaxed">{description}</p>
      </div>

      {/* Glow effect */}
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl group-hover:bg-primary-500/30 transition-all duration-300" />
    </motion.div>
  );
}
