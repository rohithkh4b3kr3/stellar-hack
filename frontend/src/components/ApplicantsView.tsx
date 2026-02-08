import { useState } from "react";
import type { Project } from "../api";
import { EmptyState } from "./EmptyState";
import { ApplicantItem } from "./ApplicantItem";

export function ApplicantsView({
  projects,
  wallet,
  loadProjects,
}: {
  projects: Project[];
  wallet: string;
  setError: (s: string) => void;
  loadProjects: () => void;
}) {
  const [error, setError] = useState("");
  const myProjects = projects.filter((p) => p.businessAddress === wallet && p.applicants.length > 0);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {myProjects.length === 0 ? (
        <EmptyState
          title="No applicants yet"
          description="Your posted projects will appear here when freelancers apply"
        />
      ) : (
        <div className="space-y-6">
          {myProjects.map((p) => (
            <div key={p.id} className="bg-white border border-neutral-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-neutral-900">{p.title}</h3>
                <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm font-semibold">
                  {p.applicants.length} applicant{p.applicants.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {p.applicants.map((addr) => (
                  <ApplicantItem
                    key={addr}
                    address={addr}
                    projectId={p.id}
                    isSelected={p.freelancerAddress === addr}
                    setError={setError}
                    loadProjects={loadProjects}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
