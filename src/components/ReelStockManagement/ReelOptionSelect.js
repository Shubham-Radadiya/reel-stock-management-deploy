import React from 'react';

export const ADD_OPTION_VALUE = '__add_reel_option__';

const ReelOptionSelect = ({
  options,
  value,
  onChange,
  onAddClick,
  ariaLabel,
  className = 'form-control form-control-sm',
  placeholder = 'Select'
}) => {
  const handleChange = (e) => {
    const next = e.target.value;
    if (next === ADD_OPTION_VALUE) {
      onAddClick?.();
      return;
    }
    onChange(next);
  };

  return (
    <select
      className={`reel-option-select ${className}`.trim()}
      value={value ?? ''}
      onChange={handleChange}
      aria-label={ariaLabel}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
      <option value={ADD_OPTION_VALUE} className="reel-option-select-add">
        + Add…
      </option>
    </select>
  );
};

export default ReelOptionSelect;
