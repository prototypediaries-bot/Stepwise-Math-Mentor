---
name: Math assistant purpose
description: User's core product intent for contextual step explanations
---
Students ask textbook-type math questions and highlight a confusing portion to reveal an explanation action. The explanation belongs in a closable side panel, leaving the original answer intact.

**Why:** The user wants to eliminate multiple replies in a row that make the solution feel more confusing.

**How to apply:** Keep clarification interactions out of the main solution flow. Closing an explanation must let students continue reading the original answer.

The user also wants picture questions and complicated engineering/science problems, including theory-heavy material. Explanations must distinguish an actual procedural step from an underlying concept.

**Why:** The user explicitly called out that theory-heavy questions need concept explanations, not forced step-by-step calculations.

**How to apply:** Classify the highlighted material in context, not just the surrounding problem. A concept named inside a calculation still needs a conceptual explanation. Preserve the original answer and make a mistaken automatic classification correctable.

The user wants short, clearly separated math steps without small equation boxes. Keep one meaningful calculation per step.

**Why:** The user found detailed answers too dense and calculations bunched together.

**How to apply:** Keep essential reasoning, intermediate results, units, assumptions and caveats. Omit routine prerequisite teaching from the main answer; students should use highlighting for that background in the side panel. Preserve concepts that are the actual subject of a theory question. This supersedes the earlier request to keep every explanatory detail in the main answer.
