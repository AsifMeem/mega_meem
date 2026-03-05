import type { DemoMessage, DoseLevels, TodoItem } from "./types";

// Pre-action DOSE levels
const PRE_DOSE: DoseLevels = {
  dopamine: 20,
  oxytocin: 50,
  serotonin: 35,
  endorphin: 40,
};

// Post coffee-machine-clean DOSE levels
const POST_DOSE: DoseLevels = {
  dopamine: 45,
  oxytocin: 50,
  serotonin: 35,
  endorphin: 40,
};

const TODOS_PRE: TodoItem[] = [
  { id: "1", label: "Clean coffee machine", done: false, doseTarget: "dopamine" },
  { id: "2", label: "Organize desk", done: false, doseTarget: "dopamine" },
  { id: "3", label: "10-min walk outside", done: false, doseTarget: "serotonin" },
];

const TODOS_POST: TodoItem[] = [
  { id: "1", label: "Clean coffee machine", done: true, doseTarget: "dopamine" },
  { id: "2", label: "Organize desk", done: false, doseTarget: "dopamine" },
  { id: "3", label: "10-min walk outside", done: false, doseTarget: "serotonin" },
];

// The scripted conversation flow
// Step 0: user sends first message (handled by typing)
// Step 1: AI response with DOSE + action pills
// Step 2: user taps Done → user bubble + dashboard update
// Step 3: AI follow-up with new prompt pills

export const DEMO_STEPS: DemoMessage[] = [
  // Step 0: AI response to "no willpower" message
  {
    role: "assistant",
    content:
      "Your dopamine tank is empty. You don't need a big win — you need a tiny one.\n\nGo clean your coffee machine. 5 minutes. That's it.",
    doseLevels: PRE_DOSE,
    todos: TODOS_PRE,
    actionPills: [
      { label: "Done ✓", value: "done" },
      { label: "Won't do", value: "wont_do" },
    ],
  },
  // Step 1: After user taps "Done" — AI follow-up
  {
    role: "assistant",
    content:
      "See? That's momentum. Your brain just got a hit of dopamine from completing something tangible.\n\nWant another one?",
    doseLevels: POST_DOSE,
    todos: TODOS_POST,
    promptPills: ["Organize my desk", "Go for a walk", "What should I do next?"],
  },
];

// The "Won't do" alternative path
export const WONT_DO_RESPONSE: DemoMessage = {
  role: "assistant",
  content:
    "No problem. But your dopamine is still empty — and it's not going to fill itself.\n\nHere's something even smaller: wipe down your desk. 2 minutes. That's all.",
  doseLevels: PRE_DOSE,
  todos: [
    { id: "1", label: "Clean coffee machine", done: false, doseTarget: "dopamine" },
    { id: "4", label: "Wipe down desk", done: false, doseTarget: "dopamine" },
    { id: "3", label: "10-min walk outside", done: false, doseTarget: "serotonin" },
  ],
  actionPills: [
    { label: "Done ✓", value: "done" },
    { label: "Won't do", value: "wont_do" },
  ],
};
