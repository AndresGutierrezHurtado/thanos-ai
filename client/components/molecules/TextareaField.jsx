import React from "react";

import Textarea from "../atoms/Textarea.jsx";
import Label from "../atoms/Label.jsx";

export default function TextareaField({
    id,
    name,
    value,
    defaultValue,
    onChange,
    onKeyDown,
    placeholder,
    label,
    required = false,
    disabled = false,
    rows,
    minLength,
    maxLength,
    className = "",
    textareaClassName = "",
    error,
    labelIcon,
    labelInfo,
    ...props
}) {
    return (
        <fieldset className={`fieldset space-y-2 ${className}`.trim()}>
            {label && (
                <Label htmlFor={id} leftIcon={labelIcon} info={labelInfo}>
                    {label}
                </Label>
            )}
            <Textarea
                id={id}
                name={name}
                value={value}
                defaultValue={defaultValue}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                rows={rows}
                minLength={minLength}
                maxLength={maxLength}
                className={textareaClassName}
                {...props}
            />
            {error ? <p className="label text-error">{error}</p> : null}
        </fieldset>
    );
}
