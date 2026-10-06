import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import PageTransition from '../common/PageTransition';
import GlobalCopilot from '../ai/GlobalCopilot';

const standalonePaths = ['/', '/login', '/register', '/forgot-password'];

function Layout({ children }) {
  const location = useLocation();
  const isStandalonePage = standalonePaths.includes(location.pathname);

  if (isStandalonePage) {
    return <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Stacked on phones, side-by-side from md up. As a flex row the sidebar
          shrank but never wrapped, which pushed the page to 652px of content in
          a 390px viewport and forced a horizontal scroll on every screen. */}
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main className="flex-1 p-4 sm:p-6"><PageTransition key={location.pathname}>{children}</PageTransition></main>
          <Footer />
          <GlobalCopilot />
        </div>
      </div>
    </div>
  );
}

export default Layout;
