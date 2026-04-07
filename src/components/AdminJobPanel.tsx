interface AdminJobPanelProps {
  jobs: Array<{ name: string; status: 'Idle' | 'Running' | 'Failed' | 'Complete' }>;
}

export default function AdminJobPanel({ jobs }: AdminJobPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-900">Admin Jobs</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {jobs.map((job) => (
          <li key={job.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span>{job.name}</span>
            <span className="font-semibold text-slate-600">{job.status}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
