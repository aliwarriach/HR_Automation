import { useState } from "react";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Icon from "../../components/Icon";
import { updateEmployee } from "../../services/employeesService";
import { EMPLOYEE_ROLE_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from "../../constants/employee";

export default function EditEmployeeModal({ employee, onClose, onSaved }) {
  const [empRole, setEmpRole] = useState(employee.role);
  const [employmentType, setEmploymentType] = useState(employee.employment_type);
  const [designation, setDesignation] = useState(employee.designation ?? "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const response = await updateEmployee(employee.id, {
      role: empRole,
      employment_type: employmentType,
      designation,
    });

    setSaving(false);

    if (response.ok) {
      onSaved();
    } else {
      setError(response.data?.detail || "Unable to update employee.");
    }
  };

  return (
    <Modal title="Edit Employee Constraints" onClose={onClose}>
      <form className="flex flex-col gap-lg" onSubmit={handleSubmit}>
        <Input id="edit-role" label="Role" as="select" value={empRole} onChange={(e) => setEmpRole(e.target.value)}>
          {EMPLOYEE_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Input>

        <Input
          id="edit-employment-type"
          label="Employment Type"
          as="select"
          value={employmentType}
          onChange={(e) => setEmploymentType(e.target.value)}
        >
          {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Input>

        <Input
          id="edit-designation"
          label="Designation"
          placeholder="e.g. Senior Architect"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
        />

        <div className="bg-surface-container-low p-sm rounded flex gap-sm items-start border-l-2 border-primary">
          <Icon name="info" className="text-primary text-[16px] mt-0.5" />
          <p className="text-[12px] leading-tight text-on-surface-variant">
            Changing these constraints may trigger an automated payroll reconciliation workflow.
          </p>
        </div>

        {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}

        <div className="flex justify-end gap-sm">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} loadingText="Saving…">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
