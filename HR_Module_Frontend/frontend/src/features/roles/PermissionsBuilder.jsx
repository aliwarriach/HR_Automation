import Button from "../../components/Button";
import Input from "../../components/Input";

export default function PermissionsBuilder({ blocks, onChange, error, options }) {
  const moduleNames = Object.keys(options);

  const updateBlock = (index, patch) => {
    onChange(blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  };

  const addBlock = () => {
    const nextModule = moduleNames.find((name) => !blocks.some((block) => block.module === name)) ?? "";
    onChange([...blocks, { module: nextModule, actions: [] }]);
  };

  const removeBlock = (index) => onChange(blocks.filter((_, i) => i !== index));

  const toggleAction = (index, action) => {
    const block = blocks[index];
    const nextActions = block.actions.includes(action)
      ? block.actions.filter((a) => a !== action)
      : [...block.actions, action];
    updateBlock(index, { actions: nextActions });
  };

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">Permissions</span>
        <Button
          type="button"
          variant="secondary"
          icon="add"
          disabled={moduleNames.length === 0 || blocks.length >= moduleNames.length}
          onClick={addBlock}
        >
          Add Module
        </Button>
      </div>

      {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}

      {blocks.length === 0 && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">No modules added yet.</p>
      )}

      <div className="flex flex-col gap-md">
        {blocks.map((block, index) => {
          // Falls back to the block's own (stale) actions if the live taxonomy no longer
          // lists this module, so an existing role's data is never silently discarded.
          const availableActions = options[block.module] ?? block.actions;
          const dropdownModules = moduleNames.includes(block.module)
            ? moduleNames
            : [block.module, ...moduleNames].filter(Boolean);

          return (
            <div
              key={index}
              className="border border-outline-variant rounded-lg bg-surface-container-low p-lg flex flex-col gap-md"
            >
              <div className="flex items-start gap-md">
                <div className="flex-1">
                  <Input
                    id={`role-module-name-${index}`}
                    label="Module"
                    as="select"
                    value={block.module}
                    onChange={(e) => updateBlock(index, { module: e.target.value, actions: [] })}
                  >
                    {dropdownModules.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Input>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  icon="delete"
                  aria-label="Remove module"
                  className="mt-6"
                  onClick={() => removeBlock(index)}
                />
              </div>

              <div>
                <span className="font-body-sm text-body-sm text-on-surface-variant font-medium block mb-sm">
                  Actions
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                  {availableActions.map((action) => (
                    <label
                      key={action}
                      className="flex items-center gap-sm font-body-sm text-body-sm text-on-surface"
                    >
                      <input
                        type="checkbox"
                        checked={block.actions.includes(action)}
                        onChange={() => toggleAction(index, action)}
                      />
                      {action}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
