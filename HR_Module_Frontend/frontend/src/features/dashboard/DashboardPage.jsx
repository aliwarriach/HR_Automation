import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../../components/Layout";
import StatCard from "../../components/StatCard";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import { useJobPostings } from "../../hooks/useJobPostings";
import { useResumes } from "../../hooks/useResumes";
import { useAuthStore } from "../../store/authStore";
import { ROUTES, resumeDetailPath } from "../../constants/routes";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import { formatDateTime } from "../../utils/formatDate";
import { fadeInUp, staggerContainer, listItem } from "../../constants/motion";

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const isRecent = (iso) => Date.now() - new Date(iso).getTime() < RECENT_WINDOW_MS;

const TH = "py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider text-center";
const TD = "py-md px-md text-center align-middle";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { jobPostings, loading: jobsLoading, error: jobsError } = useJobPostings();
  const { resumes, loading: resumesLoading, error: resumesError } = useResumes();
  const permissions = useAuthStore((s) => s.permissions);
  const canCreateJobPostings = hasPermission(permissions, MODULES.JOB_POSTINGS, ACTIONS.CREATE);
  const canReadJobPostings = hasPermission(permissions, MODULES.JOB_POSTINGS, ACTIONS.READ);
  const canReadResumes = hasPermission(permissions, MODULES.RESUMES, ACTIONS.READ);

  const loading = jobsLoading || resumesLoading;
  const error = jobsError || resumesError;
  const recentResumes = resumes.slice(0, 5);

  const healthStatus = loading ? "Checking…" : error ? "Offline" : "Online";
  const healthDotClass = loading ? "bg-outline animate-pulse" : error ? "bg-error" : "bg-green-500";

  return (
    <Layout title="Dashboard Overview">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-xl gap-md">
        <div>
          <h2 className="font-h1 text-h1 text-on-surface">Welcome back</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Live overview of your hiring pipeline.
          </p>
        </div>
        {canCreateJobPostings ? (
          <Button icon="add" onClick={() => navigate(ROUTES.JOB_POSTINGS)}>
            New Job Posting
          </Button>
        ) : (
          canReadJobPostings && (
            <Button variant="secondary" icon="work" onClick={() => navigate(ROUTES.JOB_POSTINGS)}>
              View Job Postings
            </Button>
          )
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-lg mb-xl">
        <StatCard
          index={0}
          icon="work"
          label="Open Job Postings"
          value={jobsLoading ? "—" : jobPostings.length}
          sublabel="Live from API"
          status={jobsError ? "negative" : "positive"}
        />
        <StatCard
          index={1}
          icon="description"
          label="Candidate Resumes"
          value={resumesLoading ? "—" : resumes.length}
          sublabel="From Gmail"
          status={resumesError ? "negative" : "positive"}
        />
        <StatCard
          index={2}
          icon="how_to_reg"
          label="Pending Decisions"
          value="—"
          sublabel="Module not available"
          status="neutral"
        />
        <StatCard
          index={3}
          icon="groups"
          label="Total Employees"
          value="—"
          sublabel="Module not available"
          status="neutral"
        />
        <StatCard
          index={4}
          icon="event_available"
          label="Attendance Rate"
          value="—"
          sublabel="Module not available"
          status="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {canReadResumes && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ ...fadeInUp.visible.transition, delay: 0.15 }}
          className="lg:col-span-2 bg-surface rounded-xl hairline-border shadow-card flex flex-col overflow-hidden"
        >
          <div className="p-md border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-h2 text-h2 text-on-surface">Recent Candidates</h3>
            <button
              onClick={() => navigate(ROUTES.RESUMES)}
              className="font-body-sm text-body-sm font-semibold text-primary hover:underline flex items-center gap-xs"
            >
              View all
              <Icon name="arrow_forward" className="text-[16px]" />
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col className="w-[30%]" />
                <col className="hidden md:table-column md:w-[45%]" />
                <col className="hidden sm:table-column sm:w-[12%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className={`${TH} text-left`}>Candidate</th>
                  <th className={`${TH} hidden md:table-cell`}>Subject</th>
                  <th className={`${TH} hidden sm:table-cell`}>Received</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="font-body-sm text-body-sm text-on-surface"
              >
                {resumesLoading && (
                  <tr>
                    <td className="py-lg px-md text-center text-on-surface-variant" colSpan={4}>
                      Loading candidates…
                    </td>
                  </tr>
                )}

                {!resumesLoading && resumesError && (
                  <tr>
                    <td className="py-lg px-md text-center text-error" colSpan={4}>
                      {resumesError}
                    </td>
                  </tr>
                )}

                {!resumesLoading && !resumesError && recentResumes.length === 0 && (
                  <tr>
                    <td className="py-lg px-md text-center text-on-surface-variant" colSpan={4}>
                      No candidate resumes yet.
                    </td>
                  </tr>
                )}

                {!resumesLoading &&
                  !resumesError &&
                  recentResumes.map((resume) => (
                    <motion.tr
                      key={resume.id}
                      variants={listItem}
                      onClick={() => navigate(resumeDetailPath(resume.id))}
                      className="border-b border-outline-variant last:border-b-0 even:bg-surface-container-low/40 hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <td className={`${TD} text-left`}>
                        <span className="block truncate font-semibold text-primary hover:underline">
                          {resume.sender_email}
                        </span>
                      </td>
                      <td className={`${TD} hidden md:table-cell text-on-surface-variant`}>
                        <span className="block truncate">{resume.subject}</span>
                      </td>
                      <td
                        className={`${TD} font-data-mono text-data-mono hidden sm:table-cell text-on-surface-variant truncate`}
                      >
                        {formatDateTime(resume.received_at)}
                      </td>
                      <td className={TD}>
                        {isRecent(resume.received_at) ? (
                          <Badge variant="success">New</Badge>
                        ) : (
                          <Badge variant="neutral">Received</Badge>
                        )}
                      </td>
                    </motion.tr>
                  ))}
              </motion.tbody>
            </table>
          </div>
        </motion.div>
        )}

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ ...fadeInUp.visible.transition, delay: 0.2 }}
          className={`bg-surface rounded-xl hairline-border shadow-card flex flex-col p-md gap-md ${
            canReadResumes ? "" : "lg:col-span-3"
          }`}
        >
          <h3 className="font-h2 text-h2 text-on-surface border-b border-outline-variant pb-xs">Quick Actions</h3>

          {canCreateJobPostings ? (
            <Button icon="add" onClick={() => navigate(ROUTES.JOB_POSTINGS)}>
              New Job Posting
            </Button>
          ) : (
            canReadJobPostings && (
              <Button variant="secondary" icon="work" onClick={() => navigate(ROUTES.JOB_POSTINGS)}>
                View Job Postings
              </Button>
            )
          )}

          {canReadResumes && (
            <Button variant="secondary" icon="description" onClick={() => navigate(ROUTES.RESUMES)}>
              Review Resumes
            </Button>
          )}

          <Button variant="secondary" icon="upload_file" disabled title="Coming soon">
            Import Resumes
          </Button>

          <div className="mt-auto pt-md border-t border-outline-variant">
            <h4 className="font-body-sm text-body-sm font-bold uppercase text-on-surface-variant tracking-wider mb-sm">
              System Health
            </h4>
            <div className="flex items-center justify-between bg-surface-container-low p-sm rounded-lg hairline-border">
              <div className="flex items-center gap-xs">
                <div className={`w-2 h-2 rounded-full ${healthDotClass}`}></div>
                <span className="font-data-mono text-data-mono">API Services</span>
              </div>
              <span className="font-label-mono text-label-mono text-outline uppercase">{healthStatus}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
