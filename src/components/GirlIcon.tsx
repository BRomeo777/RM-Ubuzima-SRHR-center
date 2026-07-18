import { cn } from '../utils/helpers';

interface GirlIconProps {
  className?: string;
  size?: number;
}

export default function GirlIcon({ className, size = 24 }: GirlIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('', className)}
    >
      {/* Head */}
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Hair/Ponytail */}
      <path
        d="M8 6C8 4 10 2 12 2C14 2 16 4 16 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Body */}
      <path
        d="M6 22V16C6 14 8 12 12 12C16 12 18 14 18 16V22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Dress line */}
      <path
        d="M9 22L12 17L15 22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
