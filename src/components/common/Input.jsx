import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, id, className = '', ...props }, ref) {
  return (
    <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
      {label && <span>{label}</span>}
      <input
        id={id}
        ref={ref}
        className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 placeholder:normal-case focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 ${className}`}
        {...props}
      />
    </label>
  );
});

export default Input;
