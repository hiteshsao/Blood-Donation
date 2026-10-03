import { Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950/80 py-8 px-4 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="flex items-center gap-1.5">
          <span>Blood Donation Management System</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-slate-400">
            Engineered with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" /> for community impact
          </span>
        </p>
        <p className="text-slate-400">
          Stack: Express + MongoDB + React 19 + Vite + Tailwind CSS + Socket.io
        </p>
      </div>
    </footer>
  );
};
