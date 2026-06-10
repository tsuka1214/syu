import { Router, type IRouter } from "express";
import { ListChannelsResponse } from "@workspace/api-zod";
import { getChannels } from "../lib/lineworks";

const router: IRouter = Router();

router.get("/lineworks/channels", async (req, res): Promise<void> => {
  try {
    const channels = await getChannels();
    res.json(ListChannelsResponse.parse(channels));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch LINE WORKS channels");
    res.status(502).json({ error: "LINE WORKSチャンネルの取得に失敗しました" });
  }
});

export default router;
