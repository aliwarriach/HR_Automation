import { useState } from "react";
import { motion } from "framer-motion";
import Button from "../../components/Button";
import Input from "../../components/Input";
import TagInput from "../../components/TagInput";
import Icon from "../../components/Icon";
import { createEmployee } from "../../services/employeesService";
import { EMPLOYEE_ROLE_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from "../../constants/employee";
import { overlayFade, slideInRight } from "../../constants/motion";

function formatValidationError(data) {
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((err) => {
        const field = err.loc?.[err.loc.length - 1];
        return field ? `${field}: ${err.msg}` : err.msg;
      })
      .join(" ");
  }
  return data?.detail || "Please check the form and try again.";
}

export default function AddEmployeeModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [empRole, setEmpRole] = useState("employee");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [dateJoined, setDateJoined] = useState("");
  const [salary, setSalary] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [address, setAddress] = useState("");
  const [skills, setSkills] = useState([]);

  const [emailError, setEmailError] = useState(null);
  const [generalError, setGeneralError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setEmailError(null);
    setGeneralError(null);
    setSubmitting(true);

    const payload = {
      name,
      email,
      role: empRole,
      employment_type: employmentType,
      phone: phone || null,
      designation: designation || null,
      date_joined: dateJoined || null,
      address: address || null,
      salary: salary === "" ? null : Number(salary),
      experience_years: experienceYears === "" ? null : Number(experienceYears),
      skills: skills.length > 0 ? skills : null,
    };

    const response = await createEmployee(payload);
    setSubmitting(false);

    if (response.ok) {
      setCreated(response.data);
    } else if (response.status === 400) {
      setEmailError(response.data?.detail || "Email already registered");
    } else if (response.status === 422) {
      setGeneralError(formatValidationError(response.data));
    } else {
      setGeneralError(response.data?.detail || "Unable to create employee.");
    }
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
        className="fixed top-0 right-0 h-screen w-full md:w-[640px] bg-surface-container-lowest z-[101] flex flex-col shadow-2xl"
      >
        <header className="px-xl py-lg border-b border-outline-variant flex justify-between items-center bg-surface">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 bg-primary-container rounded flex items-center justify-center text-on-primary">
              <Icon name="person_add" />
            </div>
            <div>
              <h3 className="font-h1 text-h1 text-primary">Add New Employee</h3>
              <p className="text-on-surface-variant font-body-sm text-body-sm">
                Create a new entry in the enterprise directory.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <Icon name="close" />
          </button>
        </header>

        {created ? (
          <div className="flex-1 overflow-y-auto px-xl py-xl flex flex-col items-center text-center gap-lg">
            <Icon name="check_circle" className="text-status-success-text text-[48px]" />
            <div>
              <h4 className="font-h2 text-h2 text-primary mb-xs">Employee Created</h4>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {created.name} has been added and emailed their login credentials.
              </p>
            </div>
            {created.password && (
              <div className="w-full bg-surface-container-low border border-outline-variant rounded p-md flex items-center justify-between gap-md">
                <div className="text-left">
                  <p className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-xs">
                    Generated Password
                  </p>
                  <p className="font-data-mono text-data-mono text-primary tracking-widest">{created.password}</p>
                </div>
                <Button
                  variant="ghost"
                  icon="content_copy"
                  aria-label="Copy password"
                  onClick={() => navigator.clipboard.writeText(created.password)}
                />
              </div>
            )}
            <Button onClick={() => onCreated(created)}>Done</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-xl py-lg">
              <form id="add-employee-form" className="space-y-lg" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  <Input
                    id="name"
                    label="Full Name"
                    placeholder="e.g. Rahul Singh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    id="email"
                    label="Corporate Email"
                    type="email"
                    placeholder="rahul@enterprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={emailError}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  <Input
                    id="role"
                    label="Administrative Role"
                    as="select"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                  >
                    {EMPLOYEE_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Input>
                  <Input
                    id="employment-type"
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  <Input
                    id="phone"
                    label="Phone Number"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Input
                    id="designation"
                    label="Designation"
                    placeholder="e.g. Business Analyst"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                  <Input
                    id="date-joined"
                    label="Date Joined"
                    type="date"
                    value={dateJoined}
                    onChange={(e) => setDateJoined(e.target.value)}
                  />
                  <Input
                    id="salary"
                    label="Salary (Rs)"
                    type="number"
                    min="0"
                    placeholder="e.g. 150000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                  <Input
                    id="experience"
                    label="Experience (Years)"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="4.5"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                  />
                </div>

                <Input
                  id="address"
                  label="Office Address"
                  as="textarea"
                  rows={3}
                  placeholder="Enter physical correspondence address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                <TagInput
                  id="skills"
                  label="Core Skills"
                  value={skills}
                  onChange={setSkills}
                  placeholder="Add skill..."
                />

                {generalError && <p className="font-body-sm text-body-sm text-error">{generalError}</p>}
              </form>
            </div>
            <footer className="px-xl py-lg border-t border-outline-variant bg-surface-container-low flex justify-end gap-md">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" form="add-employee-form" loading={submitting} loadingText="Creating…">
                Create Employee
              </Button>
            </footer>
          </>
        )}
      </motion.section>
    </>
  );
}
