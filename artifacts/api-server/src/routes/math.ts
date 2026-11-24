import { Router, type IRouter } from "express";
import { SolveMathBody, SolveMathResponse, ExplainMathBody, ExplainMathResponse } from "@workspace/api-zod";
import { explainSelection, solveQuestion } from "../lib/math-tutor";

const router: IRouter = Router();
let activeRequests = 0;
const usage = new Map<string, { count: number; reset: number }>();

router.use("/math", (req, res, next) => {
  const now = Date.now();
  for (const [key, value] of usage) if (value.reset <= now) usage.delete(key);
  const key = req.ip ?? "anonymous";
  const current = usage.get(key) ?? { count: 0, reset: now + 60000 };
  if (current.count >= 20 || activeRequests >= 6 || usage.size > 10000) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "The tutor is busy. Please wait a moment and try again." });
    return;
  }
  current.count++;
  usage.set(key, current);
  next();
});

router.post("/math/solve", async (req, res): Promise<void> => {
  const input = SolveMathBody.safeParse(req.body);
  if (!input.success || !input.data.question.trim()) {
    res.status(400).json({ error: "Please enter a math question of up to 4,000 characters." });
    return;
  }
  activeRequests++;
  try {
    const solution = SolveMathResponse.parse(await solveQuestion(input.data.question.trim()));
    res.json(solution);
  } catch {
    req.log.warn("Math solution generation failed");
    res.status(502).json({ error: "We couldn't finish this solution. Please try again." });
  } finally {
    activeRequests--;
  }
});

router.post("/math/explain", async (req, res): Promise<void> => {
  const input = ExplainMathBody.safeParse(req.body);
  if (!input.success || !input.data.selectedText.trim()) {
    res.status(400).json({ error: "Highlight a part of the solution to explain." });
    return;
  }
  activeRequests++;
  try {
    res.json(ExplainMathResponse.parse(await explainSelection(input.data)));
  } catch {
    req.log.warn("Math explanation generation failed");
    res.status(502).json({ error: "We couldn't explain this step. Please try again." });
  } finally {
    activeRequests--;
  }
});

export default router;
