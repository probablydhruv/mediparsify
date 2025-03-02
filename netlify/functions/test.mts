import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
    console.log("Done");
  return new Response("Hello, world, test new!")
}