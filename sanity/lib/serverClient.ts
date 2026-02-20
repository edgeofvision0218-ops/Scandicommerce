import { createClient } from "next-sanity";

/**
 * Server-only Sanity client with write access.
 * Use ONLY in API routes / server code (e.g. Calendly webhook).
 * Never expose SANITY_API_WRITE_TOKEN to the frontend.
 */
export function getServerClient() {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "SANITY_API_WRITE_TOKEN is required for server-side writes (e.g. Calendly webhook). Create a token in Sanity Manage with Editor permissions."
    );
  }
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: "2024-01-01",
    token,
    useCdn: false,
  });
}
