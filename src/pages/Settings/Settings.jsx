import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInstitute } from '../../contexts/InstituteContext';
import {
  fetchInstituteDetails,
  updateInstituteDetails,
  fetchInstituteUsers,
  updateUserProfile,
} from '../../services/instituteService';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import PageTransition from '../../components/common/PageTransition';
import Loader from '../../components/common/Loader';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Globe,
  Layers,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

export default function Settings() {
  const { user, profile, institute, instituteId, role } = useInstitute();

  const [activeTab, setActiveTab] = useState('institute');

  // Institute Form State
  const [instForm, setInstForm] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    description: '',
  });
  const [savingInst, setSavingInst] = useState(false);
  const [instSuccess, setInstSuccess] = useState('');
  const [instError, setInstError] = useState('');

  // User Roster State
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState('');

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Initial load
  useEffect(() => {
    if (institute) {
      setInstForm({
        name: institute.name || '',
        code: institute.code || '',
        phone: institute.phone || '',
        email: institute.email || '',
        address: institute.address || '',
        website: institute.website || '',
        description: institute.description || '',
      });
    }
  }, [institute]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'roster' && instituteId) {
      loadRoster();
    }
  }, [activeTab, instituteId]);

  const loadRoster = async () => {
    setLoadingRoster(true);
    setRosterError('');
    try {
      const users = await fetchInstituteUsers(instituteId);
      setRoster(users);
    } catch (err) {
      console.error('Error loading roster:', err);
      setRosterError(err.message || String(err));
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleSaveInstitute = async (e) => {
    e.preventDefault();
    setInstSuccess('');
    setInstError('');
    setSavingInst(true);

    try {
      const updated = await updateInstituteDetails(instituteId, instForm);
      setInstSuccess('Institute settings updated successfully!');
      // Reload page to reflect updated institute details across context
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error('Error saving institute:', err);
      setInstError(err.message || 'Failed to persist institute settings to database.');
    } finally {
      setSavingInst(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setSavingProfile(true);

    try {
      await updateUserProfile(user.id, profileForm);
      setProfileSuccess('Personal profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      setProfileError(err.message || 'Failed to update personal profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Admin & Institute Settings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your institute parameters, staff roster, personal profile, and ERP configuration.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('institute')}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'institute'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Institute Profile
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'roster'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Staff & User Roster
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            My Account Profile
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'shortcuts'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            ERP Setup Links
          </button>
        </div>

        {/* Tab 1: Institute Settings */}
        {activeTab === 'institute' && (
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Institute Profile Settings</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Official details registered for {institute?.name || 'your organization'}.</p>
              </div>
            </div>

            {instSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{instSuccess}</span>
              </div>
            )}

            {instError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{instError}</span>
              </div>
            )}

            <form onSubmit={handleSaveInstitute} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Institute Name</label>
                  <input
                    type="text"
                    required
                    value={instForm.name}
                    onChange={(e) => setInstForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Institute Code / Shortname</label>
                  <input
                    type="text"
                    placeholder="e.g. EDU-01"
                    value={instForm.code}
                    onChange={(e) => setInstForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={instForm.phone}
                    onChange={(e) => setInstForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Official Contact Email</label>
                  <input
                    type="email"
                    placeholder="admin@institute.com"
                    value={instForm.email}
                    onChange={(e) => setInstForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Campus Address</label>
                  <input
                    type="text"
                    placeholder="Full campus address"
                    value={instForm.address}
                    onChange={(e) => setInstForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Website URL</label>
                  <input
                    type="text"
                    placeholder="https://www.example.com"
                    value={instForm.website}
                    onChange={(e) => setInstForm((prev) => ({ ...prev, website: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description / Tagline</label>
                <textarea
                  rows={3}
                  placeholder="Institute vision or operational description"
                  value={instForm.description}
                  onChange={(e) => setInstForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingInst}>
                  {savingInst ? 'Saving changes...' : 'Save Institute Settings'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Tab 2: User Roster */}
        {activeTab === 'roster' && (
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div className="rounded-xl bg-purple-50 p-3 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Institute User Roster</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Registered user accounts linked to this institute.</p>
              </div>
            </div>

            {loadingRoster ? (
              <div className="py-12">
                <Loader label="Loading institute users..." />
              </div>
            ) : rosterError ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{rosterError}</span>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Assigned Role</th>
                      <th className="px-4 py-3">Profile ID</th>
                      <th className="px-4 py-3">Date Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {roster.length ? (
                      roster.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{u.full_name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                              {u.role || 'user'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">{u.id}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          No registered user profiles found for this institute.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Tab 3: Personal Profile */}
        {activeTab === 'profile' && (
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Personal Account Profile</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage your authenticated user profile details.</p>
              </div>
            </div>

            {profileSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Protected Read-only Fields */}
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50 space-y-2 text-xs">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Protected System Identity</p>
                <div className="grid gap-2 sm:grid-cols-2 text-slate-500">
                  <div>
                    <span>Account Email: </span>
                    <span className="font-medium text-slate-900 dark:text-white">{user?.email || '—'}</span>
                  </div>
                  <div>
                    <span>Assigned Role: </span>
                    <span className="font-medium capitalize text-slate-900 dark:text-white">{role || '—'}</span>
                  </div>
                  <div>
                    <span>Institute ID: </span>
                    <span className="font-mono text-slate-900 dark:text-white">{instituteId || '—'}</span>
                  </div>
                  <div>
                    <span>User Auth ID: </span>
                    <span className="font-mono text-slate-900 dark:text-white">{user?.id || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? 'Updating profile...' : 'Update Profile'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Tab 4: ERP Configuration Shortcuts */}
        {activeTab === 'shortcuts' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/branches">
              <Card interactive className="h-full">
                <h3 className="font-bold text-slate-900 dark:text-white">Campus Branches</h3>
                <p className="mt-1 text-xs text-slate-500">Configure multi-branch locations and campus details.</p>
              </Card>
            </Link>
            <Link to="/courses">
              <Card interactive className="h-full">
                <h3 className="font-bold text-slate-900 dark:text-white">Courses & Subjects</h3>
                <p className="mt-1 text-xs text-slate-500">Manage academic offerings, course codes, and subjects.</p>
              </Card>
            </Link>
            <Link to="/batches">
              <Card interactive className="h-full">
                <h3 className="font-bold text-slate-900 dark:text-white">Batches</h3>
                <p className="mt-1 text-xs text-slate-500">Manage student batches, schedules, and capacity.</p>
              </Card>
            </Link>
            <Link to="/teachers">
              <Card interactive className="h-full">
                <h3 className="font-bold text-slate-900 dark:text-white">Teachers & Staff</h3>
                <p className="mt-1 text-xs text-slate-500">Faculty roster, subject assignments, and teacher details.</p>
              </Card>
            </Link>
            <Link to="/fees">
              <Card interactive className="h-full">
                <h3 className="font-bold text-slate-900 dark:text-white">Fee Structures</h3>
                <p className="mt-1 text-xs text-slate-500">Configure fee plans, installment schedules, and structures.</p>
              </Card>
            </Link>
            <Link to="/reports">
              <Card interactive className="h-full">
                <h3 className="font-bold text-slate-900 dark:text-white">Reports Hub</h3>
                <p className="mt-1 text-xs text-slate-500">Executive financial statements and student report cards.</p>
              </Card>
            </Link>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

