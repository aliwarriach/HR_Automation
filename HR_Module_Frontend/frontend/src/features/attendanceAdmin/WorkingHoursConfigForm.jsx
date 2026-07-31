import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import Input from "../../components/Input";
import ConfirmDialog from "../../components/ConfirmDialog";
import { computeHoursPerDay } from "../../utils/attendanceTime";

export default function WorkingHoursConfigForm({ config, onSave }) {
  const [startTime, setStartTime] = useState(config.start_time.slice(0, 5));
  const [endTime, setEndTime] = useState(config.end_time.slice(0, 5));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const computedHours = computeHoursPerDay(startTime, endTime);
  const invalid = computedHours === null;
  const dirty = startTime !== config.start_time.slice(0, 5) || endTime !== config.end_time.slice(0, 5);

  const handleDiscard = () => {
    setStartTime(config.start_time.slice(0, 5));
    setEndTime(config.end_time.slice(0, 5));
    setError(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (invalid) return;
    setError(null);
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    const response = await onSave({ start_time: startTime, end_time: endTime });
    setSaving(false);

    if (response.ok) {
      setConfirmOpen(false);
    } else {
      setError(response.data?.detail || "Unable to update working hours.");
      setConfirmOpen(false);
    }
  };

  return (
    <section className="bg-surface border border-outline-variant rounded-xl p-xl">
      <div className="flex items-center gap-md mb-xl">
        <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container shrink-0">
          <Icon name="edit_square" />
        </div>
        <div>
          <h3 className="font-h2 text-h2 text-on-surface">Update Working Hours</h3>
          <p className="text-body-sm text-on-surface-variant">Set new core hours for the organization.</p>
        </div>
      </div>

      <form className="space-y-xl" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
          <Input
            id="config-start-time"
            label="Operational Start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            id="config-end-time"
            label="Operational End"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="bg-primary-container/5 rounded-xl border border-dashed border-outline-variant p-lg flex flex-col md:flex-row items-center justify-between gap-lg">
          <div className="flex items-center gap-md">
            <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-outline-variant shadow-sm shrink-0">
              <Icon name="analytics" className="text-primary" />
            </div>
            <div>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase text-[10px]">
                Calculation Preview
              </p>
              {invalid ? (
                <p className="text-body-md text-error font-medium">End time must be after start time.</p>
              ) : (
                <p className="text-body-md text-on-surface font-medium">
                  Current selection computes to{" "}
                  <span className="font-bold text-primary">{computedHours.toFixed(1)}</span> hours per day.
                </p>
              )}
            </div>
          </div>
          {invalid && (
            <div className="flex items-center gap-sm text-error bg-error-container/20 px-md py-sm border border-error/20 rounded">
              <Icon name="error" className="text-[18px]" />
              <span className="font-label-mono text-label-mono">INVALID TIME RANGE</span>
            </div>
          )}
        </div>

        {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}

        <div className="flex justify-end gap-md pt-lg border-t border-outline-variant">
          <Button type="button" variant="secondary" disabled={!dirty} onClick={handleDiscard}>
            Discard Changes
          </Button>
          <Button type="submit" icon="save" disabled={invalid || !dirty}>
            Save Configuration
          </Button>
        </div>
      </form>

      <AnimatePresence>
        {confirmOpen && (
          <ConfirmDialog
            title="Update organization-wide working hours?"
            icon="schedule"
            confirmLabel="Save Configuration"
            loading={saving}
            onConfirm={handleConfirmSave}
            onCancel={() => setConfirmOpen(false)}
            message={
              <>
                <p className="mb-md">
                  This sets a single global schedule of <strong className="text-on-surface">{startTime}</strong> to{" "}
                  <strong className="text-on-surface">{endTime}</strong> ({computedHours?.toFixed(1)}h/day) for every
                  employee.
                </p>
                <p>All future check-outs and monthly summaries will use this immediately.</p>
              </>
            }
          />
        )}
      </AnimatePresence>
    </section>
  );
}
