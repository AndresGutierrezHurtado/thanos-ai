import React, { useCallback, useMemo } from "react";

export default function TextInput({
    id,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    maxLength,
    minLength,
    type = "text",
    className,
    ...props
}) {
    const isNumber = type === "number";

    const displayValue = useMemo(() => {
        if (!isNumber || value === "" || value === undefined || value === null) {
            return value;
        }

        // Split to handle decimal points correctly while typing
        const parts = String(value).split(".");
        // Add commas as thousands separators
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        return parts.join(".");
    }, [value, isNumber]);

    const handleChange = useCallback(
        (e) => {
            const val = e.target?.value ?? e;
            if (isNumber) {
                // Remove commas before saving
                const cleanValue = val.replace(/,/g, "");
                // Only allow digits and one decimal dot
                if (cleanValue === "" || /^\d+\.?\d*$/.test(cleanValue) || cleanValue === ".") {
                    onChange(cleanValue);
                }
            } else {
                onChange(val);
            }
        },
        [onChange, isNumber]
    );

    return (
        <label className={`input input-bordered w-full rounded-lg ${className ?? ""}`.trim()} htmlFor={id}>
            <input
                id={id}
                type={isNumber ? "text" : type}
                value={displayValue}
                name={id}
                onChange={handleChange}
                placeholder={placeholder}
                autoComplete="off"
                disabled={disabled}
                required={required}
                maxLength={maxLength}
                minLength={minLength}
                inputMode={isNumber ? "numeric" : undefined}
                {...props}
            />
        </label>
    );
}
