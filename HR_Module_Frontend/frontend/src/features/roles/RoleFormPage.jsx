import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import Button from "../../components/Button";
import Input from "../../components/Input";
import PermissionsBuilder from "./PermissionsBuilder";
import { useRoleDetail } from "../../hooks/useRoleDetail";
import { usePermissionOptions } from "../../hooks/usePermissionOptions";
import { createRole, updateRole } from "../../services/rolesService";
import { ROUTES, roleDetailPath } from "../../constants/routes";

const FIELD_SETTERS_KEY = {
  name: "name",
  description: "description",
  permissions: "permissions",
};

export default function RoleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { role, loading: loadingDetail, notFound } = useRoleDetail(isEdit ? id : null);
  const { options, loading: loadingOptions, error: optionsError } = usePermissionOptions();

  if ((isEdit && loadingDetail) || loadingOptions) {
    return (
      <Layout title={isEdit ? "Edit Role" : "Create Role"}>
        <p className="text-on-surface-variant">Loading…</p>
      </Layout>
    );
  }

  if (isEdit && notFound) {
    return (
      <Layout title="Edit Role">
        <p className="text-error">Role not found.</p>
      </Layout>
    );
  }

  if (optionsError) {
    return (
      <Layout title={isEdit ? "Edit Role" : "Create Role"}>
        <p className="text-error">{optionsError}</p>
      </Layout>
    );
  }

  return <RoleForm key={id ?? "new"} isEdit={isEdit} id={id} role={role} options={options} />;
}

function RoleForm({ isEdit, id, role, options }) {
  const navigate = useNavigate();

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [blocks, setBlocks] = useState(() => {
    const entries = Object.entries(role?.permissions ?? {});
    if (entries.length > 0) return entries.map(([module, actions]) => ({ module, actions }));
    const firstModule = Object.keys(options)[0] ?? "";
    return firstModule ? [{ module: firstModule, actions: [] }] : [];
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const applyServerErrors = (response) => {
    const data = response.data;
    if (response.status === 400) {
      setErrors({ name: data?.detail || "A role with this name already exists." });
      return;
    }
    if (response.status === 403) {
      setErrors({ general: data?.detail || "This role cannot be modified." });
      return;
    }
    if (response.status === 422 && Array.isArray(data?.detail)) {
      const next = {};
      data.detail.forEach((err) => {
        const rawField = err.loc?.[err.loc.length - 1];
        const key = FIELD_SETTERS_KEY[rawField];
        if (key) next[key] = err.msg;
        else next.general = err.msg;
      });
      setErrors(next);
      return;
    }
    setErrors({ general: data?.detail || "Unable to save role." });
  };

  const validateClientSide = () => {
    const next = {};
    if (!name.trim()) next.name = "Name is required.";

    if (blocks.length === 0) {
      next.permissions = "Add at least one module with permissions.";
    } else if (blocks.some((block) => block.actions.length === 0)) {
      next.permissions = "Every module needs at least one action selected.";
    } else {
      const moduleNamesUsed = blocks.map((block) => block.module);
      if (new Set(moduleNamesUsed).size !== moduleNamesUsed.length) {
        next.permissions = "Each module can only be added once.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateClientSide()) return;

    setSubmitting(true);
    setErrors({});

    const permissions = Object.fromEntries(blocks.map((block) => [block.module, block.actions]));
    const payload = { name: name.trim(), description: description.trim() || null, permissions };

    const response = isEdit ? await updateRole(id, payload) : await createRole(payload);
    setSubmitting(false);

    if (response.ok) {
      navigate(roleDetailPath(response.data.id));
      return;
    }
    applyServerErrors(response);
  };

  return (
    <Layout title={isEdit ? "Edit Role" : "Create Role"}>
      <div className="max-w-[720px] mx-auto flex flex-col gap-lg">
        <div>
          <h1 className="font-h1 text-h1 text-on-surface">{isEdit ? "Edit Role" : "Create Role"}</h1>
          <p className="text-on-surface-variant font-body-md">
            {isEdit ? "Update this role's details and permissions." : "Define a custom role and what it can do."}
          </p>
        </div>

        <form className="flex flex-col gap-lg" onSubmit={handleSubmit}>
          <Input
            id="role-name"
            label="Name"
            placeholder="e.g. Payroll Auditor"
            value={name}
            error={errors.name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            id="role-description"
            label="Description"
            as="textarea"
            rows={3}
            placeholder="What is this role for?"
            value={description}
            error={errors.description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <PermissionsBuilder blocks={blocks} onChange={setBlocks} error={errors.permissions} options={options} />

          {errors.general && <p className="font-body-sm text-body-sm text-error">{errors.general}</p>}

          <div className="flex justify-end gap-sm">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEdit ? roleDetailPath(id) : ROUTES.ROLES_LIST)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting} loadingText="Saving…">
              {isEdit ? "Save Changes" : "Create Role"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
