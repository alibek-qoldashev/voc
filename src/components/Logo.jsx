// Brend nomini shu yerda o'zgartirsangiz, hamma joyda almashadi
export const BRAND = 'VOC';

export default function Logo({ className = 'text-2xl' }) {
  return <span className={`font-extrabold tracking-tight text-leaf ${className}`}>{BRAND}</span>;
}
