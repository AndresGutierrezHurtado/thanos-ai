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
    tooltipPlacement = "top",
    ...props
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            onFocus={onFocus}
            disabled={disabled}
            data-tip={tooltip || undefined}
            data-tip-placement={tooltip ? tooltipPlacement : undefined}
            className={`btn flex items-center gap-1 rounded-lg ${className}`}
            {...props}
        >
            {loading && <span className="loading loading-spinner loading-sm"></span>}
            {leftIcon && !loading && leftIcon}
            {children}
            {rightIcon && !loading && rightIcon}
        </button>
    );
}
