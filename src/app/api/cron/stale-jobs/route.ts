import { raiseNoUpdateAlerts } from "@/lib/notifications/service";

// Daily (vercel.json). Vercel sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const raised = await raiseNoUpdateAlerts();
  return Response.json({ raised });
}
