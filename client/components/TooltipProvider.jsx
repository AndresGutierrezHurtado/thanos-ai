"use client";

import { useEffect } from "react";
import { delegate } from "tippy.js";
import "tippy.js/dist/tippy.css";
import "tippy.js/animations/shift-away-subtle.css";

/**
 * One tippy.js listener for the whole app: any element with `data-tip="text"` gets a tooltip,
 * placed with `data-tip-placement` (top by default). Styled by the "thanos" theme in globals.css.
 */
export default function TooltipProvider() {
    useEffect(() => {
        const instance = delegate(document.body, {
            target: "[data-tip]",
            theme: "thanos",
            animation: "shift-away-subtle",
            duration: [200, 200],
            delay: [75, 0],
            offset: [0, 8],
            maxWidth: 320,
            // Text and placement are read on every show: they change with state (e.g. "Grabar voz" / "Detener")
            onShow(tip) {
                const content = tip.reference.getAttribute("data-tip");
                if (!content) return false;
                tip.setContent(content);
                tip.setProps({ placement: tip.reference.getAttribute("data-tip-placement") || "top" });
            },
        });

        return () => instance.destroy();
    }, []);

    return null;
}
