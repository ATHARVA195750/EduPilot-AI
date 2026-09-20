import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import PageTransition from '../common/PageTransition';

const standalonePaths = ['/', '/login', '/register', '/forgot-password'];

function Layout({ children }) {
  const location = useLocation();
  const isStandalonePage = standalonePaths.includes(location.pathname);

  if (isStandalonePage) {
    return <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Navbar />
          <main className="flex-1 p-4 sm:p-6"><PageTransition key={location.pathname}>{children}</PageTransition></main>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default Layout;
