import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "../../components/Layout";
import Icon from "../../components/Icon";
import { useMyAnnouncements } from "../../hooks/useMyAnnouncements";
import { myAnnouncementDetailPath } from "../../constants/routes";
import { formatAnnouncementDate } from "../../utils/announcementTime";
import { staggerContainer, listItem } from "../../constants/motion";

export default function MyAnnouncementsListPage() {
  const navigate = useNavigate();
  const { announcements, loading, error } = useMyAnnouncements();

  return (
    <Layout title="My Announcements">
      <div className="flex flex-col gap-lg">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface">My Announcements</h1>
          <p className="text-on-surface-variant font-body-md">Notices and updates addressed to you.</p>
        </div>

        {!loading && error && <p className="text-error">{error}</p>}

        {loading && (
          <div className="flex flex-col gap-sm">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="bg-surface border border-outline-variant rounded-lg h-[96px] animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !error && announcements.length === 0 && (
          <div className="border border-outline-variant rounded-lg bg-surface p-xl flex flex-col items-center text-center gap-md">
            <Icon name="campaign" className="text-on-surface-variant text-[40px]" />
            <p className="text-on-surface-variant font-body-md">No announcements right now.</p>
          </div>
        )}

        {!loading && !error && announcements.length > 0 && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-sm">
            {announcements.map((announcement) => (
              <motion.div
                key={announcement.id}
                variants={listItem}
                onClick={() => navigate(myAnnouncementDetailPath(announcement.id))}
                className="border border-outline-variant rounded-lg bg-surface p-lg flex flex-col gap-sm cursor-pointer hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-start justify-between gap-md">
                  <h3 className="font-h2 text-h2 text-on-surface">{announcement.title}</h3>
                  <Icon name="chevron_right" className="text-on-surface-variant shrink-0" />
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">{announcement.content_preview}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Posted by {announcement.created_by_name} · {formatAnnouncementDate(announcement.publish_at)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
