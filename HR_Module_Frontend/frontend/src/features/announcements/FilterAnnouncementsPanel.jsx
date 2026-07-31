import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "../../components/Icon";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { overlayFade, slideInRight } from "../../constants/motion";
import { ANNOUNCEMENT_STATUS_OPTIONS } from "../../constants/announcements";

export default function FilterAnnouncementsPanel({ initialStatus, initialSearch, onApply, onClose }) {
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);

  const handleReset = () => {
    setStatus("");
    setSearch("");
  };

  const handleApply = () => {
    onApply({ status, search });
  };

  return (
    <>
      <motion.div
        variants={overlayFade}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-inverse-surface/40 z-[100]"
        onClick={onClose}
      />
      <motion.section
        variants={slideInRight}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed top-0 right-0 h-screen w-full md:w-[400px] bg-surface-container-lowest z-[101] flex flex-col shadow-2xl"
      >
        <header className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-surface">
          <div className="flex items-center gap-sm">
            <Icon name="filter_alt" className="text-primary" />
            <h3 className="font-h2 text-h2 text-primary">Filter Announcements</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-lg space-y-xl">
          <section className="space-y-md">
            <label
              className="block font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest"
              htmlFor="filter-announcement-status"
            >
              Status
            </label>
            <Input id="filter-announcement-status" as="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Show All</option>
              {ANNOUNCEMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Input>
          </section>

          <section className="space-y-md">
            <label
              className="block font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest"
              htmlFor="filter-announcement-search"
            >
              Search
            </label>
            <Input
              id="filter-announcement-search"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </section>
        </div>

        <div className="px-lg py-lg border-t border-outline-variant flex gap-md bg-surface">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleReset}>
            Reset
          </Button>
          <Button type="button" className="flex-[2]" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </motion.section>
    </>
  );
}
