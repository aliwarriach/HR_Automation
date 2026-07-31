import { useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import { useMyAnnouncementDetail } from "../../hooks/useMyAnnouncementDetail";
import { ROUTES } from "../../constants/routes";
import { formatAnnouncementDateTime } from "../../utils/announcementTime";

export default function MyAnnouncementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { announcement, loading, error, notFound } = useMyAnnouncementDetail(id);

  const goBackToList = () => navigate(ROUTES.MY_ANNOUNCEMENTS);

  return (
    <Layout title="Announcement Detail">
      <div className="max-w-[720px] mx-auto flex flex-col gap-lg">
        <button
          type="button"
          onClick={goBackToList}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-semibold self-start"
        >
          <Icon name="arrow_back" className="text-[20px]" />
          <span>Back to Announcements</span>
        </button>

        {loading && <p className="text-on-surface-variant">Loading announcement…</p>}
        {!loading && error && <p className="text-error">{error}</p>}

        {!loading && !error && notFound && (
          <div className="border border-outline-variant rounded-lg bg-surface p-xl flex flex-col items-center text-center gap-md">
            <Icon name="campaign" className="text-on-surface-variant text-[40px]" />
            <p className="text-on-surface-variant font-body-md">Announcement not found.</p>
            <Button variant="secondary" onClick={goBackToList}>
              Back to Announcements
            </Button>
          </div>
        )}

        {!loading && !error && !notFound && announcement && (
          <div className="bg-surface border border-outline-variant rounded-lg p-xl flex flex-col gap-lg">
            <div>
              <h1 className="font-h1 text-h1 text-on-surface mb-xs">{announcement.title}</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Posted by {announcement.created_by_name} · Published{" "}
                {formatAnnouncementDateTime(announcement.publish_at)}
                {announcement.expires_at && <> · Expires {formatAnnouncementDateTime(announcement.expires_at)}</>}
              </p>
            </div>

            <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
              {announcement.content}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
