import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'ghost' | 'glow';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  default: 'liquid-glass liquid-glass-hover text-white/80 hover:text-white',
  primary: 'liquid-glass text-white bg-white/[0.06]',
  ghost:   'text-white/50 hover:text-white/80 border border-white/[0.06] hover:border-white/[0.12]',
  glow:    'liquid-glass text-white bg-white/[0.04] hover:bg-white/[0.08]',
};

const sizes = {
  sm: 'px-4 py-2 text-sm rounded-full',
  md: 'px-6 py-3 text-sm rounded-full',
  lg: 'px-8 py-4 text-base rounded-full',
};

export default function GlassButton({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        relative inline-flex items-center gap-2 font-medium
        transition-all duration-300 cursor-none select-none
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
}
