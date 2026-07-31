import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../../components/Layout";
import Button from "../../components/Button";
import Input from "../../components/Input";
import AtsBadge from "../../components/AtsBadge";
import { useResumes } from "../../hooks/useResumes";
import { resumeDetailPath } from "../../constants/routes";
import { formatDateTime } from "../../utils/formatDate";
import { formatTitleCase } from "../../utils/formatText";
import { stripFileNameId } from "../../utils/formatFileName";
import { staggerContainer, listItem } from "../../constants/motion";

export default function ResumesPage() {
  const { resumes, loading, refreshing, error, refresh } = useResumes();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredResumes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return resumes;
    return resumes.filter((resume) => resume.sender_email.toLowerCase().includes(query));
  }, [resumes, search]);

  return (
    <Layout title="Resumes">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-xl gap-md">
        <div>
          <h2 className="font-h1 text-h1 text-primary">Resumes</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Candidate resumes from Gmail.
              </p>
            </div>
            <div className="flex items-center gap-sm w-full sm:w-auto">
              <div className="w-full sm:w-64">
                <Input
                  placeholder="Search by sender email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="secondary" icon="refresh" loading={refreshing} onClick={refresh}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="border border-outline-variant rounded-lg bg-surface shadow-card dark:shadow-none overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="hidden sm:table-column sm:w-[32%]" />
                  <col className="hidden md:table-column md:w-[12%]" />
                  <col className="hidden md:table-column md:w-[10%]" />
                  <col className="hidden md:table-column md:w-[8%]" />
                  <col className="hidden lg:table-column lg:w-[12%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                      Sender
                    </th>
                    <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider hidden sm:table-cell">
                      Subject
                    </th>
                    <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                      Role
                    </th>
                    <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                      ATS Score
                    </th>
                    <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                      Received
                    </th>
                    <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">
                      File
                    </th>
                    <th className="py-sm px-md font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider" />
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
                      <td className="py-lg px-md text-on-surface-variant" colSpan={7}>
                        Loading resumes…
                      </td>
                    </tr>
                  )}

                  {!loading && error && (
                    <tr>
                      <td className="py-lg px-md text-error" colSpan={7}>
                        {error}
                      </td>
                    </tr>
                  )}

                  {!loading && !error && filteredResumes.length === 0 && (
                    <tr>
                      <td className="py-lg px-md text-on-surface-variant" colSpan={7}>
                        No resumes found.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    filteredResumes.map((resume) => (
                      <motion.tr
                        key={resume.id}
                        variants={listItem}
                        onClick={() => navigate(resumeDetailPath(resume.id))}
                        className="border-b border-outline-variant last:border-b-0 hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        <td className="py-md px-md truncate">
                          <span className="block truncate font-bold text-primary hover:underline">
                            {resume.sender_email}
                          </span>
                          <div className="text-on-surface-variant sm:hidden mt-1 truncate">{resume.subject}</div>
                        </td>
                        <td className="py-md px-md hidden sm:table-cell text-on-surface-variant truncate">
                          {resume.subject}
                        </td>
                        <td className="py-md px-md hidden md:table-cell text-on-surface-variant truncate">
                          {resume.role ? formatTitleCase(resume.role) : "—"}
                        </td>
                        <td className="py-md px-md hidden md:table-cell">
                          <AtsBadge atsStatus={resume.ats_status} atsScore={resume.ats_score} />
                        </td>
                        <td className="py-md px-md font-data-mono text-data-mono hidden md:table-cell text-on-surface-variant truncate">
                          {formatDateTime(resume.received_at)}
                        </td>
                        <td className="py-md px-md font-data-mono text-data-mono hidden lg:table-cell text-on-surface-variant truncate">
                          {stripFileNameId(resume.file_name)}
                        </td>
                        <td className="py-md px-md text-right">
                          <Button
                            variant="ghost"
                            icon="visibility"
                            aria-label="View resume"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(resumeDetailPath(resume.id));
                            }}
                          />
                        </td>
                      </motion.tr>
                    ))}
                </motion.tbody>
              </table>
            </div>

            <div className="border-t border-outline-variant bg-surface-container-low px-md py-sm">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {loading ? "Loading…" : `Showing ${filteredResumes.length} of ${resumes.length} items`}
              </span>
            </div>
          </div>
    </Layout>
  );
}
