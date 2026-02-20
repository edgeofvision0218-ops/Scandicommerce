"use client";

import React, { useState } from "react";
import { Box, Button, Card, Flex, Spinner, Stack, Text, TextInput } from "@sanity/ui";

type Props = {
  id: string;
  itemId: string;
  paneKey: string;
  options?: Record<string, unknown>;
};

function getApiBase(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function CalendlySetup(props: Props) {
  const [registerLoading, setRegisterLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [secret, setSecret] = useState("");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret.trim()) headers["x-setup-secret"] = secret.trim();

  const handleRegister = async () => {
    setMessage(null);
    setRegisterLoading(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/calendly/register-webhook`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "ok", text: data.message || "Webhook registered. New bookings will sync to Sanity." });
      } else {
        setMessage({ type: "err", text: data.error || data.detail || `Request failed: ${res.status}` });
      }
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleSync = async () => {
    setMessage(null);
    setSyncLoading(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/calendly/sync`, {
        method: "POST",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const created = data.created ?? 0;
        const skipped = data.skipped ?? 0;
        setMessage({
          type: "ok",
          text: data.message || `Sync done. Created: ${created}, Skipped: ${skipped}. Refresh the list to see bookings.`,
        });
      } else {
        setMessage({ type: "err", text: data.error || data.detail || `Request failed: ${res.status}` });
      }
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <Card padding={4} tone="transparent">
      <Stack space={4}>
        <Text size={1} weight="semibold">
          Calendly → Sanity setup
        </Text>
        <Text size={1} muted>
          The API is not called when you open this page. Use the buttons below to register the webhook or import
          existing meetings. You’ll see requests in the terminal where the app is running.
        </Text>
        <Text size={1} muted>
          If you set <code>CALENDLY_SETUP_SECRET</code> in .env, enter it here so the requests are allowed.
        </Text>
        <TextInput
          placeholder="Setup secret (optional)"
          value={secret}
          onChange={(e) => setSecret(e.currentTarget.value)}
        />
        <Flex gap={2} wrap="wrap">
          <Button
            text="Register webhook with Calendly"
            tone="primary"
            disabled={registerLoading || syncLoading}
            onClick={handleRegister}
            icon={registerLoading ? () => <Spinner /> : undefined}
          />
          <Button
            text="Sync existing meetings"
            mode="ghost"
            disabled={registerLoading || syncLoading}
            onClick={handleSync}
            icon={syncLoading ? () => <Spinner /> : undefined}
          />
        </Flex>
        {message && (
          <Card padding={3} tone={message.type === "err" ? "critical" : "positive"} radius={2}>
            <Text size={1}>{message.text}</Text>
          </Card>
        )}
      </Stack>
    </Card>
  );
}
