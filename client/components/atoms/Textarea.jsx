import React from "react";

export default function Textarea({
    id,
    name,
    value,
    defaultValue,
    onChange,
    placeholder,
    disabled = false,
    required = false,
    autoComplete = false,
    className = "",
    rows = 4,
    minLength = null,
    maxLength = null,
    resize = false,
    ...props
}) {
    const isControlled = value !== undefined;
    const handleChange = (e) => onChange?.(e.target.value, e);

    return (
        <textarea
            id={id}
            name={name}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete ? "on" : "off"}
            rows={rows}
            minLength={minLength ?? undefined}
            maxLength={maxLength ?? undefined}
            className={`textarea textarea-bordered w-full rounded-lg ${className}`.trim()}
            style={{ resize: resize ? "both" : "none" }}
            {...(isControlled ? { value } : { defaultValue })}
            onChange={handleChange}
            {...props}
        />
    );
}
