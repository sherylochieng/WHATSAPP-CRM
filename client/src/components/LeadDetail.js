// client/src/components/LeadDetail.js
import { useEffect, useState } from "react";
import { getLead, updateLead } from "../services/api";

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];

export default function LeadDetail({ leadId, onClose, onUpdated }) {
  const [lead, setLead] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    setLead(null);
    setError(null);
    getLead(leadId)
      .then((data) => !cancelled && setLead(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  // Close on Escape key
  useEffect(() => {
    if (!leadId) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leadId, onClose]);

  async function changeStatus(newStatus) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateLead(leadId, { status: newStatus });
      setLead((prev) => ({ ...prev, ...updated }));
      onUpdated?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!leadId) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <aside className="w-full max-w-lg bg-white shadow-xl p-6 overflow-y-auto">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {lead?.name || "Loading..."}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            Close
          </button>
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        {lead && (
          <>
            <div className="mt-4 space-y-1 text-sm">
              <div>
                <span className="text-gray-500">Phone:</span> +{lead.wa_phone}
              </div>
              <div>
                <span className="text-gray-500">Email:</span>{" "}
                {lead.email || "-"}
              </div>
              <div>
                <span className="text-gray-500">Inquiry:</span>{" "}
                {lead.inquiry_type || "-"}
              </div>
              <div>
                <span className="text-gray-500">Created:</span>{" "}
                {lead.created_at}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-1">Status</div>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={saving || lead.status === s}
                    onClick={() => changeStatus(s)}
                    className={
                      "px-3 py-1 rounded-full text-xs font-medium border " +
                      (lead.status === s
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <a
                href={`https://wa.me/${lead.wa_phone}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Reply via WhatsApp
              </a>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Conversation
              </h3>
              <div className="space-y-2">
                {lead.messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      "rounded-lg px-3 py-2 text-sm max-w-[85%] " +
                      (m.direction === "inbound"
                        ? "bg-gray-100 text-gray-900"
                        : "bg-blue-600 text-white ml-auto")
                    }
                  >
                    <div>{m.body}</div>
                    <div
                      className={
                        "text-[10px] mt-1 " +
                        (m.direction === "inbound"
                          ? "text-gray-500"
                          : "text-blue-100")
                      }
                    >
                      {m.created_at}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}