import { CircleQuestionMark } from "lucide-react";
import React from "react";

export default function Label({
    htmlFor,
    uppercase = false,
    children,
    required = false,
    info,
    leftIcon: Icon,
    className = "",
}) {
    const requiredClass = required && children ? "after:content-['*'] after:ml-0.5 after:text-red-500" : "";
    return (
        <label
            htmlFor={htmlFor}
            className={`font-medium text-base-content/60 flex items-center gap-1 ${className}`}
            style={{ textTransform: uppercase ? "uppercase" : "capitalize" }}
        >
            {Icon && <Icon size={14} />}
            <span className={requiredClass}>{children}</span>
            {info && (
                <span className="tooltip tooltip-right cursor-pointer before:normal-case" data-tip={info}>
                    <CircleQuestionMark size={14} className="text-info" />
                </span>
            )}
        </label>
    );
}
