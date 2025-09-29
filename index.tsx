/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { addMessagePreSendListener } from "@api/MessageEvents";
import { updateMessage } from "@api/MessageUpdater";
import { Margins } from "@utils/margins";
import { closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { PluginNative } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { Button, Forms, Switch, TextInput } from "@webpack/common";
import { cl } from "plugins/memberCount";
import { CopyButton } from "plugins/shikiCodeblocks.desktop/components/CopyButton";
import { MessageStore } from "webpack/common/stores";

import { settings } from "./settings";
const Native = VencordNative.pluginHelpers.SecureEncryption as PluginNative<typeof import("./native.ts")>;

async function decryptAllMessages(channel_id) {
    const messages = await MessageStore.getMessages(channel_id)?._array ?? [];
    for (const msg of messages) {
        if (msg.content.slice(0, 8) === "«SECURE»") {
            try {
                updateMessage(msg.channel_id, msg.id, { content: await Native.decrypt(msg.content, settings.store.key) });
            }
            catch {
                updateMessage(msg.channel_id, msg.id, { content: "FAILED OR ATTEMPTING DECRYPTION" });
            }
        }
    }
}

function isKeyValid(key: string) {
    let valid = false;
    if (key.length === 64) valid = true;
    return valid;
}

const genRandomHex64 = () => {
    if (typeof crypto?.getRandomValues !== "function") {
        throw new Error("genRandomHex64 failed");
    }
    return [...crypto.getRandomValues(new Uint8Array(32))]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
};

function PickerModal({ rootProps, close }) {
    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h1" className={cl("modal-title")}>
                    Secure Encryption
                </Forms.FormTitle>

                <ModalCloseButton onClick={close} className={cl("modal-close-button")} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Forms.FormTitle tag="h2" className={Margins.bottom20}>{settings.def.key.description}</Forms.FormTitle>
                <TextInput
                    type="password"
                    placeholder={"Encryption Key Input"}
                    value={settings.use(["key"]).key}
                    onChange={v => settings.store.key = isKeyValid(v) ? v : settings.store.key}
                    spellCheck={false}
                    className={Margins.bottom20}
                />
                <CopyButton content={settings.use(["key"]).key} className={Margins.bottom20}></CopyButton>
                <Button
                    className={Margins.bottom20}
                    onClick={() => settings.store.key = genRandomHex64()}>
                    Generate Random Key (Recommended)
                </Button>
                <Switch
                    value={settings.use(["enabled"]).enabled}
                    onChange={v => settings.store.enabled = v}>
                    {settings.def.enabled.description}
                </Switch>
            </ModalContent>
        </ModalRoot >
    );
}

function EncryptionIcon() {
    const { enabled } = settings.use(["enabled"]);
    const color = enabled ? "#43a25a" : "#b6b7bb";

    return (
        <svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24">
            <path fill={color} transform="scale(1.5)" d="M12.25,7H12V4c0-1.653-1.347-3-3-3H7C5.347,1,4,2.347,4,4v3H3.75C3.338,7,3,7.338,3,7.75v6.5C3,14.663,3.338,15,3.75,15h8.5 c0.413,0,0.75-0.337,0.75-0.75v-6.5C13,7.338,12.663,7,12.25,7z M6,4c0-0.55,0.45-1,1-1h2c0.55,0,1,0.45,1,1v3H6V4z" />
        </svg>
    );
}

const ChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Insert Timestamp"
            onClick={() => {
                const key = openModal(props => (
                    <PickerModal
                        rootProps={props}
                        close={() => closeModal(key)}
                    />
                ));
            }}
            buttonProps={{ "aria-haspopup": "dialog" }}>
            <EncryptionIcon />
        </ChatBarButton >
    );
};

export default definePlugin({
    name: "SecureEncryption",
    description: "An attempt to add strong, automatic e2e encryption and decryption using xchacha20-poly1305 to Vencord to enhance user privacy.",
    authors: [{ name: "bartkor12", id: 603481124840275979n }],
    renderChatBarButton: ChatBarIcon,
    settings,
    flux: {
        async LOAD_MESSAGES_SUCCESS(event) {
            console.log(event);
            await decryptAllMessages(event.channelId);
        },
        MESSAGE_CREATE({ message, optimistic }: { message: Message; optimistic: boolean; }) {
            if (optimistic) return;
            setTimeout(async () => {
                await decryptAllMessages(message.channel_id);
            }, 50);

        }
    }
});

addMessagePreSendListener(async (channelId, message, extra) => {
    try {
        if (settings.store.enabled && settings.store.key !== "") {
            const encrypted = await Native.encrypt(message.content, settings.store.key);
            message.content = encrypted;
        }
    }
    catch (error) {
        console.error("Encryption failed:", VencordNative.pluginHelpers.SecureEncryption as PluginNative<typeof import("./native.ts")>);
    }
});
