import AdminJobPanel from '../../components/AdminJobPanel';

export default function AdminPage() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <AdminJobPanel
        jobs={[
          { name: 'Index Search Corpus', status: 'Running' },
          { name: 'Sync ORC Updates', status: 'Idle' },
        ]}
      />
    </main>
  );
}
