import { loadProperties } from "@/lib/config";

export async function GET() {
  const result = await loadProperties();
  return Response.json(result);
}
