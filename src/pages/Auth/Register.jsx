import { Link } from 'react-router-dom';
import { GraduationCap, ShieldAlert, ArrowLeft } from 'lucide-react';
import Button from '../../components/common/Button';

function Register() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/25">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">EduPilot AI</h1>
          <p className="text-sm text-slate-400">Institutional Access Restricted</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-black/60 text-center space-y-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
            <ShieldAlert size={24} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Direct Registration Disabled</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              EduPilot student and faculty accounts are strictly provisioned by your institute administration. 
              Public account registration is not permitted.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-800 text-xs text-slate-400 text-left space-y-2">
            <p><strong>Students:</strong> Log in using your assigned Student ID and temporary password provided during enrollment.</p>
            <p><strong>Faculty:</strong> Log in using your designated Faculty ID and password.</p>
          </div>

          <Link to="/login" className="block">
            <Button className="w-full py-3 flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Return to Login Portal
            </Button>
          </Link>
        </div>

        <div className="text-center text-xs text-slate-600">
          <Link to="/" className="hover:text-slate-400 transition">← Back to Public Website</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;

