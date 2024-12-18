import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2';

let loadingStatus=document.getElementById("loading-status");
loadingStatus.textContent="Loading model...";
console.log("Loading model...");
const generator = await pipeline('text-generation', 'onnx-community/Llama-3.2-1B-Instruct-q4f16', {
    device: 'webgpu',
});
console.log("Model loaded");
loadingStatus.textContent="Model loaded";

let history = []; // Historique condensé (résumés et choix)
let gameOver = false; // Vérifie si le jeu est terminé

// Fonction pour résumer un texte
async function summarizeText(text) {
    const summaryMessage = [
        { role: "system", content: "Summarize the following text into a single concise sentence. Every main caracter action is important and must be kept. You have max 40 words" },
        { role: "user", content: text }
    ];
    const summaryOutput = await generator(summaryMessage, { max_new_tokens: 50 });
    console.log(summaryOutput[0].generated_text[2].content);
    return summaryOutput[0].generated_text[2].content;
}

function formatHistory(history) {
    return history.map(entry => {
        if (entry.summary) {
            return entry.summary; // Ajouter le résumé tel quel
        } else if (entry.choice) {
            return `Choice taken : ${entry.choice}`; // Ajouter le choix avec un préfixe
        } else if (entry.pitch) {
            return `Pitch : ${entry.pitch}`; // Ajouter le pitch avec un pré
        }
        return '';
    }).join("\n"); // Chaque élément est séparé par un saut de ligne
}

// Fonction pour générer l'histoire
async function generateStory() {
    if (gameOver) return;
    const statusText = document.getElementById("status-text");
    statusText.style.display = "block";
    const formattedHistory = formatHistory(history);
    console.log("formatted History:", formattedHistory);
    const messages = [
        { role: "system", content: "You're the narrator of a text-based adventure game, responsible for creating an immersive narrative that evolves according to the current adventure and the current choices from the player. Create a convincing character for the player by being on a first-name basis. Your story should draw the user in, offering rich descriptions and captivating plot developments. Conclude with an exciting or suspenseful event that leaves the user eager to know what happens next.Your answer must not exceed 130 words and end with a complete sentence, ensuring that no sentence is truncated. Max 130 words. Don't offer the player any choice, they will be created after.Try to end the story if it's too long or too dangerous for the player and state clearly 'GAME OVER: VICTORY' or 'GAME OVER: DEFEAT'. " },
        { role: "user", content: formattedHistory }
    ];
    console.log("Generating story...");
    const output = await generator(messages, { max_new_tokens: 240 });
    const generatedText = output[0].generated_text[2].content;
    console.log(generatedText);

    // Vérifier les conditions de fin
    if (generatedText.includes("VICTORY") || generatedText.includes("DEFEAT")) {
        gameOver = true;
        document.getElementById("choices-container").innerHTML = "<p>Fin du jeu.</p>";
        return;
    }

    statusText.style.display = "none";
    // Mettre à jour l'affichage principal
    document.getElementById("story").textContent = generatedText;
    // Résumer l'histoire
    console.log("Summarizing story...");
    const summary = await summarizeText(generatedText);
    history.push({"summary":summary});
    console.log("history : ",history);
    updateHistoryDisplay();
    // Générer les choix
    generateChoices(generatedText);
}

// Met à jour l'affichage de l'historique
function updateHistoryDisplay() {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = '';
    history.forEach(entry => {
        const li = document.createElement("li");
        if (entry.summary) {
            li.textContent = entry.summary;
            li.classList.add("summary-entry");
        } else if (entry.choice) {
            li.textContent = "Player chose: " + entry.choice;
            li.classList.add("choice-entry");
        }else if (entry.pitch) {
            li.textContent = "Pitch: " + entry.pitch;
            li.classList.add("pitch-entry");
        }
        historyList.appendChild(li);
    });
}

// Génération des choix
async function generateChoices(story) {
    const choicesMessage = [
        { role: "system", content: "Generate exactly three distinct actions/choices that the player can take in a text-based adventure RPG based on the current adventure. Each action should be clear and concise, presented on a separate line without any additional comments, formatting, or symbols. You have max 120 words. After listing the three actions, leave a blank line using this template: Action 1:... Action 2:... Action 3:..." },
        { role: "user", content: story }
    ];
    document.getElementById("choices-container").textContent= "Generating Choices...";
    console.log("Generating choices...");
    const choicesOutput = await generator(choicesMessage, { max_new_tokens: 150 });
    const choicesText = choicesOutput[0].generated_text[2].content;
    console.log(choicesText);

    const choiceRegex = /Action \d+:\s*(.*?)(?=(Action \d+:|$))/gs;
    const choices = [];
    let match;
    while ((match = choiceRegex.exec(choicesText)) !== null) {
        choices.push(match[1].trim());
    }
    
    const choicesContainer = document.getElementById("choices-container");
    choicesContainer.innerHTML = '';
    choices.forEach(choice => {
        const button = document.createElement("button");
        button.textContent = choice;
        button.onclick = () => handleChoice(choice);
        choicesContainer.appendChild(button);
    });
}

// Gestion du choix
function handleChoice(choice) {
    console.log("User chose:", choice);
    document.getElementById("choices-container").innerHTML = '';
    history.push({"choice":choice});
    console.log("history : ",history);
    updateHistoryDisplay();
    generateStory();
}

// Écouteurs pour démarrer l'histoire
document.getElementById("generate-story").onclick = () => {
    const userInput = document.getElementById("user-scenario").value.trim();
    if (userInput) {
        document.getElementById("setup-container").style.display = "none";
        document.getElementById("game-container").style.display = "flex";
        history.push({"pitch":userInput});
        generateStory();
    } else {
        alert("Please write a scenario or choose the 'Generate random story' button.");
    }
};

document.getElementById("random-story").onclick = () => {
    document.getElementById("setup-container").style.display = "none";
    document.getElementById("game-container").style.display = "flex";
    const randomScenario = "A fantasy adventure in which the player must save the kingdom from an evil dragon.";
    history.push({"pitch":randomScenario});
    generateStory();
};
