import Card from '../../components/common/Card';

function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
          <p className="text-sm text-slate-500">Configure your institute and user preferences.</p>
        </div>
      </div>
      <Card>
        <p className="text-sm text-slate-600">Settings page coming soon.</p>
      </Card>
    </div>
  );
}

export default Settings;
