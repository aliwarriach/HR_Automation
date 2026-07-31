import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Layout from "../../components/Layout";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import FilterAnnouncementsPanel from "./FilterAnnouncementsPanel";
import AudienceChips from "./AudienceChips";
import { useAnnouncementList } from "../../hooks/useAnnouncementList";
import { useAuthStore } from "../../store/authStore";
import { ROUTES, announcementDetailPath } from "../../constants/routes";
import { ANNOUNCEMENT_STATUS_LABEL, ANNOUNCEMENT_STATUS_VARIANT } from "../../constants/announcements";
import { MODULES, ACTIONS } from "../../constants/permissions";
import { hasPermission } from "../../utils/permissions";
import { formatAnnouncementDate } from "../../utils/announcementTime";
import { staggerContainer, listItem } from "../../constants/motion";

export default function AnnouncementsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const permissions = useAuthStore((s) => s.permissions);
  const canCreate = hasPermission(permissions, MODULES.ANNOUNCEMENTS, ACTIONS.CREATE);

  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const { announcements, loading, error } = useAnnouncementList(status, search);

  const activeFilterCount = (status ? 1 : 0) + (search ? 1 : 0);

  const applyFilters = ({ status: nextStatus, search: nextSearch }) => {
    const next = new URLSearchParams(searchParams);
    if (nextStatus) next.set("status", nextStatus);
    else next.delete("status");
    if (nextSearch) next.set("search", nextSearch);
    else next.delete("search");
    setSearchParams(next);
    setFilterOpen(false);
  };

  const removeFilter = (key) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next);
  };

  const goToAnnouncement = (id) => {
    navigate({ pathname: announcementDetailPath(id), search: searchParams.toString() });
  };

  return (
    <Layout title="Announcements">
      <div className="flex flex-col gap-lg">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-md">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">Announcements</h1>
            <p className="text-on-surface-variant font-body-md">Organization-wide communications and notices.</p>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <Button variant="secondary" icon="filter_list" onClick={() => setFilterOpen(true)}>
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            {canCreate && (
              <Button icon="campaign" onClick={() => navigate(ROUTES.ANNOUNCEMENT_NEW)}>
                New Announcement
              </Button>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center flex-wrap gap-sm">
            <span className="font-label-mono text-label-mono text-on-surface-variant uppercase mr-2">
              Active Filters:
            </span>
            {status && (
              <FilterChip label={`STATUS: ${ANNOUNCEMENT_STATUS_LABEL[status].toUpperCase()}`} onRemove={() => removeFilter("status")} />
            )}
            {search && <FilterChip label={`SEARCH: ${search.toUpperCase()}`} onRemove={() => removeFilter("search")} />}
            <button
              type="button"
              className="text-body-sm text-primary font-semibold hover:underline ml-2"
              onClick={() => applyFilters({ status: "", search: "" })}
            >
              Clear all
            </button>
          </div>
        )}

        {!loading && error && <p className="text-error">{error}</p>}

        {!loading && !error && announcements.length === 0 && (
          <div className="border border-outline-variant rounded-lg bg-surface p-xl flex flex-col items-center text-center gap-md">
            <Icon name="campaign" className="text-on-surface-variant text-[40px]" />
            <div>
              <h3 className="font-h2 text-h2 text-on-surface">No announcements yet</h3>
              <p className="text-on-surface-variant font-body-md">Create your first announcement to get started.</p>
            </div>
            {canCreate && (
              <Button icon="campaign" onClick={() => navigate(ROUTES.ANNOUNCEMENT_NEW)}>
                New Announcement
              </Button>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-sm">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="bg-surface border border-outline-variant rounded-lg h-[88px] animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !error && announcements.length > 0 && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-sm">
            {announcements.map((announcement) => (
              <motion.div
                key={announcement.id}
                variants={listItem}
                onClick={() => goToAnnouncement(announcement.id)}
                className="border border-outline-variant rounded-lg bg-surface p-lg flex flex-col md:flex-row md:items-center gap-md cursor-pointer hover:bg-surface-container-low transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm mb-xs flex-wrap">
                    <h3 className="font-h2 text-h2 text-on-surface truncate">{announcement.title}</h3>
                    <Badge variant={ANNOUNCEMENT_STATUS_VARIANT[announcement.status]}>
                      {ANNOUNCEMENT_STATUS_LABEL[announcement.status]}
                    </Badge>
                  </div>
                  <AudienceChips roles={announcement.target_roles} />
                </div>
                <div className="flex md:flex-col items-start md:items-end gap-sm md:gap-xs shrink-0 text-on-surface-variant font-body-sm">
                  <span className="flex items-center gap-1">
                    <Icon name="event_available" className="text-[16px]" /> {formatAnnouncementDate(announcement.publish_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="event_busy" className="text-[16px]" />{" "}
                    {announcement.expires_at ? formatAnnouncementDate(announcement.expires_at) : "No expiry"}
                  </span>
                </div>
                <Icon name="chevron_right" className="text-on-surface-variant hidden md:block" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {filterOpen && (
          <FilterAnnouncementsPanel
            initialStatus={status}
            initialSearch={search}
            onApply={applyFilters}
            onClose={() => setFilterOpen(false)}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <div className="flex items-center gap-xs bg-secondary-container px-3 py-1 rounded-full border border-outline-variant">
      <span className="font-label-mono text-label-mono text-on-secondary-container">{label}</span>
      <button type="button" onClick={onRemove} className="text-on-secondary-container hover:text-primary">
        <Icon name="close" className="text-[14px]" />
      </button>
    </div>
  );
}
