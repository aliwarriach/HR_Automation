import { useState } from "react";
import Modal from "../../components/Modal";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { createJobPosting } from "../../services/jobPostingsService";

export default function CreateJobPostingModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [requirements, setRequirements] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await createJobPosting(title, requirements);

    setLoading(false);

    if (response.ok) {
      onCreated(response.data);
    } else {
      setError(response.data?.detail || "Unable to create job posting.");
    }
  };

  return (
    <Modal title="Create Job Posting" onClose={onClose}>
      <form className="flex flex-col gap-lg" onSubmit={handleSubmit}>
        <Input
          id="title"
          label="Role Title"
          placeholder="e.g. Senior Product Designer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Input
          id="requirements"
          label="Requirements"
          as="textarea"
          rows={4}
          placeholder="Describe the requirements for this role"
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          required
        />

        {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}

        <div className="flex justify-end gap-sm">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
