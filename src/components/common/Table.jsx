function Table({ children, className = '' }) {
  return <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white text-slate-900 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 ${className}`}>{children}</div>;
}

export default Table;
