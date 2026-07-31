import ConfirmDialog from "../../components/ConfirmDialog";

export default function MarkLeaveDialog({ busy, error, onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      title="Mark today as leave?"
      icon="event_busy"
      confirmLabel="Confirm Leave"
      loading={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
      message={
        <>
          <p>
            You won&apos;t be able to check in today after this. This will be recorded as an on-leave day for the
            rest of today.
          </p>
          {error && <p className="text-error mt-md">{error}</p>}
        </>
      }
    />
  );
}
