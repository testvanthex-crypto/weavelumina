import serverless from "serverless-http";
import { createApp } from "../../server/_core/app";

export const handler = serverless(createApp());
