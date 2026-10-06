import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useInstitute } from '../contexts/InstituteContext';
import { signOut } from '../services/authService';

function ProtectedRoute({ children, role, allowedRoles }) {
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const { role: userRole, loading: instituteLoading, profileError, profile } = useInstitute();

  if (authLoading || instituteLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="text-slate-400 font-medium text-sm">Verifying EduPilot Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (profileError || !userRole) {
    const isInactiveAccount = profileError?.toLowerCase().includes('inactive');
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center space-y-4 shadow-2xl">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-semibold text-white">
            {isInactiveAccount ? "Account Access Restricted" : "Account Configuration Error"}
          </h2>
          <p className="text-slate-400 text-sm">
            {profileError || "Your user profile does not have a valid role assigned."}
          </p>
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }


  let permitted = [];
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    permitted = allowedRoles;
  } else if (role === 'owner') {
    permitted = ['owner'];
  } else if (role === 'admin') {
    permitted = ['owner', 'admin'];
  } else if (role === 'teacher') {
    permitted = ['owner', 'admin', 'teacher'];
  } else if (role === 'student') {
    permitted = ['student'];
  } else if (role === 'any') {
    permitted = ['owner', 'admin', 'teacher', 'student'];
  } else {
    permitted = ['owner', 'admin'];
  }

  if (!permitted.includes(userRole)) {
    if (userRole === 'student') return <Navigate to="/student" replace />;
    if (userRole === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
