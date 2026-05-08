// client/src/pages/Dashboard.js
import { useCallback, useEffect, useState } from "react";
import { listLeads } from "../services/api";
import StatsCards from "../components/StatsCards";
import LeadsTable from "../components/LeadsTable";
import LeadDetail from "../components/LeadDetail";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchLeads = useCallback(async () => {
    try {
      setError(null);
      const data = await listLeads({ search, status });
      setLeads(data.leads);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  // Re-fetch when filters change or refreshKey bumps
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads, refreshKey]);

  // Poll every 10 seconds
  useEffect(() => {
    const id = setInterval(() => setRefreshKey((k) => k + 1), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Mctaba CRM</h1>
          <p className="text-sm text-gray-500">
            WhatsApp lead capture -- Nairobi
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <StatsCards refreshKey={refreshKey} />

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="text-sm text-red-600">Error: {error}</div>}
        {loading ? (
          <div className="text-gray-500 text-sm">Loading leads...</div>
        ) : (
          <LeadsTable
            leads={leads}
            onSelect={(lead) => setSelectedId(lead.id)}
          />
        )}
      </main>

      <LeadDetail
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}