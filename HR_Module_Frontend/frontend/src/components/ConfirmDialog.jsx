import Modal from "./Modal";
import Button from "./Button";
import Icon from "./Icon";

export default function ConfirmDialog({
  title,
  message,
  icon,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className={icon ? "flex items-start gap-md mb-lg" : undefined}>
        {icon && (
          <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0">
            <Icon name={icon} className="text-error text-[20px]" />
          </div>
        )}
        <div className={`font-body-md text-body-md text-on-surface-variant ${icon ? "" : "mb-lg"}`}>{message}</div>
      </div>
      <div className="flex justify-end gap-sm">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant={confirmVariant} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
