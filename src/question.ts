import { Answer } from "./shared.ts";

// Export constants
export const letters = ["A", "B", "C", "D"];
const explanationsKey = "explanationsKey";

let debounceTimer: number | undefined;

// Export interfaces so they can be used in other files for type checking
export interface Question {
  id: number;
  question: string;
  options: string[];
  correct_answer: number; // Assumes this is the correct index now
  user_answer?: number; // Optional: Used when displaying results
  category?: string; // Optional: Added after loading/finding
  attempts?: number; // Optional: Added after finding question attempts
  mistakes?: number; //Optional: Added after finding question attempts
}

export async function loadQuestions() {
  const data = await fetchQuestions();
  let loadedQuestions: Question[] = [];

  for (const category in data) {
    const shuffled = data[category]
      .sort(() => 0.5 - Math.random()) // shuffle
      // .slice(0, 1)
      .slice(0, category == "physics" ? 4 : 3) // number of questions per category
      .map((q) => ({ ...q, category: category })); // add category to data
    loadedQuestions = [...loadedQuestions, ...shuffled];
  }

  return loadedQuestions.sort(() => 0.5 - Math.random());
}

export function generateQuestionElement(
  question: Question,
  index: number,
  onSelect?: any
) {
  const div = document.createElement("div");
  div.className = "question border p-3 mb-3 rounded";
  div.innerHTML = `<p><strong>${index + 1}) ${question.question}</strong></p>`;

  const unanswered = question.user_answer === undefined;
  for (let i = 0; i < question.options.length; i++) {
    const optionWrapper = document.createElement("div");
    optionWrapper.className = "form-check";

    const input = document.createElement("input");
    input.className = "form-check-input d-none"; // Keep hidden if using label styling
    input.type = "radio";
    input.id = `option-${question.id}-${i}`;
    input.name = `question-${question.id}`; // Group radios by question
    input.value = i.toString(); // Set value to the option index

    const label = document.createElement("label");
    label.className =
      "form-check-label btn btn-outline-primary w-100 text-start py-2";
    label.htmlFor = input.id; // Associate label with input
    // Use innerHTML for the strong tag, ensure q.options[i] is safe or sanitize if needed
    label.innerHTML = `<strong>${letters[i]}</strong>: ${question.options[i]}`;

    if (unanswered && onSelect) {
      input.addEventListener("change", () => {
        onSelect(i);
      });
    } else {
      // already answered
      input.checked = i == question.user_answer;
      label.classList.remove("btn-outline-primary", "btn-primary", "active"); // Clear existing styles
      label.classList.add("btn-secondary", "disabled"); // Vi
      if (input.checked && i != question.correct_answer) {
        label.classList.add("btn-danger");
      }
      if (i == question.correct_answer) {
        label.classList.add("btn-success");
      }
    }
    // Append input and label to the wrapper div
    optionWrapper.appendChild(input);
    optionWrapper.appendChild(label);

    // Append the option wrapper to the main question div
    div.appendChild(optionWrapper);
  }
  if (!unanswered) {
    const prompt = document.createElement("input") as HTMLInputElement;
    prompt.placeholder = "Rationale";
    prompt.classList.add("m-4", "mb-2", "col-11");
    prompt.value = getExplanation(question.id);
    prompt.addEventListener("input", (_) =>
      saveExplanation(question.id, prompt.value)
    );

    div.appendChild(prompt);
  }

  return div;
}

// Interface representing the structure directly fetched from questions.json
// It might differ slightly from the processed 'Question' (e.g., correct_answer format)
// Renaming from the generic 'Category' used elsewhere to avoid confusion
export interface QuestionCategoriesJson {
  [category: string]: Question[]; // Assuming questions in JSON match the Question interface structure now
}

/**
 * Finds a question by its ID within the categorized questions object fetched from JSON.
 * Returns a *new* question object with the category name added.
 * @param all_questions - The object containing categorized questions (like the result of fetchQuestions).
 * @param question_id - The numeric ID of the question to find.
 * @returns A Question object with the category property added, or null if not found.
 */
export function findQuestion(
  all_questions: QuestionCategoriesJson,
  question_id: number
): Question | null {
  for (const category in all_questions) {
    // Ensure we are iterating over the object's own properties
    if (Object.prototype.hasOwnProperty.call(all_questions, category)) {
      const questionsInCategory = all_questions[category];
      // Use strict equality check (===)
      const found = questionsInCategory.find((q) => q.id === question_id);
      if (found) {
        // Return a *new* object, merging the found question with its category.
        // This avoids modifying the original fetched data.
        return { ...found, category: category };
      }
    }
  }
  return null; // Return null if not found in any category
}

/**
 * Fetches the categorized questions from the questions.json file.
 * @returns A Promise resolving to the QuestionCategoriesJson object.
 */
export async function fetchQuestions(): Promise<QuestionCategoriesJson> {
  const response = await fetch("./assets/questions.json");
  if (!response.ok) {
    // Basic error handling for the fetch request
    throw new Error(
      `Failed to fetch questions.json: ${response.status} ${response.statusText}`
    );
  }
  // Assume the JSON structure matches QuestionCategoriesJson
  return response.json() as Promise<QuestionCategoriesJson>;
}

export function findQuestions(all_questions: Question[], answers: Answer[]) {
  const questions: Question[] = [];

  for (const answer of answers) {
    const question = findQuestion(all_questions, answer.question_id);
    if (!question) {
      console.error(`question ${answer.question_id} could not be found`);
      continue;
    }
    question.user_answer = answer.user_answer;
    questions.push(question);
  }
  return questions;
}

function getExplanation(question_id: number): string {
  const data = localStorage.getItem(explanationsKey);
  const explanations = data ? JSON.parse(data) : [];
  for (let i = 0; i < explanations.length; i++) {
    const existing = explanations[i];
    if (existing.question_id == question_id) {
      return existing.explanation;
    }
  }
  return "";
}

function saveExplanation(question_id: number, explanation: string) {
  // TODO: if question_id is different, trigger the previous debouncetimer
  clearTimeout(debounceTimer);
  debounceTimer = globalThis.setTimeout(() => {
    const data = localStorage.getItem(explanationsKey);
    const explanations = data ? JSON.parse(data) : [];
    const existing = explanations.findIndex(
      (explanation) => explanation.question_id == question_id
    );
    if (existing > -1) {
      explanations[existing].explanation = explanation;
    } else {
      explanations.push({
        question_id: question_id,
        explanation: explanation,
      });
    }
    localStorage.setItem(explanationsKey, JSON.stringify(explanations));
  }, 1000);
}
