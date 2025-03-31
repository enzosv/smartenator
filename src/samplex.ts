const letters = ["A", "B", "C", "D"];
const answers: Record<number, string> = {};
const storageKey = "quizHistory";

async function fetchConfig() {
  const response = await fetch("./config.json");
  return response.json();
}

async function fetchQuestions(): Promise<Category> {
  const response = await fetch("./questions.json");
  return response.json();
}

interface Category {
  [category: string]: Question[];
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correct_answer: number;
}

async function loadQuestions() {
  const [data, config] = await Promise.all([fetchQuestions(), fetchConfig()]);
  let loadedQuestions: Question[] = [];

  for (const category in data) {
    const shuffled = data[category]
      .sort(() => 0.5 - Math.random()) // shuffle
      .slice(0, category == "physics" ? 4 : 3) // number of questions per category
      .map((q) => ({ ...q, category: category })); // add category to data
    loadedQuestions = [...loadedQuestions, ...shuffled];
  }

  return loadedQuestions.sort(() => 0.5 - Math.random());
}

function renderQuestions(questions: Question[]) {
  const container = document.getElementById("quiz-container");
  if (!container) {
    console.error("container could not be found");
    return;
  }
  container.innerHTML = "";

  questions.forEach((q, index) => {
    const div = document.createElement("div");
    div.className = "question border p-3 mb-3 rounded";
    div.innerHTML = `<p><strong>${index + 1}) ${q.question}</strong></p>`;

    for (let i = 0; i < q.options.length; i++) {
      div.innerHTML += `
                  <div class="form-check">
          <input class="form-check-input d-none" type="radio" id="option-${q.id}-${i}" name="question-${q.id}" value="${i}" onchange="saveAnswer(${q.id}, '${i}');">
          <label class="form-check-label btn btn-outline-primary w-100 text-start py-2" for="option-${q.id}-${i}">
              <strong>${letters[i]}</strong>: ${q.options[i]}
          </label>
      </div>`;
    }
    // for (const [key, value] of Object.entries(q.options)) {
    //   div.innerHTML += `
    //               <div class="form-check">
    //       <input class="form-check-input d-none" type="radio" id="option-${q.id}-${key}" name="question-${q.id}" value="${key}" onchange="saveAnswer(${q.id}, '${key}');">
    //       <label class="form-check-label btn btn-outline-primary w-100 text-start py-2" for="option-${q.id}-${key}">
    //           <strong>${letters[key]}</strong>: ${value}
    //       </label>
    //   </div>`;
    // }

    container.appendChild(div);
  });
}

function saveAnswer(questionId: number, choice: string) {
  answers[questionId] = choice;

  // Get all labels for the current question using a query that selects labels whose 'for' attribute starts with 'option-{questionId}-'
  const labels = document.querySelectorAll(`label[for^="option-${questionId}-"]`);

  labels.forEach((label) => {
    const l = label as HTMLLabelElement;
    // Get the corresponding input element using the label's 'for' attribute
    const input = document.getElementById(l.htmlFor) as HTMLInputElement;

    // If this label corresponds to the selected radio button's value, activate it
    if (input.value === choice) {
      l.classList.remove("btn-outline-primary");
      l.classList.add("btn-primary", "active");
      return;
    }
    // Reset all labels for this question: remove active/primary styles, ensure outline style is present

    l.classList.remove("btn-primary", "active");
    l.classList.add("btn-outline-primary");
  });
}

function submitAnswers() {
  const data = localStorage.getItem(storageKey);
  const history = data ? JSON.parse(data) : [];

  const attempt = {
    timestamp: new Date().toISOString(),
    answers: answers,
  };

  history.push(attempt);
  localStorage.setItem(storageKey, JSON.stringify(history));
  globalThis.location.href = `attempt.html?index=${history.length - 1}`;
}

document.addEventListener("DOMContentLoaded", async function () {
  const questions = await loadQuestions();
  renderQuestions(questions);

  document.getElementById("submit-button")?.addEventListener("click", submitAnswers);
});
