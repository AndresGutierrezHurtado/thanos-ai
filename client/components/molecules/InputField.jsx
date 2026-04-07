import React from "react";

import Input from "../atoms/Input.jsx";
import Label from "../atoms/Label.jsx";

export default function InputField({
    id,
    name,
    value,
    onChange,
    placeholder,
    label,
    required = false,
    disabled = false,
    maxLength,
    minLength,
    type = "text",
    icon,
    labelLeftIcon,
    labelInfo,
    error,
    className,
}) {
    return (
        <fieldset className={`fieldset space-y-2 ${className || ""}`}>
            {label && (
                <Label htmlFor={id} required={required} leftIcon={labelLeftIcon} info={labelInfo}>
                    {label}
                </Label>
            )}
            <Input
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                maxLength={maxLength}
                minLength={minLength}
                type={type}
                icon={icon}
            />
            {error ? <p className="label text-error">{error}</p> : null}
        </fieldset>
    );
}
