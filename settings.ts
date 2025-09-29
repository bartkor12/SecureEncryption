/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable/Disable Encryption",
        default: true
    },
    key: {
        type: OptionType.STRING,
        description: "Key used for encryption (DO NOT LET ANYONE SEE THIS)",
        default: ""
    }
});
