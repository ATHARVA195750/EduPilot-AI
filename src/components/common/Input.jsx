import { forwardRef, useRef } from 'react';

const Input = forwardRef(function Input({ label, id, className = '', autoComplete, name, onChange, onBlur, ...props }, ref) {
  const innerRef = useRef(null);

  const setRefs = (el) => {
    innerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
      {label && <span>{label}</span>}
      <input
        id={id}
        name={name}
        autoComplete={autoComplete}
        onChange={onChange}
        onBlur={onBlur}
        ref={setRefs}
        className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-normal text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 placeholder:normal-case focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 ${className}`}
        {...props}
      />
    </label>
  );
});

export default Input;

