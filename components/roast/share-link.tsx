"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareLinkProps {
  /** The id returned by /api/roast — used to build the /roast/[id] URL. */
  id: string;
}

// Builds the shareable URL client-side (from window.location) rather than an
// env var, so it's correct on localhost, previews, and production alike.
export function ShareLink({ id }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/roast/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (permissions, insecure context); fail
      // quietly rather than throw over what's a nice-to-have.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="mx-auto"
    >
      {copied ? (
        <>
          <Check data-icon="inline-start" />
          Copied!
        </>
      ) : (
        <>
          <Copy data-icon="inline-start" />
          Copy share link
        </>
      )}
    </Button>
  );
}
