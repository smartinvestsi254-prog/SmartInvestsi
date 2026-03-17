import { HandlerContext, PageContextBuiltIn } from "netlify/functions/types";

export const handler = async (event: any, context: HandlerContext & PageContextBuiltIn) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode
