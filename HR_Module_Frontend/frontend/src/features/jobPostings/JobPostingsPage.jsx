import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Layout from "../../components/Layout";
import Button from "../../components/Button";
import CreateJobPostingModal from "./CreateJobPostingModal";
import { useJobPostings } from "../../hooks/useJobPostings";
import { useAuthStore } from "../../store/authStore";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import { formatDate } from "../../utils/formatDate";
import { staggerContainer, listItem } from "../../constants/motion";

export default function JobPostingsPage() {
  const { jobPostings, loading, error, refetch } = useJobPostings();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, MODULES.JOB_POSTINGS, ACTIONS.CREATE);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreated = () => {
    setIsModalOpen(false);
    refetch();
  };

  return (
    <Layout title="Job Postings">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-xl gap-md">
        <div>
          <h2 className="font-h1 text-h1 text-primary">Job Postings</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Manage and track all active job requisitions.
              </p>
            </div>
            {canCreate && (
              <Button icon="add" onClick={() => setIsModalOpen(true)}>
                Create Job Posting
              </Button>
            )}
          </div>

          <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="hidden sm:table-column sm:w-[55%]" />
                  <col className="hidden md:table-column md:w-[15%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                      Role
                    </th>
                    <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider hidden sm:table-cell">
                      Requirements
                    </th>
                    <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                      Created
                    </th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="font-body-sm text-body-sm text-on-surface"
                >
                  {loading && (
                    <tr>
                      <td className="py-lg px-md text-on-surface-variant" colSpan={3}>
                        Loading job postings…
                      </td>
                    </tr>
                  )}

                  {!loading && error && (
                    <tr>
                      <td className="py-lg px-md text-error" colSpan={3}>
                        {error}
                      </td>
                    </tr>
                  )}

                  {!loading && !error && jobPostings.length === 0 && (
                    <tr>
                      <td className="py-lg px-md text-on-surface-variant" colSpan={3}>
                        No job postings yet.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    jobPostings.map((job) => (
                      <motion.tr
                        key={job.id}
                        variants={listItem}
                        className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low transition-colors"
                      >
                        <td className="py-md px-md truncate">
                          <div className="font-bold text-primary truncate">{job.title}</div>
                          <div className="text-on-surface-variant sm:hidden mt-1 truncate">{job.requirements}</div>
                        </td>
                        <td className="py-md px-md hidden sm:table-cell text-on-surface-variant truncate">
                          {job.requirements}
                        </td>
                        <td className="py-md px-md font-data-mono text-data-mono hidden md:table-cell text-on-surface-variant truncate">
                          {formatDate(job.created_at)}
                        </td>
                      </motion.tr>
                    ))}
                </motion.tbody>
              </table>
            </div>

            <div className="border-t border-outline-variant bg-surface-container-low px-md py-sm">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {loading ? "Loading…" : `Showing ${jobPostings.length} of ${jobPostings.length} items`}
              </span>
            </div>
          </div>

      <AnimatePresence>
        {isModalOpen && (
          <CreateJobPostingModal onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
        )}
      </AnimatePresence>
    </Layout>
  );
}
