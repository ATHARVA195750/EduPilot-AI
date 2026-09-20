function Card({ children, className = '', interactive = false }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm backdrop-blur transition duration-200 text-slate-900 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 ${
        interactive ? 'cursor-pointer hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl dark:hover:border-slate-700 dark:hover:shadow-slate-950/30' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
