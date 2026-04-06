import React from "react";

export default function Button({
    type,
    className = "",
    children,
    leftIcon,
    rightIcon,
    onClick = () => {},
    onFocus = () => {},
    disabled = false,
    loading = false,
    tooltip = "",
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            onFocus={onFocus}
            disabled={disabled}
            data-tip={tooltip}
            className={`btn flex items-center gap-1 rounded-lg ${className} ${tooltip ? "tooltip" : ""}`}
        >
            {loading && <span className="loading loading-spinner loading-sm"></span>}
            {leftIcon && !loading && leftIcon}
            {children}
            {rightIcon && !loading && rightIcon}
        </button>
    );
}
